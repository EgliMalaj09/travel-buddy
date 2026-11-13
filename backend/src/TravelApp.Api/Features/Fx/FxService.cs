using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Fx;

/// <summary>Days the provider failed for, shared by all requests, so a broken provider is not asked on every call.</summary>
internal sealed class FxFailures
{
    public static readonly TimeSpan RetryAfter = TimeSpan.FromMinutes(10);

    private readonly ConcurrentDictionary<DateOnly, DateTimeOffset> _failedAt = new();

    public bool RecentlyFailed(DateOnly day, DateTimeOffset now) =>
        _failedAt.TryGetValue(day, out var at) && now - at < RetryAfter;

    public void Failed(DateOnly day, DateTimeOffset now) => _failedAt[day] = now;

    public void Worked(DateOnly day) => _failedAt.TryRemove(day, out _);
}

/// <summary>
/// Daily exchange rates for expenses (KAN-43), cached in PostgreSQL. Each day is fetched from the provider once;
/// a past day's rates never change. Nothing about the request is logged except status codes and timings.
/// </summary>
internal sealed partial class FxService(
    AppDbContext db, IFxProvider provider, FxFailures failures, TimeProvider clock, ILogger<FxService> logger)
{
    public async Task<FxRatesResponse> GetRatesAsync(IReadOnlyList<DateOnly> dates, IReadOnlyList<string> currencies, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var wanted = currencies.Append("EUR").ToHashSet(StringComparer.Ordinal);

        // A future day uses today's rates (or the latest) until that day comes.
        var lookups = dates.Select(d => d > today ? today : d).Distinct().ToList();
        foreach (var day in lookups) await EnsureDayAsync(day, today, now, ct);

        var earliest = lookups.Min().AddDays(-FxValues.FallbackDays);
        var latest = lookups.Max();
        var rows = await db.Set<FxRate>().AsNoTracking()
            .Where(r => r.Date >= earliest && r.Date <= latest && wanted.Contains(r.Currency))
            .ToListAsync(ct);
        var byDay = rows.GroupBy(r => r.Date).ToDictionary(g => g.Key, g => g.ToDictionary(r => r.Currency, r => r.RateToEur));
        var days = byDay.Keys.Order().ToList();

        var answer = dates.Select(date =>
        {
            var lookup = date > today ? today : date;
            var from = lookup.AddDays(-FxValues.FallbackDays);
            var found = days.LastOrDefault(d => d <= lookup && d >= from);
            if (found == default || !byDay.TryGetValue(found, out var rates))
                return new FxDayDto(date, null, false, new Dictionary<string, decimal>());
            var asked = rates.Where(r => wanted.Contains(r.Key)).ToDictionary(r => r.Key, r => r.Value);
            return new FxDayDto(date, found, found == date, asked);
        }).ToList();
        return new FxRatesResponse(answer);
    }

    /// <summary>Makes sure the rates of <paramref name="day"/> are stored, when the provider has them.</summary>
    private async Task EnsureDayAsync(DateOnly day, DateOnly today, DateTimeOffset now, CancellationToken ct)
    {
        if (await db.Set<FxRate>().AnyAsync(r => r.Date == day, ct)) return;
        if (failures.RecentlyFailed(day, now)) return;

        var started = Stopwatch.GetTimestamp();
        try
        {
            var fetched = await provider.GetAsync(day, ct);
            // Today's file is published shortly after midnight UTC; until then, keep the latest day.
            if (fetched is null && day == today) fetched = await provider.GetAsync(null, ct);
            if (fetched is null)
            {
                failures.Failed(day, now);
                return;
            }

            // Rates of another day (the latest, while today's are not out yet): use them, and ask for the day again later.
            if (fetched.Date == day) failures.Worked(day);
            else failures.Failed(day, now);
            await SaveAsync(fetched, now, ct);
        }
        catch (FxProviderException ex)
        {
            failures.Failed(day, now);
            // Only status code, error type and timing (GDPR core rule): never the day or anything about the user.
            LogProviderFailed(ex.StatusCode, ex.InnerException?.GetType().Name ?? "HttpStatus",
                (long)Stopwatch.GetElapsedTime(started).TotalMilliseconds);
        }
    }

    private async Task SaveAsync(ProviderRates fetched, DateTimeOffset now, CancellationToken ct)
    {
        if (await db.Set<FxRate>().AnyAsync(r => r.Date == fetched.Date, ct)) return;
        db.AddRange(fetched.RatesToEur.Select(r => new FxRate { Date = fetched.Date, Currency = r.Key, RateToEur = r.Value, FetchedAt = now }));
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Another request saved the same day at the same moment: theirs is the same data.
        }
        finally
        {
            db.ChangeTracker.Clear();
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "FX provider failed: status {StatusCode}, {ErrorType}, after {ElapsedMs} ms")]
    private partial void LogProviderFailed(int? statusCode, string errorType, long elapsedMs);
}
