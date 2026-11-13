using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// Writes of the settings row through POST /sync/upload (type "user_settings"). The row id must be the user's own id,
/// so nobody can write another user's settings. PUT creates or replaces it, PATCH changes the columns sent (S4),
/// DELETE is refused: settings exist as long as the account does and go with it.
/// </summary>
internal sealed partial class UserSettingsSyncTable(AppDbContext db, TimeProvider clock) : ISyncTable
{
    private static readonly HashSet<string> ServerColumns = ["id", "created_at", "updated_at", "deleted_at", "version"];

    private static readonly HashSet<string> Columns =
    [
        "reminders_enabled", "remind_checklist", "remind_pack_tonight", "remind_flight", "remind_anniversary",
        "reminder_time", "quiet_hours_start", "quiet_hours_end", "distance_unit", "temperature_unit", "default_place_scope",
    ];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [UserSettingsValues.Table];

    public async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct)
    {
        if (write.Id != write.UserId) return Problem("id", "The settings row id must be your user id.");
        if (write.Op == SyncLimits.Delete) return Problem("id", "Settings cannot be deleted; they go with the account.");

        var unknown = write.Data.Columns.Where(c => !Columns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        if (unknown.Count > 0) return unknown.ToDictionary(c => c, _ => UnknownColumn);

        var now = clock.GetUtcNow();
        var row = await db.Set<UserSettings>().FirstOrDefaultAsync(s => s.Id == write.UserId, ct);
        if (row is null)
        {
            // A PATCH before the first PUT (two phones at once) still works: the missing columns keep their defaults.
            row = new UserSettings { Id = write.UserId, CreatedAt = now, Version = 0 };
            db.Add(row);
        }

        var d = write.Data;
        Flag(d, "reminders_enabled", v => row.RemindersEnabled = v);
        Flag(d, "remind_checklist", v => row.RemindChecklist = v);
        Flag(d, "remind_pack_tonight", v => row.RemindPackTonight = v);
        Flag(d, "remind_flight", v => row.RemindFlight = v);
        Flag(d, "remind_anniversary", v => row.RemindAnniversary = v);
        Time(d, "reminder_time", v => row.ReminderTime = v);
        Time(d, "quiet_hours_start", v => row.QuietHoursStart = v);
        Time(d, "quiet_hours_end", v => row.QuietHoursEnd = v);
        OneOf(d, "distance_unit", UserSettingsValues.DistanceUnits, v => row.DistanceUnit = v);
        OneOf(d, "temperature_unit", UserSettingsValues.TemperatureUnits, v => row.TemperatureUnit = v);
        OneOf(d, "default_place_scope", UserSettingsValues.PlaceScopes, v => row.DefaultPlaceScope = v);
        if (d.Problems.Count > 0)
        {
            db.ChangeTracker.Clear();
            return d.Problems;
        }

        row.UpdatedAt = now;
        row.Version += 1;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException) when (db.Entry(row).State == EntityState.Added)
        {
            // Two phones made the row at the same moment: the other one won; this change is sent again as an update.
            db.ChangeTracker.Clear();
            return await ApplyAsync(write with { Op = SyncLimits.Patch }, ct);
        }
        return Fine;
    }

    private static void Flag(SyncData d, string column, Action<bool> set) => d.Bool(column, v =>
    {
        if (v is { } b) set(b);
        else d.AddProblem(column, "Must be true or false.");
    });

    private static void Time(SyncData d, string column, Action<string> set) => d.Text(column, v =>
    {
        if (v is not null && TimeRegex().IsMatch(v)) set(v);
        else d.AddProblem(column, "Must be a time like 19:00.");
    });

    private static void OneOf(SyncData d, string column, string[] allowed, Action<string> set) => d.Text(column, v =>
    {
        if (v is not null && allowed.Contains(v)) set(v);
        else d.AddProblem(column, $"Must be one of: {string.Join(", ", allowed)}.");
    });

    private static Dictionary<string, string[]> Problem(string column, string message) => new() { [column] = [message] };

    [GeneratedRegex(UserSettingsValues.TimePattern)]
    private static partial Regex TimeRegex();
}
