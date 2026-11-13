using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Geo;

/// <summary>The search provider could not be reached or answered with an error.</summary>
internal sealed class GeoProviderException(int? statusCode, Exception? inner = null)
    : Exception("Place search provider failed", inner)
{
    public int? StatusCode { get; } = statusCode;
}

/// <summary>The place search source (Photon today; a self-hosted Photon or Nominatim can replace it).</summary>
public interface IGeoProvider
{
    string Attribution { get; }
    string AttributionUrl { get; }

    /// <summary>Places matching the text. <paramref name="near"/> is already rounded to 1 decimal.</summary>
    Task<IReadOnlyList<GeoPlaceDto>> SearchAsync(string query, (double Lat, double Lng)? near, CancellationToken ct);

    /// <summary>The nearest named thing at the point, or null.</summary>
    Task<GeoPlaceDto?> ReverseAsync(double lat, double lng, CancellationToken ct);
}

/// <summary>Configuration section "Geo".</summary>
internal sealed class GeoOptions
{
    public const string Section = "Geo";

    /// <summary>Photon base address. The public one (komoot, Germany) is free with fair use; can point to a self-hosted Photon.</summary>
    public Uri PhotonUrl { get; set; } = new("https://photon.komoot.io/");

    /// <summary>Language of names: Photon supports default, en, de, fr.</summary>
    public string Language { get; set; } = "en";

    /// <summary>Calls per user per minute. The app waits until typing stops, so 30 is plenty and keeps us within fair use.</summary>
    public int RequestsPerMinutePerUser { get; set; } = 30;
}

/// <summary>
/// Photon by komoot (free, no key, OpenStreetMap data under ODbL). The HTTP client's own request logs are
/// removed in <see cref="GeoSetup"/>, because the request address holds the search text and position.
/// </summary>
internal sealed class PhotonProvider(HttpClient http, IOptions<GeoOptions> options) : IGeoProvider
{
    public string Attribution => "Search by Photon (komoot) · © OpenStreetMap contributors";
    public string AttributionUrl => "https://www.openstreetmap.org/copyright";

    public async Task<IReadOnlyList<GeoPlaceDto>> SearchAsync(string query, (double Lat, double Lng)? near, CancellationToken ct)
    {
        var inv = CultureInfo.InvariantCulture;
        var q = string.Create(inv, $"q={Uri.EscapeDataString(query)}&limit={GeoValues.MaxResults + 4}&lang={Lang}");
        if (near is { } n) q += string.Create(inv, $"&lat={n.Lat:0.0}&lon={n.Lng:0.0}");
        var features = await GetAsync("api", q, ct);
        return features.Select(PhotonMapping.ToPlace).OfType<GeoPlaceDto>()
            .DistinctBy(p => p.GeoProviderId).Take(GeoValues.MaxResults).ToList();
    }

    public async Task<GeoPlaceDto?> ReverseAsync(double lat, double lng, CancellationToken ct)
    {
        var q = string.Create(CultureInfo.InvariantCulture, $"lat={lat:0.######}&lon={lng:0.######}&limit=1&lang={Lang}");
        var features = await GetAsync("reverse", q, ct);
        return features.Select(PhotonMapping.ToPlace).OfType<GeoPlaceDto>().FirstOrDefault();
    }

    private string Lang => Uri.EscapeDataString(options.Value.Language);

    private async Task<IReadOnlyList<PhotonFeature>> GetAsync(string path, string query, CancellationToken ct)
    {
        // A base address without the last "/" (a self-hosted Photon under /photon) must keep its path.
        var root = options.Value.PhotonUrl.AbsoluteUri.TrimEnd('/') + "/";
        var uri = new UriBuilder(new Uri(new Uri(root), path)) { Query = query }.Uri;
        try
        {
            using var response = await http.GetAsync(uri, ct);
            if (!response.IsSuccessStatusCode) throw new GeoProviderException((int)response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<PhotonResponse>(ct);
            return body?.Features ?? [];
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            throw new GeoProviderException(null, ex);
        }
    }
}

internal sealed record PhotonResponse([property: JsonPropertyName("features")] List<PhotonFeature>? Features);

internal sealed record PhotonFeature(
    [property: JsonPropertyName("geometry")] PhotonGeometry? Geometry,
    [property: JsonPropertyName("properties")] PhotonProperties? Properties);

internal sealed record PhotonGeometry([property: JsonPropertyName("coordinates")] List<double>? Coordinates);

internal sealed record PhotonProperties(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("housenumber")] string? HouseNumber,
    [property: JsonPropertyName("street")] string? Street,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("countrycode")] string? CountryCode,
    [property: JsonPropertyName("osm_type")] string? OsmType,
    [property: JsonPropertyName("osm_id")] long? OsmId,
    [property: JsonPropertyName("osm_key")] string? OsmKey,
    [property: JsonPropertyName("osm_value")] string? OsmValue,
    [property: JsonPropertyName("type")] string? Type);

/// <summary>Turns a Photon result into our place shape. Kept separate so it can be unit tested.</summary>
internal static class PhotonMapping
{
    private const int NameMax = 120;
    private const int CityMax = 120;
    private const int AddressMax = 300;

    private static readonly HashSet<string> Settlements = ["city", "town", "village", "hamlet", "locality"];

    private static readonly HashSet<string> Food =
        ["restaurant", "cafe", "bar", "pub", "fast_food", "food_court", "ice_cream", "biergarten"];

    private static readonly HashSet<string> Stay =
        ["hotel", "hostel", "guest_house", "motel", "apartment", "camp_site", "chalet", "alpine_hut"];

    private static readonly HashSet<string> Sights =
        ["attraction", "museum", "viewpoint", "artwork", "gallery", "zoo", "theme_park", "aquarium"];

    private static readonly HashSet<string> Transport =
        ["station", "halt", "bus_station", "ferry_terminal", "aerodrome", "terminal", "tram_stop", "subway_entrance"];

    public static GeoPlaceDto? ToPlace(PhotonFeature feature)
    {
        var p = feature.Properties;
        if (p is null || feature.Geometry?.Coordinates is not [var lng, var lat, ..]) return null;
        if (lat is < -90 or > 90 || lng is < -180 or > 180) return null;
        var country = p.CountryCode?.Trim().ToUpperInvariant();
        if (country is not { Length: 2 } || !country.All(char.IsAsciiLetterUpper)) return null;

        var street = Join(" ", p.Street, p.HouseNumber);
        var city = Clean(p.City) ?? (Settlements.Contains(p.Type ?? "") ? Clean(p.Name) : null);
        var name = Clean(p.Name) ?? street ?? city;
        if (name is null) return null;
        var address = Join(", ", street, city == name ? null : city);

        return new GeoPlaceDto(
            Cut(name, NameMax)!,
            Cut(address == name ? null : address, AddressMax),
            Cut(city, CityMax),
            country,
            Math.Round(lat, 6),
            Math.Round(lng, 6),
            $"osm:{Clean(p.OsmType) ?? "X"}:{p.OsmId?.ToString(CultureInfo.InvariantCulture) ?? "0"}",
            Category(p.OsmKey, p.OsmValue));
    }

    internal static string? Category(string? key, string? value)
    {
        value ??= "";
        return key switch
        {
            "amenity" when Food.Contains(value) => "food",
            "amenity" when Transport.Contains(value) => "transport",
            "tourism" when Stay.Contains(value) => "stay",
            "tourism" when Sights.Contains(value) => "sight",
            "historic" => "sight",
            "railway" or "public_transport" or "aeroway" when Transport.Contains(value) => "transport",
            _ => null,
        };
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string? Join(string separator, params string?[] parts)
    {
        var kept = parts.Select(Clean).OfType<string>().ToList();
        return kept.Count == 0 ? null : string.Join(separator, kept);
    }

    private static string? Cut(string? s, int max) => s is null || s.Length <= max ? s : s[..max].TrimEnd();
}
