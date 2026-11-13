using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Trips;

/// <summary>Trips in the back office (KAN-55): counts, and an account's trips without names, stops' cities or notes.</summary>
internal sealed class TripsAdmin(AppDbContext db) : IAdminMetrics, IAdminTrips
{
    public async Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct)
    {
        var trips = db.Set<Trip>().AsNoTracking().Where(t => t.DeletedAt == null);
        var since = now.AddDays(-30);
        var total = await trips.CountAsync(ct);
        var recent = await trips.CountAsync(t => t.CreatedAt >= since, ct);
        var finished = await trips.CountAsync(t => t.Status == TripValues.Finished, ct);
        return
        [
            new("trips", "Trips", total, $"{recent} in the last 30 days"),
            new("trips-finished", "Finished trips", finished),
        ];
    }

    public async Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct)
    {
        var count = await db.Set<Trip>().AsNoTracking().CountAsync(t => t.OwnerId == userId && t.DeletedAt == null, ct);
        return [new("trips", "Trips", count)];
    }

    async Task<IReadOnlyList<AdminTripDto>> IAdminTrips.ForUserAsync(Guid userId, int max, CancellationToken ct) =>
        await db.Set<Trip>().AsNoTracking().Where(t => t.OwnerId == userId)
            .OrderByDescending(t => t.CreatedAt).Take(max)
            .Select(t => new AdminTripDto(t.Id, t.Status, t.StartDate, t.EndDate,
                db.Set<TripStop>().Count(s => s.TripId == t.Id && s.DeletedAt == null), t.CreatedAt, t.DeletedAt))
            .ToListAsync(ct);
}
