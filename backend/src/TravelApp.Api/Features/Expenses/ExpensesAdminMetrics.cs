using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Expenses;

/// <summary>Expense counts for the back office (KAN-55). Never amounts or notes.</summary>
internal sealed class ExpensesAdminMetrics(AppDbContext db) : IAdminMetrics
{
    public async Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct) =>
        [new("expenses", "Expenses", await db.Set<Expense>().AsNoTracking().CountAsync(e => e.DeletedAt == null, ct))];

    public async Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct) =>
        [new("expenses", "Expenses", await db.Set<Expense>().AsNoTracking().CountAsync(e => e.CreatedByUserId == userId && e.DeletedAt == null, ct))];
}
