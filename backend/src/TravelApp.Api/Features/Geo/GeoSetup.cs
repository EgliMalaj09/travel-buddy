using TravelApp.Api.Features.Admin;
using System.Threading.RateLimiting;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Geo;

/// <summary>Place search for the map: the Photon client (configuration section "Geo").</summary>
public static class GeoSetup
{
    public const string RateLimitPolicy = "geo";

    public static IServiceCollection AddGeoFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<GeoOptions>().Bind(configuration.GetSection(GeoOptions.Section));
        services.AddScoped<IServiceStatusCheck, GeoStatusCheck>();
        var perMinute = configuration.GetValue<int?>(
            $"{GeoOptions.Section}:{nameof(GeoOptions.RequestsPerMinutePerUser)}") ?? 30;
        services.AddRateLimiter(o => o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) })));
        services.AddHttpClient<IGeoProvider, PhotonProvider>(http =>
            {
                http.Timeout = TimeSpan.FromSeconds(8);
                // Twelve results are a few kilobytes; never read a huge answer into memory.
                http.MaxResponseContentBufferSize = 1024 * 1024;
                // Photon's fair-use rules ask for an app name. No contact details (they would be personal data).
                http.DefaultRequestHeaders.UserAgent.ParseAdd("TravelApp/1.0");
            })
            // GDPR core rule: the default HttpClient logs write the full address, which holds the search text and position.
            .RemoveAllLoggers();
        return services;
    }
}
