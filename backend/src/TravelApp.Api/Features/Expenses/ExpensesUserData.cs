using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Expenses;

/// <summary>The user's expenses for "Download my data" (KAN-22). Erased by the cascade.</summary>
internal sealed class ExpensesUserData(AppDbContext db, ITripWriteRules trips) : IUserData
{
    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var tripIds = await trips.TripIdsOfOwnerAsync(userId, ct);
        var expenses = await db.Set<Expense>().AsNoTracking()
            .Where(e => e.CreatedByUserId == userId || tripIds.Contains(e.TripId))
            .OrderBy(e => e.CreatedAt).ToListAsync(ct);
        return new Dictionary<string, object> { ["expenses"] = expenses };
    }
}
