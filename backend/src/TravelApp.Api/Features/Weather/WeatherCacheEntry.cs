namespace TravelApp.Api.Features.Weather;

/// <summary>
/// One day of weather for one rounded position (table "weather_cache"). Server only, never synced, no personal data:
/// no user or trip id, and the position is rounded to about 11 km.
/// </summary>
public sealed class WeatherCacheEntry
{
    public Guid Id { get; set; }

    /// <summary>"forecast" or "typical".</summary>
    public string Kind { get; set; } = "";

    /// <summary>Rounded latitude × 10 (41.9 → 419).</summary>
    public int Lat10 { get; set; }

    /// <summary>Rounded longitude × 10.</summary>
    public int Lng10 { get; set; }

    public DateOnly Date { get; set; }
    public double MinC { get; set; }
    public double MaxC { get; set; }
    public double PrecipitationMm { get; set; }
    public int? PrecipitationChance { get; set; }
    public double SnowCm { get; set; }
    public DateTimeOffset FetchedAt { get; set; }
}
