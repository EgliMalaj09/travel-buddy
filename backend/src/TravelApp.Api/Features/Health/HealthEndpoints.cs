using TravelApp.Api.Features.Admin;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Health;

/// <summary>Health check used by Azure and by the developer: is the API up and can it reach the database?</summary>
public static class HealthEndpoints
{
    public static IServiceCollection AddHealthFeature(this IServiceCollection services)
    {
        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");
        services.AddScoped<IServiceStatusCheck, DatabaseStatusCheck>();
        return services;
    }

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        // Public on purpose: no user data, needed by the hosting platform.
        app.MapHealthChecks("/health").AllowAnonymous();
        return app;
    }
}
