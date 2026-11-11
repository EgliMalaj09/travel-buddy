namespace TravelApp.Api.Features.Trips;

/// <summary>
/// Trips has no endpoints of its own: the phone writes trips, stops and flights through the
/// sync write endpoint (KAN-16), which calls <see cref="ITripWriteRules"/>, and reads them through PowerSync.
/// </summary>
public static class TripsSetup
{
    public static IServiceCollection AddTripsFeature(this IServiceCollection services)
    {
        services.AddScoped<ITripWriteRules, TripsService>();
        return services;
    }
}
