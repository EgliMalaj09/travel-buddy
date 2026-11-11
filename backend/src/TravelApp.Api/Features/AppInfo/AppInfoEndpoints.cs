using Microsoft.AspNetCore.Http.HttpResults;

namespace TravelApp.Api.Features.AppInfo;

/// <summary>Example of the endpoint conventions: route group, TypedResults, OpenAPI name and summary.</summary>
public static class AppInfoEndpoints
{
    public static IEndpointRouteBuilder MapAppInfoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/app-info").WithTags("App info");

        // Public on purpose: no user data.
        group.MapGet("/", GetAppInfo)
            .WithName("GetAppInfo")
            .WithSummary("Name, version and environment of the running API")
            .AllowAnonymous();

        return app;
    }

    internal static Ok<AppInfoResponse> GetAppInfo(IHostEnvironment environment)
    {
        var version = typeof(AppInfoEndpoints).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        return TypedResults.Ok(new AppInfoResponse("Travel App", version, environment.EnvironmentName));
    }
}
