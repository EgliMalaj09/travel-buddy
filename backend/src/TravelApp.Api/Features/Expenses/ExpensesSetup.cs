using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Expenses;

/// <summary>
/// The phone writes expenses through the sync write endpoint (POST /sync/upload), which hands them to
/// <see cref="ExpensesSyncTable"/>. It reads them through PowerSync (stream "my_expenses"), or GET /expenses?tripId=.
/// </summary>
public static class ExpensesSetup
{
    public static IServiceCollection AddExpensesFeature(this IServiceCollection services)
    {
        services.AddScoped<ExpensesService>();
        services.AddScoped<ITripDeleteHook>(sp => sp.GetRequiredService<ExpensesService>());
        services.AddScoped<ISyncTable, ExpensesSyncTable>();
        return services;
    }
}
