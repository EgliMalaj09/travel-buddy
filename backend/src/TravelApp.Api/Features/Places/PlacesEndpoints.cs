using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Places;

/// <summary>
/// Reading a trip's places straight from the API. The phone writes through POST /sync/upload and reads through
/// PowerSync; the web preview of the app and Postman/Scalar read here.
/// </summary>
public static class PlacesEndpoints
{
    public static IEndpointRouteBuilder MapPlacesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/places").WithTags("Places").RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", ListForTrip).WithName("ListTripPlaces")
            .WithSummary("The places of one of your trips (deleted ones left out), by planned day, \"any day\" last");

        return app;
    }

    internal static async Task<Results<Ok<TripPlacesResponse>, NotFound>> ListForTrip(
        ClaimsPrincipal user, PlacesService service, Guid tripId, CancellationToken ct) =>
        await service.ListForTripAsync(user.UserId(), tripId, ct) is { } places
            ? TypedResults.Ok(places)
            : TypedResults.NotFound();
}
