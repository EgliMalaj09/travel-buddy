using Microsoft.AspNetCore.Http.HttpResults;

namespace TravelApp.Api.Features.Geo;

/// <summary>
/// Place search for the map (KAN-37). The app asks the API, never the search provider directly, so the
/// provider never sees the traveller's phone (IP address) and we can swap providers without an app update.
/// </summary>
public static class GeoEndpoints
{
    public static IEndpointRouteBuilder MapGeoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/geo").WithTags("Geo").RequireAuthorization()
            .RequireRateLimiting(GeoSetup.RateLimitPolicy)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/search", Search).WithName("SearchGeoPlaces")
            .WithSummary("Find places by name or address, nearby ones first when a position is sent");
        group.MapGet("/reverse", Reverse).WithName("ReverseGeoPlace")
            .WithSummary("What is at a point on the map: name, address, city and country");

        return app;
    }

    internal static async Task<Results<Ok<GeoSearchResponse>, ProblemHttpResult>> Search(
        [AsParameters] GeoSearchQuery query, IGeoProvider provider, CancellationToken ct)
    {
        try
        {
            var places = await provider.SearchAsync(query.Q!.Trim(), Near(query.Lat, query.Lng), ct);
            return TypedResults.Ok(new GeoSearchResponse(places, provider.Attribution, provider.AttributionUrl));
        }
        catch (GeoProviderException)
        {
            return Unavailable();
        }
    }

    internal static async Task<Results<Ok<GeoReverseResponse>, ProblemHttpResult>> Reverse(
        [AsParameters] GeoReverseQuery query, IGeoProvider provider, CancellationToken ct)
    {
        try
        {
            var place = await provider.ReverseAsync(Math.Round(query.Lat, 6), Math.Round(query.Lng, 6), ct);
            return TypedResults.Ok(new GeoReverseResponse(place, provider.Attribution, provider.AttributionUrl));
        }
        catch (GeoProviderException)
        {
            return Unavailable();
        }
    }

    /// <summary>The "near" hint only needs the area: 1 decimal (about 11 km), never the exact point.</summary>
    private static (double Lat, double Lng)? Near(double? lat, double? lng) =>
        lat is { } a && lng is { } b ? (Math.Round(a, 1), Math.Round(b, 1)) : null;

    private static ProblemHttpResult Unavailable() =>
        TypedResults.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Place search is not available right now");
}
