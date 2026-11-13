using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Checklist;

/// <summary>A deleted trip takes its checklist with it (soft delete, so phones see it), like Places.</summary>
internal sealed class ChecklistTripDeleteHook(AppDbContext db) : ITripDeleteHook
{
    public Task TripDeletedAsync(Guid tripId, DateTimeOffset at, CancellationToken ct) =>
        db.Set<ChecklistItem>().Where(i => i.TripId == tripId && i.DeletedAt == null)
            .ExecuteUpdateAsync(u => u.SetProperty(i => i.DeletedAt, at).SetProperty(i => i.UpdatedAt, at).SetProperty(i => i.Version, i => i.Version + 1), ct);
}
