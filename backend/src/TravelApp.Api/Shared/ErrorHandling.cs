namespace TravelApp.Api.Shared;

/// <summary>One error format everywhere: ProblemDetails (structure rule 8).</summary>
public static class ErrorHandling
{
    public static IServiceCollection AddTravelAppErrors(this IServiceCollection services)
    {
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
                context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        });
        services.AddExceptionHandler<BadRequestHandler>();
        return services;
    }
}
