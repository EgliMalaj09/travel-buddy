using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Checklist;

/// <summary>Checklist counts for the back office (KAN-55).</summary>
internal sealed class ChecklistAdminMetrics(AppDbContext db) : IAdminMetrics
{
    public async Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct)
    {
        var items = db.Set<ChecklistItem>().AsNoTracking().Where(i => i.DeletedAt == null);
        var total = await items.CountAsync(ct);
        var done = await items.CountAsync(i => i.Done, ct);
        return [new("checklist", "Checklist items", total, $"{done} done")];
    }

    public Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<AdminMetric>>([]);
}
