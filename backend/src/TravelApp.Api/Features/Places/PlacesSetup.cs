using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Places;

/// <summary>
/// The phone writes places through the sync write endpoint (POST /sync/upload), which hands them to
/// <see cref="PlacesSyncTable"/>. It reads them through PowerSync (stream "my_places"), or GET /places?tripId=.
/// </summary>
public static class PlacesSetup
{
    public static IServiceCollection AddPlacesFeature(this IServiceCollection services)
    {
        services.AddScoped<PlacesService>();
        services.AddScoped<ITripDeleteHook>(sp => sp.GetRequiredService<PlacesService>());
        services.AddScoped<ISyncTable, PlacesSyncTable>();
        return services;
    }
}
