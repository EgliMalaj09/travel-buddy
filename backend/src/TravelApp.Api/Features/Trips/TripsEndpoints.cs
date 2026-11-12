using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Trips;

/// <summary>
/// Reading trips straight from the API. The phone writes through POST /sync/upload. Until the app has its
/// local database (PowerSync, KAN-15), it reads here; Postman and Scalar use it to see what was saved.
/// </summary>
public static class TripsEndpoints
{
    public static IEndpointRouteBuilder MapTripsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/trips").WithTags("Trips").RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", ListMine).WithName("ListMyTrips")
            .WithSummary("Your trips with their stops and flights (deleted ones left out), one page at a time")
            .WithDescription($"Up to `limit` trips (default {TripsPaging.DefaultLimit}, max {TripsPaging.MaxLimit}). "
                + "When `nextCursor` is set, call again with `after=<nextCursor>` for the next page.");

        return app;
    }

    internal static async Task<Results<Ok<MyTripsResponse>, ValidationProblem>> ListMine(
        ClaimsPrincipal user, TripsService service, CancellationToken ct, int? limit = null, string? after = null)
    {
        if (limit is < 1 or > TripsPaging.MaxLimit)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["limit"] = [$"Limit must be between 1 and {TripsPaging.MaxLimit}."],
            });
        }

        return await service.ListMineAsync(user.UserId(), limit ?? TripsPaging.DefaultLimit, after, ct) is { } page
            ? TypedResults.Ok(page)
            : TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["after"] = ["This cursor is not valid. Start again without it."] });
    }
}
