using System.Threading.RateLimiting;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Fx;

/// <summary>Exchange rates: service, cache and the Currency API client (configuration section "Fx").</summary>
public static class FxSetup
{
    public const string RateLimitPolicy = "fx";

    public static IServiceCollection AddFxFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<FxOptions>().Bind(configuration.GetSection(FxOptions.Section));
        services.AddScoped<FxService>();
        services.AddSingleton<FxFailures>();
        var perMinute = configuration.GetValue<int?>($"{FxOptions.Section}:{nameof(FxOptions.RequestsPerMinutePerUser)}") ?? 60;
        services.AddRateLimiter(o => o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) })));
        services.AddHttpClient<IFxProvider, FreeCurrencyApiProvider>(http =>
            {
                http.Timeout = TimeSpan.FromSeconds(10);
                http.DefaultRequestHeaders.UserAgent.ParseAdd("TravelApp/1.0");
            })
            // GDPR core rule: keep request addresses out of the logs (they hold the day of an expense).
            .RemoveAllLoggers();
        return services;
    }
}
