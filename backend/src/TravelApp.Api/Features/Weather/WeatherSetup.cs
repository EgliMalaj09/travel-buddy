using TravelApp.Api.Features.Admin;
using System.Threading.RateLimiting;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Weather;

/// <summary>Weather service, cache and the Open-Meteo client (configuration section "Weather").</summary>
public static class WeatherSetup
{
    public const string RateLimitPolicy = "weather";

    public static IServiceCollection AddWeatherFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<WeatherOptions>().Bind(configuration.GetSection(WeatherOptions.Section));
        services.AddScoped<WeatherService>();
        services.AddScoped<IServiceStatusCheck, WeatherStatusCheck>();
        var perMinute = configuration.GetValue<int?>(
            $"{WeatherOptions.Section}:{nameof(WeatherOptions.RequestsPerMinutePerUser)}") ?? 60;
        services.AddRateLimiter(o => o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) })));
        services.AddHttpClient<IWeatherProvider, OpenMeteoProvider>(http =>
            {
                http.Timeout = TimeSpan.FromSeconds(10);
                http.DefaultRequestHeaders.UserAgent.ParseAdd("TravelApp/1.0");
            })
            // GDPR core rule: the default HttpClient logs write the full address, which holds the position.
            .RemoveAllLoggers();
        return services;
    }
}
