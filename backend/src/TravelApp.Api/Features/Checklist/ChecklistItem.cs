using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Checklist;

/// <summary>One checklist line of a trip: a task ("check your passport") or a packing item (data model 10).</summary>
internal sealed class ChecklistItem : SyncEntity
{
    public Guid TripId { get; set; }

    /// <summary>task or packing (<see cref="ChecklistValues.Types"/>).</summary>
    public string Type { get; set; } = ChecklistValues.Task;

    public string Title { get; set; } = "";

    public string? Notes { get; set; }

    /// <summary>Depends on the type, see <see cref="ChecklistValues.TaskCategories"/> and <see cref="ChecklistValues.PackingCategories"/>.</summary>
    public string Category { get; set; } = ChecklistValues.OtherCategory;

    /// <summary>Done (task) or packed (packing).</summary>
    public bool Done { get; set; }

    public DateTimeOffset? DoneAt { get; set; }

    /// <summary>Set by the server: who ticked it (shown in shared trips, Part 2).</summary>
    public Guid? DoneByUserId { get; set; }

    public DateOnly? DueDate { get; set; }

    /// <summary>Packing only.</summary>
    public int? Quantity { get; set; }

    /// <summary>Why it is on the list: rule, weather, activity or user.</summary>
    public string Reason { get; set; } = ChecklistValues.UserReason;

    /// <summary>auto (made from the rules) or user (added by hand).</summary>
    public string Source { get; set; } = ChecklistValues.UserSource;

    /// <summary>The rule that made an auto item, so the same item does not come back after it was deleted.</summary>
    public string? RuleId { get; set; }

    /// <summary>Entry-rule items: where to check (official source) and when the rule was last checked.</summary>
    public string? SourceUrl { get; set; }

    public DateOnly? SourceCheckedAt { get; set; }

    /// <summary>Only for personal packing items in shared trips (Part 2). Set by the server.</summary>
    public Guid? OwnerUserId { get; set; }

    public int SortOrder { get; set; }
}
