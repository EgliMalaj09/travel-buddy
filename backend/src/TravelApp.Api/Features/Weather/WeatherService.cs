using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Weather;

/// <summary>
/// Weather days for the packing list, with a PostgreSQL cache.
/// Privacy (GDPR core rule): the position is rounded to 1 decimal (about 11 km) first, and only the rounded value
/// is cached and sent to the provider. Nothing about the position or dates is logged.
/// </summary>
internal sealed partial class WeatherService(
    AppDbContext db, IWeatherProvider provider, TimeProvider clock, ILogger<WeatherService> logger)
{
    public static readonly TimeSpan ForecastFresh = TimeSpan.FromHours(3);
    public static readonly TimeSpan TypicalFresh = TimeSpan.FromDays(30);

    /// <summary>Number of past years averaged for "typical" days.</summary>
    public const int TypicalYears = 3;

    /// <summary>The archive is a few days behind; never ask it for days newer than this.</summary>
    private const int ArchiveLagDays = 6;

    /// <summary>The days, or null when the provider failed and nothing is cached (503).</summary>
    public async Task<WeatherDaysResponse?> GetDaysAsync(WeatherDaysQuery query, CancellationToken ct)
    {
        var lat10 = ToTenths(query.Lat);
        var lng10 = ToTenths(query.Lng);
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var lastForecastDay = today.AddDays(WeatherValues.ForecastDays);

        var dates = Enumerable.Range(0, query.To.DayNumber - query.From.DayNumber + 1).Select(query.From.AddDays).ToList();
        var forecastDates = dates.Where(d => d <= lastForecastDay).ToList();
        var typicalDates = dates.Where(d => d > lastForecastDay).ToList();

        var cached = await db.Set<WeatherCacheEntry>().AsNoTracking()
            .Where(w => w.Lat10 == lat10 && w.Lng10 == lng10 && w.Date >= query.From && w.Date <= query.To)
            .ToListAsync(ct);
        var rows = cached.ToDictionary(w => (w.Kind, w.Date));

        var failed = false;
        failed |= !await RefreshAsync(WeatherValues.Forecast, forecastDates, ForecastFresh, lat10, lng10, today, now, rows, ct);
        failed |= !await RefreshAsync(WeatherValues.Typical, typicalDates, TypicalFresh, lat10, lng10, today, now, rows, ct);

        var days = dates
            .Select(d => rows.GetValueOrDefault((d <= lastForecastDay ? WeatherValues.Forecast : WeatherValues.Typical, d)))
            .OfType<WeatherCacheEntry>()
            .Select(w => new WeatherDayDto(w.Date, w.Kind, w.MinC, w.MaxC, w.PrecipitationMm, w.PrecipitationChance, w.SnowCm))
            .ToList();

        return days.Count == 0 && failed ? null : new WeatherDaysResponse(days, provider.Attribution, provider.AttributionUrl);
    }

    /// <summary>Fetches missing or stale days of one kind and saves them. False when the provider failed.</summary>
    private async Task<bool> RefreshAsync(
        string kind, List<DateOnly> dates, TimeSpan fresh, int lat10, int lng10, DateOnly today, DateTimeOffset now,
        Dictionary<(string Kind, DateOnly Date), WeatherCacheEntry> rows, CancellationToken ct)
    {
        var needed = dates.Where(d => !rows.TryGetValue((kind, d), out var row) || now - row.FetchedAt > fresh).ToList();
        if (needed.Count == 0) return true;

        var started = Stopwatch.GetTimestamp();
        IReadOnlyList<ProviderDay> fetched;
        try
        {
            fetched = kind == WeatherValues.Forecast
                ? Complete(await provider.GetForecastAsync(lat10 / 10d, lng10 / 10d, needed[0], needed[^1], ct))
                : await FetchTypicalAsync(lat10 / 10d, lng10 / 10d, needed, today, ct);
        }
        catch (WeatherProviderException ex)
        {
            // Only the kind, status code, error type and timing: never the position, dates or address.
            LogProviderFailed(kind, ex.StatusCode, ex.InnerException?.GetType().Name ?? "HttpStatus",
                (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            return false;
        }

        var wanted = needed.ToHashSet();
        foreach (var day in fetched.Where(d => wanted.Contains(d.Date)))
        {
            var entry = new WeatherCacheEntry
            {
                Id = Ids.New(), Kind = kind, Lat10 = lat10, Lng10 = lng10, Date = day.Date,
                MinC = day.MinC!.Value, MaxC = day.MaxC!.Value, PrecipitationMm = day.PrecipitationMm ?? 0,
                PrecipitationChance = day.PrecipitationChance, SnowCm = day.SnowCm ?? 0, FetchedAt = now,
            };
            await UpsertAsync(entry, ct);
            rows[(kind, day.Date)] = entry;
        }

        return true;
    }

    /// <summary>One request per past year, then the average of each day.</summary>
    private async Task<IReadOnlyList<ProviderDay>> FetchTypicalAsync(
        double lat, double lng, List<DateOnly> dates, DateOnly today, CancellationToken ct)
    {
        var years = TypicalYearsBack(dates[0], dates[^1], today);
        var history = await Task.WhenAll(years.Select(n =>
            provider.GetHistoryAsync(lat, lng, ShiftYears(dates[0], n), ShiftYears(dates[^1], n), ct)));
        return Typical(dates, years, history);
    }

    /// <summary>
    /// How many years back each of the 3 past years is: the first one is last calendar year (for the first day),
    /// moved one more year back while the range would reach days the archive does not have yet.
    /// </summary>
    internal static int[] TypicalYearsBack(DateOnly from, DateOnly to, DateOnly today)
    {
        var first = Math.Max(1, from.Year - (today.Year - 1));
        while (ShiftYears(to, first) > today.AddDays(-ArchiveLagDays)) first++;
        return Enumerable.Range(first, TypicalYears).ToArray();
    }

    /// <summary>The same calendar day <paramref name="years"/> years earlier; 29 February becomes 28 February.</summary>
    internal static DateOnly ShiftYears(DateOnly date, int years)
    {
        var year = date.Year - years;
        var day = date is { Month: 2, Day: 29 } && !DateTime.IsLeapYear(year) ? 28 : date.Day;
        return new DateOnly(year, date.Month, day);
    }

    /// <summary>
    /// Averages min, max, rain and snow over the years that have the day; the chance of rain is the percent of
    /// those years with 1 mm or more. A day no year has is left out.
    /// </summary>
    internal static IReadOnlyList<ProviderDay> Typical(
        IReadOnlyList<DateOnly> dates, IReadOnlyList<int> yearsBack, IReadOnlyList<IReadOnlyList<ProviderDay>> history)
    {
        var byYear = history.Select(h => h.Where(d => d.MinC is not null && d.MaxC is not null)
            .GroupBy(d => d.Date).ToDictionary(g => g.Key, g => g.First())).ToList();
        var result = new List<ProviderDay>();
        foreach (var date in dates)
        {
            var samples = yearsBack.Select((n, i) => byYear[i].GetValueOrDefault(ShiftYears(date, n)))
                .OfType<ProviderDay>().ToList();
            if (samples.Count == 0) continue;

            var rain = samples.Select(s => s.PrecipitationMm).OfType<double>().ToList();
            int? chance = rain.Count == 0 ? null : (int)Math.Round(100d * rain.Count(r => r >= 1) / rain.Count, MidpointRounding.AwayFromZero);
            result.Add(new ProviderDay(
                date,
                Round(samples.Average(s => s.MinC!.Value)),
                Round(samples.Average(s => s.MaxC!.Value)),
                rain.Count == 0 ? 0 : Round(rain.Average()),
                chance,
                Round(samples.Select(s => s.SnowCm ?? 0).Average())));
        }

        return result;
    }

    /// <summary>Rounded tenths: 41.87 → 419, -33.86 → -339.</summary>
    internal static int ToTenths(double value) => (int)Math.Round(value * 10, MidpointRounding.AwayFromZero);

    private static double Round(double value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    /// <summary>Forecast days without temperatures are left out.</summary>
    private static List<ProviderDay> Complete(IReadOnlyList<ProviderDay> days) =>
        days.Where(d => d.MinC is not null && d.MaxC is not null).ToList();

    /// <summary>Insert or update in one statement, so two requests at the same time cannot clash on the unique index.</summary>
    private Task<int> UpsertAsync(WeatherCacheEntry e, CancellationToken ct) => db.Database.ExecuteSqlInterpolatedAsync($"""
        INSERT INTO weather_cache (id, kind, lat10, lng10, date, min_c, max_c, precipitation_mm, precipitation_chance, snow_cm, fetched_at)
        VALUES ({e.Id}, {e.Kind}, {e.Lat10}, {e.Lng10}, {e.Date}, {e.MinC}, {e.MaxC}, {e.PrecipitationMm}, {e.PrecipitationChance}, {e.SnowCm}, {e.FetchedAt})
        ON CONFLICT (kind, lat10, lng10, date) DO UPDATE SET
            min_c = EXCLUDED.min_c, max_c = EXCLUDED.max_c, precipitation_mm = EXCLUDED.precipitation_mm,
            precipitation_chance = EXCLUDED.precipitation_chance, snow_cm = EXCLUDED.snow_cm, fetched_at = EXCLUDED.fetched_at
        """, ct);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Weather provider failed for {Kind} days: status {StatusCode}, {ErrorType}, after {ElapsedMs} ms")]
    private partial void LogProviderFailed(string kind, int? statusCode, string errorType, long elapsedMs);
}
