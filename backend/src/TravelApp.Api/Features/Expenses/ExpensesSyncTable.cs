using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;

namespace TravelApp.Api.Features.Expenses;

/// <summary>
/// Writes of expenses that come through the sync write endpoint (POST /sync/upload). Only the columns the phone
/// sent are changed (S4: per field, last change wins). Server-only columns are never taken from the phone:
/// the server sets who created and paid the expense, and the owner of a personal expense.
/// </summary>
internal sealed class ExpensesSyncTable(AppDbContext db, ExpensesService service, TimeProvider clock) : ISyncTable
{
    public const string ExpensesTable = "expenses";

    /// <summary>Set by the server. The phone has them too (PowerSync sends whole rows), so they are ignored, not refused.</summary>
    private static readonly HashSet<string> ServerColumns =
        ["id", "created_by_user_id", "paid_by_user_id", "owner_user_id", "created_at", "updated_at", "deleted_at", "version"];

    private static readonly HashSet<string> ExpenseColumns =
        ["trip_id", "scope", "title", "category", "amount_minor", "currency", "spent_at", "fx_rate_date", "place_id", "note"];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [ExpensesTable];

    public async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct)
    {
        var expense = await db.Set<Expense>().FirstOrDefaultAsync(e => e.Id == write.Id, ct);
        if (expense is not null && !await service.CanWriteAsync(write.UserId, expense, ct))
        {
            // An expense of a deleted trip: deleting it again is fine, anything else is not found.
            return write.Op == SyncLimits.Delete && expense.DeletedAt is not null ? Fine : Problem("id", "Not found.");
        }

        if (write.Op == SyncLimits.Delete)
        {
            if (expense is null || expense.DeletedAt is not null) return Fine;
            var at = clock.GetUtcNow();
            expense.DeletedAt = at;
            expense.UpdatedAt = at;
            expense.Version += 1;
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (expense?.DeletedAt is not null) return Problem("id", "This was deleted.");
        if (expense is null && write.Op == SyncLimits.Patch) return Problem("id", "Not found.");
        var unknown = write.Data.Columns.Where(c => !ExpenseColumns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        if (unknown.Count > 0) return unknown.ToDictionary(c => c, _ => UnknownColumn);

        var isNew = expense is null;
        expense ??= new Expense
        {
            Id = write.Id, CreatedByUserId = write.UserId, PaidByUserId = write.UserId, CreatedAt = clock.GetUtcNow(),
        };
        var oldTripId = expense.TripId;

        var d = write.Data;
        d.Uuid("trip_id", v => expense.TripId = v ?? Guid.Empty);
        d.Text("scope", v => expense.Scope = v ?? "");
        d.Text("title", v => expense.Title = v?.Trim() ?? "");
        d.Text("category", v => expense.Category = v ?? "");
        d.LongNumber("amount_minor", v => expense.AmountMinor = v ?? 0);
        d.Text("currency", v => expense.Currency = v ?? "");
        d.Timestamp("spent_at", v => expense.SpentAt = v ?? default);
        d.Date("fx_rate_date", v => expense.FxRateDate = v ?? default);
        d.Uuid("place_id", v => expense.PlaceId = v);
        d.Text("note", v => expense.Note = string.IsNullOrWhiteSpace(v) ? null : v.Trim());
        if (isNew)
        {
            foreach (var column in (string[])["trip_id", "title", "amount_minor", "currency", "spent_at", "fx_rate_date"])
            {
                if (!d.Has(column)) d.AddProblem(column, "A new expense needs this.");
            }
        }

        if (d.Problems.Count > 0) return d.Problems;

        expense.OwnerUserId = expense.Scope == ExpenseValues.Personal ? expense.OwnerUserId ?? write.UserId : null;
        var problems = ExpensesService.Check(expense, isNew ? null : oldTripId, isNew);
        if (problems.Count > 0) return problems;
        if (!await service.CanWriteAsync(write.UserId, expense, ct)) return Problem("trip_id", "Trip not found.");

        if (isNew)
        {
            expense.Version = 0;
            db.Add(expense);
        }

        expense.UpdatedAt = clock.GetUtcNow();
        expense.Version += 1;
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private static Dictionary<string, string[]> Problem(string column, string message) =>
        new Dictionary<string, string[]> { [column] = [message] };
}
