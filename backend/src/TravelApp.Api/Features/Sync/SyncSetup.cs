namespace TravelApp.Api.Features.Sync;

public static class SyncSetup
{
    /// <summary>Features with synced tables register their <see cref="ISyncTable"/> in their own Add…Feature.</summary>
    public static IServiceCollection AddSyncFeature(this IServiceCollection services)
    {
        services.AddScoped<SyncService>();
        return services;
    }
}
