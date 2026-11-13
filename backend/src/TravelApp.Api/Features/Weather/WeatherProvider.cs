using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Weather;

/// <summary>One day as the weather provider gives it. Values can be empty when the provider has no data.</summary>
internal sealed record ProviderDay(
    DateOnly Date, double? MinC, double? MaxC, double? PrecipitationMm, int? PrecipitationChance, double? SnowCm);

/// <summary>The provider could not be reached or answered with an error.</summary>
internal sealed class WeatherProviderException(int? statusCode, Exception? inner = null)
    : Exception("Weather provider failed", inner)
{
    public int? StatusCode { get; } = statusCode;
}

/// <summary>
/// The weather source (Open-Meteo today; can be swapped for MET Norway). Positions are already rounded
/// to 1 decimal by <see cref="WeatherService"/>, so the provider never gets an exact point.
/// </summary>
internal interface IWeatherProvider
{
    string Attribution { get; }
    string AttributionUrl { get; }

    /// <summary>Forecast days (also works for the last few days).</summary>
    Task<IReadOnlyList<ProviderDay>> GetForecastAsync(double lat, double lng, DateOnly from, DateOnly to, CancellationToken ct);

    /// <summary>Measured days in the past (for the "typical" averages).</summary>
    Task<IReadOnlyList<ProviderDay>> GetHistoryAsync(double lat, double lng, DateOnly from, DateOnly to, CancellationToken ct);
}

/// <summary>Configuration section "Weather".</summary>
internal sealed class WeatherOptions
{
    public const string Section = "Weather";

    public Uri ForecastUrl { get; set; } = new("https://api.open-meteo.com/v1/forecast");
    public Uri ArchiveUrl { get; set; } = new("https://archive-api.open-meteo.com/v1/archive");
}

/// <summary>
/// Open-Meteo (free, no key; CC BY 4.0). The HTTP client's own request logs are removed in
/// <see cref="WeatherSetup"/>, because the request address contains the position.
/// </summary>
internal sealed class OpenMeteoProvider(HttpClient http, IOptions<WeatherOptions> options) : IWeatherProvider
{
    private const string ForecastFields = "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,snowfall_sum";
    private const string ArchiveFields = "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum";

    public string Attribution => "Weather data by Open-Meteo.com";
    public string AttributionUrl => "https://open-meteo.com/";

    public Task<IReadOnlyList<ProviderDay>> GetForecastAsync(double lat, double lng, DateOnly from, DateOnly to, CancellationToken ct) =>
        GetAsync(options.Value.ForecastUrl, ForecastFields, lat, lng, from, to, ct);

    public Task<IReadOnlyList<ProviderDay>> GetHistoryAsync(double lat, double lng, DateOnly from, DateOnly to, CancellationToken ct) =>
        GetAsync(options.Value.ArchiveUrl, ArchiveFields, lat, lng, from, to, ct);

    private async Task<IReadOnlyList<ProviderDay>> GetAsync(
        Uri endpoint, string fields, double lat, double lng, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var inv = CultureInfo.InvariantCulture;
        var query = string.Create(inv,
            $"latitude={lat:0.0}&longitude={lng:0.0}&daily={fields}&timezone=auto&start_date={from:yyyy-MM-dd}&end_date={to:yyyy-MM-dd}");
        var uri = new UriBuilder(endpoint) { Query = query }.Uri;

        OpenMeteoResponse? body;
        try
        {
            using var response = await http.GetAsync(uri, ct);
            if (!response.IsSuccessStatusCode) throw new WeatherProviderException((int)response.StatusCode);
            body = await response.Content.ReadFromJsonAsync<OpenMeteoResponse>(ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            throw new WeatherProviderException(null, ex);
        }

        var daily = body?.Daily;
        if (daily?.Time is not { } time) return [];
        var days = new List<ProviderDay>(time.Count);
        for (var i = 0; i < time.Count; i++)
        {
            var chance = At(daily.PrecipitationProbabilityMax, i);
            days.Add(new ProviderDay(
                time[i],
                At(daily.TemperatureMin, i),
                At(daily.TemperatureMax, i),
                At(daily.PrecipitationSum, i),
                chance is { } c ? (int)Math.Clamp(Math.Round(c), 0, 100) : null,
                At(daily.SnowfallSum, i)));
        }

        return days;
    }

    private static double? At(List<double?>? values, int i) => values is not null && i < values.Count ? values[i] : null;

    private sealed record OpenMeteoResponse([property: JsonPropertyName("daily")] OpenMeteoDaily? Daily);

    private sealed record OpenMeteoDaily(
        [property: JsonPropertyName("time")] List<DateOnly>? Time,
        [property: JsonPropertyName("temperature_2m_max")] List<double?>? TemperatureMax,
        [property: JsonPropertyName("temperature_2m_min")] List<double?>? TemperatureMin,
        [property: JsonPropertyName("precipitation_sum")] List<double?>? PrecipitationSum,
        [property: JsonPropertyName("precipitation_probability_max")] List<double?>? PrecipitationProbabilityMax,
        [property: JsonPropertyName("snowfall_sum")] List<double?>? SnowfallSum);
}
