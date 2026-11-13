using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;

namespace TravelApp.Api.Features.Trips;

/// <summary>The user's trips, stops and flights for "Download my data" (KAN-22). They are erased by the cascade from the user row.</summary>
internal sealed class TripsUserData(AppDbContext db) : IUserData
{
    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var trips = await db.Set<Trip>().AsNoTracking().Where(t => t.OwnerId == userId).OrderBy(t => t.CreatedAt).ToListAsync(ct);
        var ids = trips.Select(t => t.Id).ToList();
        var stops = await db.Set<TripStop>().AsNoTracking().Where(s => ids.Contains(s.TripId))
            .OrderBy(s => s.TripId).ThenBy(s => s.Order).ToListAsync(ct);
        var flights = await db.Set<Flight>().AsNoTracking().Where(f => ids.Contains(f.TripId))
            .OrderBy(f => f.TripId).ThenBy(f => f.Order).ToListAsync(ct);
        return new Dictionary<string, object> { ["trips"] = trips, ["tripStops"] = stops, ["flights"] = flights };
    }
}
