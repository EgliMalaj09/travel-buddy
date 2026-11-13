using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace TravelApp.Api.Features.Weather;

// Request and response types of the packing list weather (KAN-29, decisions/features packing list K-decisions).
// The app generates its types from these.

public static class WeatherValues
{
    /// <summary>Real forecast (today - 2 days to today + 15 days).</summary>
    public const string Forecast = "forecast";

    /// <summary>Average of the same dates in the last 3 years (further ahead than the forecast reaches).</summary>
    public const string Typical = "typical";

    public const int MaxDays = 31;
    public const int PastDays = 2;
    public const int ForecastDays = 15;
    public const int AheadDays = 400;
}

/// <summary>Where and when. The position is rounded to 1 decimal (about 11 km) before it is used.</summary>
public sealed class WeatherDaysQuery : IValidatableObject
{
    /// <summary>Latitude, -90 to 90.</summary>
    [FromQuery(Name = "lat"), Range(-90d, 90d)]
    public double Lat { get; init; }

    /// <summary>Longitude, -180 to 180.</summary>
    [FromQuery(Name = "lng"), Range(-180d, 180d)]
    public double Lng { get; init; }

    /// <summary>First day (yyyy-MM-dd), at the earliest 2 days ago.</summary>
    [FromQuery(Name = "from")]
    public DateOnly From { get; init; }

    /// <summary>Last day (yyyy-MM-dd), at most 31 days after From and at most 400 days ahead.</summary>
    [FromQuery(Name = "to")]
    public DateOnly To { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        ArgumentNullException.ThrowIfNull(validationContext);
        var clock = validationContext.GetService(typeof(TimeProvider)) as TimeProvider ?? TimeProvider.System;
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

        if (To < From)
        {
            yield return new ValidationResult("The last day must not be before the first day.", [nameof(To)]);
        }
        else if (To.DayNumber - From.DayNumber + 1 > WeatherValues.MaxDays)
        {
            yield return new ValidationResult($"At most {WeatherValues.MaxDays} days at once.", [nameof(To)]);
        }

        if (From < today.AddDays(-WeatherValues.PastDays))
        {
            yield return new ValidationResult($"The first day can be at most {WeatherValues.PastDays} days ago.", [nameof(From)]);
        }

        if (To > today.AddDays(WeatherValues.AheadDays))
        {
            yield return new ValidationResult($"The last day can be at most {WeatherValues.AheadDays} days ahead.", [nameof(To)]);
        }
    }
}

/// <summary>The weather of one day.</summary>
/// <param name="Date">The day (local date at the place).</param>
/// <param name="Kind">"forecast" (real forecast) or "typical" (average of the last 3 years).</param>
/// <param name="MinC">Lowest temperature, °C.</param>
/// <param name="MaxC">Highest temperature, °C.</param>
/// <param name="PrecipitationMm">Rain and snow together, mm.</param>
/// <param name="PrecipitationChance">
/// Chance of rain, 0-100. Forecast: from the provider (may be empty). Typical: percent of the years with 1 mm or more.
/// </param>
/// <param name="SnowCm">Snowfall, cm.</param>
public sealed record WeatherDayDto(
    DateOnly Date,
    string Kind,
    double MinC,
    double MaxC,
    double PrecipitationMm,
    int? PrecipitationChance,
    double SnowCm);

/// <summary>Days in date order. A day without data is left out. The attribution must be shown in the app (CC BY 4.0).</summary>
public sealed record WeatherDaysResponse(IReadOnlyList<WeatherDayDto> Days, string Attribution, string AttributionUrl);
