using System.Threading.RateLimiting;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Admin;

/// <summary>Back office services, its token policy, CORS for the back office web app and its rate limit.</summary>
public static class AdminSetup
{
    public const string AuthPolicy = "admin";
    public const string CorsPolicy = "admin";
    public const string RateLimitPolicy = "admin";

    public static IServiceCollection AddAdminFeature(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddOptions<AdminOptions>().Bind(configuration.GetSection(AdminOptions.Section));
        services.AddScoped<AdminAudit>();
        services.AddScoped<AdminAuthService>();
        services.AddScoped<AdminService>();
        services.AddSingleton<AdminStatusService>();
        services.AddScoped<IServiceStatusCheck, PowerSyncStatusCheck>();
        services.AddScoped<IServiceStatusCheck, MapTilesStatusCheck>();
        services.AddHttpClient(AdminStatusService.HttpClientName, http =>
            {
                http.Timeout = TimeSpan.FromSeconds(5);
                http.MaxResponseContentBufferSize = 256 * 1024;
                http.DefaultRequestHeaders.UserAgent.ParseAdd("TravelApp/1.0 (status check)");
            })
            .RemoveAllLoggers();

        services.AddAuthorizationBuilder().AddPolicy(AuthPolicy, p => p
            .AddAuthenticationSchemes(AuthSetup.AdminScheme)
            .RequireAuthenticatedUser());

        // The back office web app runs on its own address, so the browser needs CORS for /admin only.
        var origins = configuration.GetSection($"{AdminOptions.Section}:{nameof(AdminOptions.AllowedOrigins)}").Get<string[]>() ?? [];
        var dev = environment.IsDevelopment();
        services.AddCors(o => o.AddPolicy(CorsPolicy, p => p
            .SetIsOriginAllowed(origin => origins.Contains(origin, StringComparer.OrdinalIgnoreCase)
                || (dev && Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback))
            .WithHeaders("authorization", "content-type")
            .WithMethods("GET", "POST", "PUT", "DELETE")));

        services.AddRateLimiter(o => o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) })));
        return services;
    }
}
