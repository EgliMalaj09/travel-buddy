using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Checklist;

/// <summary>The checklist and packing items of the user's trips for "Download my data" (KAN-22). Erased by the cascade.</summary>
internal sealed class ChecklistUserData(AppDbContext db, ITripWriteRules trips) : IUserData
{
    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var tripIds = await trips.TripIdsOfOwnerAsync(userId, ct);
        var items = await db.Set<ChecklistItem>().AsNoTracking().Where(i => tripIds.Contains(i.TripId))
            .OrderBy(i => i.TripId).ThenBy(i => i.SortOrder).ToListAsync(ct);
        return new Dictionary<string, object> { ["checklistItems"] = items };
    }
}
