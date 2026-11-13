namespace TravelApp.Api.Features.Weather;

/// <summary>Weather service, cache and the Open-Meteo client (configuration section "Weather").</summary>
public static class WeatherSetup
{
    public static IServiceCollection AddWeatherFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<WeatherOptions>().Bind(configuration.GetSection(WeatherOptions.Section));
        services.AddScoped<WeatherService>();
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
