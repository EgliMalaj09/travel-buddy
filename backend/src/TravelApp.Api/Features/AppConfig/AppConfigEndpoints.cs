using Microsoft.AspNetCore.Http.HttpResults;

namespace TravelApp.Api.Features.AppConfig;

/// <summary>AppConfig for the phone (data model section 6). Changed only through the back office (/admin/config).</summary>
public static class AppConfigEndpoints
{
    public static IServiceCollection AddAppConfigFeature(this IServiceCollection services)
    {
        services.AddScoped<IAppConfigStore, AppConfigService>();
        return services;
    }

    public static IEndpointRouteBuilder MapAppConfigEndpoints(this IEndpointRouteBuilder app)
    {
        // Public on purpose: the phone checks the minimum version before login. No user data.
        app.MapGroup("/app-config").WithTags("App config").AllowAnonymous()
            .MapGet("/", GetAppConfig).WithName("GetAppConfig")
            .WithSummary("Settings for every phone: minimum app version, photo limits, feature switches. Keep the last copy for offline use");
        return app;
    }

    internal static async Task<Ok<AppConfigDto>> GetAppConfig(IAppConfigStore store, HttpContext http, CancellationToken ct)
    {
        http.Response.Headers.CacheControl = "public, max-age=300";
        return TypedResults.Ok(await store.GetAsync(ct));
    }
}
