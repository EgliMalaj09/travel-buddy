using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace TravelApp.Api.Features.Geo;

// Request and response types of the place search for the map (KAN-37, decisions/features/09-map.md).
// The app generates its types from these. Nothing here is stored or logged: the typed text and the
// positions only pass through to the search provider (GDPR core rule).

public static class GeoValues
{
    public const int QueryMin = 2;
    public const int QueryMax = 100;
    public const int MaxResults = 8;
}

/// <summary>Search text, and optionally where the traveller is that day so nearby places come first.</summary>
public sealed class GeoSearchQuery : IValidatableObject
{
    /// <summary>What to look for, 2 to 100 characters ("Colosseum", "Via Roma 12").</summary>
    [FromQuery(Name = "q"), Required, StringLength(GeoValues.QueryMax, MinimumLength = GeoValues.QueryMin)]
    public string? Q { get; init; }

    /// <summary>Optional: latitude to search near (-90 to 90). Rounded to 1 decimal (about 11 km) before it is used.</summary>
    [FromQuery(Name = "lat"), Range(-90d, 90d)]
    public double? Lat { get; init; }

    /// <summary>Optional: longitude to search near (-180 to 180). Send together with lat.</summary>
    [FromQuery(Name = "lng"), Range(-180d, 180d)]
    public double? Lng { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Lat is null != Lng is null)
        {
            yield return new ValidationResult("Send both lat and lng, or neither.", [nameof(Lat)]);
        }

        if (string.IsNullOrWhiteSpace(Q) || Q.Trim().Length < GeoValues.QueryMin)
        {
            yield return new ValidationResult($"Type at least {GeoValues.QueryMin} letters.", [nameof(Q)]);
        }
    }
}

/// <summary>A point on the map, to find what is there (after the traveller moved the pin).</summary>
public sealed class GeoReverseQuery
{
    /// <summary>Latitude, -90 to 90.</summary>
    [FromQuery(Name = "lat"), Range(-90d, 90d)]
    public double Lat { get; init; }

    /// <summary>Longitude, -180 to 180.</summary>
    [FromQuery(Name = "lng"), Range(-180d, 180d)]
    public double Lng { get; init; }
}

/// <summary>One place found by the search.</summary>
/// <param name="Name">Name to show and to suggest as the place's name ("Colosseum", or "Via Roma 12").</param>
/// <param name="Address">Street, number and city in one line, when known.</param>
/// <param name="CityName">City, town or village, when known.</param>
/// <param name="CountryCode">ISO 3166-1 alpha-2, upper case ("IT"). Results without a country are left out.</param>
/// <param name="Lat">Latitude, 6 decimals.</param>
/// <param name="Lng">Longitude, 6 decimals.</param>
/// <param name="GeoProviderId">The provider's id for it ("osm:N:123"), stored on the place as geo_provider_id.</param>
/// <param name="Category">Suggested category (food, sight, stay, transport) or empty when unclear.</param>
public sealed record GeoPlaceDto(
    string Name,
    string? Address,
    string? CityName,
    string CountryCode,
    double Lat,
    double Lng,
    string GeoProviderId,
    string? Category);

/// <summary>Up to 8 places, best match first. The attribution must be shown next to the results (OpenStreetMap ODbL).</summary>
public sealed record GeoSearchResponse(IReadOnlyList<GeoPlaceDto> Places, string Attribution, string AttributionUrl);

/// <summary>What is at the point, or empty when nothing with a country is there (open sea).</summary>
public sealed record GeoReverseResponse(GeoPlaceDto? Place, string Attribution, string AttributionUrl);
