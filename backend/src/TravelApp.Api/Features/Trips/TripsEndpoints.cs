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
            .WithSummary("Your trips with their stops and flights (deleted ones left out)");

        return app;
    }

    internal static async Task<Ok<MyTripsResponse>> ListMine(ClaimsPrincipal user, TripsService service, CancellationToken ct) =>
        TypedResults.Ok(await service.ListMineAsync(user.UserId(), ct));
}
