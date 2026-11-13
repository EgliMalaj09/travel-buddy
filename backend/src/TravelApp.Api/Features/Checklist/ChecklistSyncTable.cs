using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Checklist;

/// <summary>
/// Writes of checklist items that come through the sync write endpoint (KAN-25).
/// Only the columns the phone sent are changed (S4: per field, last change wins). Server-only columns
/// (sync fields, done_by_user_id, owner_user_id) are never taken from the phone. Every write checks that
/// the user owns the trip (Trips' public contract, structure rule 2).
///
/// Auto items have an id made from the trip and the rule, so two phones that make the same checklist
/// write the same row instead of two copies. A deleted item stays deleted: a later PUT of it is refused.
/// </summary>
internal sealed class ChecklistSyncTable(AppDbContext db, ITripWriteRules trips, TimeProvider clock) : ISyncTable
{
    public const string ItemsTable = "checklist_items";

    /// <summary>Set by the server. The phone has them too (PowerSync sends whole rows), so they are ignored, not refused.</summary>
    private static readonly HashSet<string> ServerColumns =
        ["id", "created_at", "updated_at", "deleted_at", "version", "done_by_user_id", "owner_user_id"];

    private static readonly HashSet<string> ItemColumns =
    [
        "trip_id", "type", "title", "notes", "category", "done", "done_at", "due_date", "quantity",
        "reason", "source", "rule_id", "source_url", "source_checked_at", "sort_order",
    ];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [ItemsTable];

    public async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct)
    {
        var item = await db.Set<ChecklistItem>().FirstOrDefaultAsync(i => i.Id == write.Id, ct);
        if (item is not null && !await trips.OwnsTripAsync(write.UserId, item.TripId, ct)) return Problem("id", "Not found.");

        if (write.Op == SyncLimits.Delete)
        {
            if (item is null || item.DeletedAt is not null) return Fine;
            var at = clock.GetUtcNow();
            item.DeletedAt = at;
            item.UpdatedAt = at;
            item.Version += 1;
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (item?.DeletedAt is not null) return Problem("id", "This was deleted.");
        if (item is null && write.Op == SyncLimits.Patch) return Problem("id", "Not found.");
        var unknown = write.Data.Columns.Where(c => !ItemColumns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        if (unknown.Count > 0) return unknown.ToDictionary(c => c, _ => UnknownColumn);

        var isNew = item is null;
        if (item is null)
        {
            item = new ChecklistItem { Id = write.Id, CreatedAt = clock.GetUtcNow(), Version = 0 };
            db.Add(item);
        }
        var oldTripId = item.TripId;
        var wasDone = item.Done;

        var d = write.Data;
        d.Uuid("trip_id", v => item.TripId = v ?? Guid.Empty);
        d.Text("type", v => item.Type = v ?? "");
        d.Text("title", v => item.Title = v?.Trim() ?? "");
        d.Text("notes", v => item.Notes = string.IsNullOrWhiteSpace(v) ? null : v.Trim());
        d.Text("category", v => item.Category = v ?? "");
        d.Bool("done", v =>
        {
            if (v is { } b) item.Done = b;
            else d.AddProblem("done", "Must be true or false.");
        });
        d.Timestamp("done_at", v => item.DoneAt = v);
        d.Date("due_date", v => item.DueDate = v);
        d.WholeNumber("quantity", v => item.Quantity = v);
        d.Text("reason", v => item.Reason = v ?? "");
        d.Text("source", v => item.Source = v ?? "");
        d.Text("rule_id", v => item.RuleId = string.IsNullOrWhiteSpace(v) ? null : v.Trim());
        d.Text("source_url", v => item.SourceUrl = string.IsNullOrWhiteSpace(v) ? null : v.Trim());
        d.Date("source_checked_at", v => item.SourceCheckedAt = v);
        d.WholeNumber("sort_order", v =>
        {
            if (v is { } i) item.SortOrder = i;
            else d.AddProblem("sort_order", "Must be a whole number.");
        });
        if (isNew && !d.Has("trip_id")) d.AddProblem("trip_id", "A new item needs its trip.");
        if (d.Problems.Count > 0) return d.Problems;
        if (!isNew && oldTripId != item.TripId) return Problem("trip_id", "An item cannot move to another trip.");

        var problems = Check(item);
        if (problems.Count > 0) return problems;
        if (!await trips.OwnsTripAsync(write.UserId, item.TripId, ct)) return Problem("trip_id", "Trip not found.");

        // Who ticked it is the person who sent the change (shown as "done by" in shared trips).
        if (item.Done && (!wasDone || item.DoneByUserId is null)) item.DoneByUserId = write.UserId;
        if (!item.Done)
        {
            item.DoneByUserId = null;
            item.DoneAt = null;
        }
        else item.DoneAt ??= clock.GetUtcNow();

        item.UpdatedAt = clock.GetUtcNow();
        item.Version += 1;
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private static Dictionary<string, string[]> Problem(string column, string message) =>
        new() { [column] = [message] };

    /// <summary>The item's rules (data model 10). Problems per column.</summary>
    internal static Dictionary<string, string[]> Check(ChecklistItem item)
    {
        var problems = new Dictionary<string, string[]>();
        void Add(string column, string message) => problems[column] = [message];

        if (!ChecklistValues.Types.Contains(item.Type)) Add("type", "Must be task or packing.");
        else
        {
            var categories = item.Type == ChecklistValues.Task ? ChecklistValues.TaskCategories : ChecklistValues.PackingCategories;
            if (!categories.Contains(item.Category)) Add("category", $"Must be one of: {string.Join(", ", categories)}.");
        }
        if (item.Title.Length == 0) Add("title", "Give the item a name.");
        else if (item.Title.Length > ChecklistValues.TitleMax) Add("title", $"Up to {ChecklistValues.TitleMax} characters.");
        if (item.Notes?.Length > ChecklistValues.NotesMax) Add("notes", $"Up to {ChecklistValues.NotesMax} characters.");
        if (!ChecklistValues.Reasons.Contains(item.Reason)) Add("reason", "Must be rule, weather, activity or user.");
        if (!ChecklistValues.Sources.Contains(item.Source)) Add("source", "Must be auto or user.");
        if (item.Source == ChecklistValues.AutoSource && item.RuleId is null) Add("rule_id", "An auto item needs its rule.");
        if (item.RuleId?.Length > ChecklistValues.RuleIdMax) Add("rule_id", $"Up to {ChecklistValues.RuleIdMax} characters.");
        if (item.SourceUrl is { } url && (url.Length > ChecklistValues.SourceUrlMax
            || !Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps))
            Add("source_url", "Must be an https link.");
        if (item.Quantity is { } q)
        {
            if (item.Type != ChecklistValues.Packing) Add("quantity", "Only packing items have a quantity.");
            else if (q < 1 || q > ChecklistValues.QuantityMax) Add("quantity", $"From 1 to {ChecklistValues.QuantityMax}.");
        }
        return problems;
    }
}
