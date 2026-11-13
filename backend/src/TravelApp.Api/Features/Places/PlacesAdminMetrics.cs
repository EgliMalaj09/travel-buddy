using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Places;

/// <summary>Place counts for the back office (KAN-55). Never names or positions.</summary>
internal sealed class PlacesAdminMetrics(AppDbContext db) : IAdminMetrics
{
    public async Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct) =>
        [new("places", "Places", await db.Set<Place>().AsNoTracking().CountAsync(p => p.DeletedAt == null, ct))];

    public async Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct) =>
        [new("places", "Places", await db.Set<Place>().AsNoTracking().CountAsync(p => p.CreatedByUserId == userId && p.DeletedAt == null, ct))];
}
