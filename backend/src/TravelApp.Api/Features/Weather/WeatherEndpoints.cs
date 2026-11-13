using Microsoft.AspNetCore.Http.HttpResults;

namespace TravelApp.Api.Features.Weather;

/// <summary>Weather for the packing list (KAN-29). The app asks the API, never the weather provider directly.</summary>
public static class WeatherEndpoints
{
    public static IEndpointRouteBuilder MapWeatherEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/weather").WithTags("Weather").RequireAuthorization()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/days", GetDays).WithName("GetWeatherDays")
            .WithSummary("Weather per day for a place: forecast up to 15 days ahead, after that the typical weather of the last 3 years")
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        return app;
    }

    internal static async Task<Results<Ok<WeatherDaysResponse>, ProblemHttpResult>> GetDays(
        [AsParameters] WeatherDaysQuery query, WeatherService service, CancellationToken ct) =>
        await service.GetDaysAsync(query, ct) is { } days
            ? TypedResults.Ok(days)
            : TypedResults.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Weather is not available right now");
}
