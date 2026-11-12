using TravelApp.Api.Features.Sync;

namespace TravelApp.Api.Features.Trips;

/// <summary>
/// The phone writes trips, stops and flights through the sync write endpoint (POST /sync/upload, KAN-16),
/// which hands them to <see cref="TripsSyncTable"/>. It reads them through PowerSync, or GET /trips for now.
/// </summary>
public static class TripsSetup
{
    public static IServiceCollection AddTripsFeature(this IServiceCollection services)
    {
        services.AddScoped<TripsService>();
        services.AddScoped<ITripWriteRules>(sp => sp.GetRequiredService<TripsService>());
        services.AddScoped<ISyncTable, TripsSyncTable>();
        return services;
    }
}
