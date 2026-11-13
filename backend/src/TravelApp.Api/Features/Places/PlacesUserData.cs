using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Places;

/// <summary>The user's places (bucket list and trip places) for "Download my data" (KAN-22). Erased by the cascade.</summary>
internal sealed class PlacesUserData(AppDbContext db, ITripWriteRules trips) : IUserData
{
    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var tripIds = await trips.TripIdsOfOwnerAsync(userId, ct);
        var places = await db.Set<Place>().AsNoTracking()
            .Where(p => p.CreatedByUserId == userId || (p.TripId != null && tripIds.Contains(p.TripId.Value)))
            .OrderBy(p => p.CreatedAt).ToListAsync(ct);
        return new Dictionary<string, object> { ["places"] = places };
    }
}
