using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Expenses;

/// <summary>
/// Reading a trip's expenses straight from the API. The phone writes through POST /sync/upload and reads through
/// PowerSync (stream "my_expenses"); the web preview of the app and Postman/Scalar read here.
/// </summary>
public static class ExpensesEndpoints
{
    public static IEndpointRouteBuilder MapExpensesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/expenses").WithTags("Expenses").RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", ListForTrip).WithName("ListTripExpenses")
            .WithSummary("The expenses of one of your trips (deleted ones and other people's personal ones left out), newest first");

        return app;
    }

    internal static async Task<Results<Ok<TripExpensesResponse>, NotFound>> ListForTrip(
        ClaimsPrincipal user, ExpensesService service, Guid tripId, CancellationToken ct) =>
        await service.ListForTripAsync(user.UserId(), tripId, ct) is { } expenses
            ? TypedResults.Ok(expenses)
            : TypedResults.NotFound();
}
