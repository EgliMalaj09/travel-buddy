using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;

namespace TravelApp.Api.Tests.Features.Geo;

/// <summary>
/// Answers like Photon, so tests never call the internet. Records every address it was asked for.
/// Search gives: the Colosseum (sight), a restaurant, a street with a number, a duplicate of the Colosseum,
/// and a result without a country (left out). Reverse gives the street, or nothing south of -60.
/// </summary>
public sealed class FakePhoton : HttpMessageHandler
{
    private readonly ConcurrentQueue<Uri> _requests = new();

    public bool Fail { get; set; }

    public IReadOnlyList<Uri> Requests => [.. _requests];

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;
        _requests.Enqueue(uri);
        if (Fail) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests));

        object[] features;
        if (uri.AbsolutePath.EndsWith("/reverse", StringComparison.Ordinal))
        {
            var lat = System.Web.HttpUtility.ParseQueryString(uri.Query)["lat"];
            features = lat is not null && double.Parse(lat, System.Globalization.CultureInfo.InvariantCulture) < -60
                ? []
                : [Street];
        }
        else
        {
            features = [Colosseum, Restaurant, Street, Colosseum, NoCountry];
        }

        var body = JsonSerializer.Serialize(new { type = "FeatureCollection", features });
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        });
    }

    private static object Feature(double lng, double lat, object properties) =>
        new { type = "Feature", geometry = new { type = "Point", coordinates = new[] { lng, lat } }, properties };

    private static readonly object Colosseum = Feature(12.4922309123, 41.8902102456, new
    {
        osm_type = "W", osm_id = 27_000_000L, osm_key = "tourism", osm_value = "attraction", type = "house",
        name = "Colosseum", street = "Piazza del Colosseo", housenumber = "1", city = "Rome", countrycode = "IT",
    });

    private static readonly object Restaurant = Feature(12.49, 41.89, new
    {
        osm_type = "N", osm_id = 123L, osm_key = "amenity", osm_value = "restaurant", type = "house",
        name = "Trattoria da Enzo", street = "Via dei Vascellari", housenumber = "29", city = "Rome", countrycode = "it",
    });

    private static readonly object Street = Feature(12.48, 41.9, new
    {
        osm_type = "N", osm_id = 456L, osm_key = "place", osm_value = "house", type = "house",
        street = "Via Roma", housenumber = "12", city = "Rome", countrycode = "IT",
    });

    private static readonly object NoCountry = Feature(0, 0, new
    {
        osm_type = "N", osm_id = 789L, osm_key = "natural", osm_value = "water", type = "other", name = "Somewhere at sea",
    });
}
