namespace TravelApp.Api.Features.Checklist;

/// <summary>Allowed values and limits, exactly as in decisions/data-model.md section 10 (the phone sends these strings).</summary>
public static class ChecklistValues
{
    public const string Task = "task";
    public const string Packing = "packing";
    public const string OtherCategory = "other";
    public const string UserReason = "user";
    public const string AutoSource = "auto";
    public const string UserSource = "user";

    public static readonly IReadOnlyList<string> Types = [Task, Packing];
    public static readonly IReadOnlyList<string> TaskCategories = ["documents", "money", "health", "phone", "transport", "stay", OtherCategory];
    public static readonly IReadOnlyList<string> PackingCategories = ["clothes", "toiletries", "tech", "documents", OtherCategory];
    public static readonly IReadOnlyList<string> Reasons = ["rule", "weather", "activity", UserReason];
    public static readonly IReadOnlyList<string> Sources = [AutoSource, UserSource];

    public const int TitleMax = 120;
    public const int NotesMax = 1000;
    public const int RuleIdMax = 60;
    public const int SourceUrlMax = 500;
    public const int QuantityMax = 99;
}
