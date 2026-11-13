using TravelApp.Api.Features.Admin;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Checklist;

/// <summary>
/// The phone writes checklist items through the sync write endpoint (POST /sync/upload), which hands them to
/// <see cref="ChecklistSyncTable"/>. It reads them through PowerSync (stream "my_checklist_items").
/// The checklist itself is made on the phone from the rule file, so it works offline (KAN-24, KAN-25).
/// </summary>
public static class ChecklistSetup
{
    public static IServiceCollection AddChecklistFeature(this IServiceCollection services)
    {
        services.AddScoped<ISyncTable, ChecklistSyncTable>();
        services.AddScoped<IUserData, ChecklistUserData>();
        services.AddScoped<IAdminMetrics, ChecklistAdminMetrics>();
        services.AddScoped<ITripDeleteHook, ChecklistTripDeleteHook>();
        return services;
    }
}
