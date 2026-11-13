namespace TravelApp.Api.Features.Expenses;

/// <summary>Allowed values and limits, exactly as in decisions/data-model.md section 13 (the phone sends these strings).</summary>
public static class ExpenseValues
{
    public const string Shared = "shared";
    public const string Personal = "personal";
    public const string Other = "other";

    public static readonly IReadOnlyList<string> Scopes = [Shared, Personal];
    public static readonly IReadOnlyList<string> Categories = ["food", "transport", "stay", "activities", "shopping", Other];

    public const int TitleMax = 80;
    public const int NoteMax = 2000;

    /// <summary>Upper limit for one amount in minor units (10 000 000 000.00 in a 2-decimal currency): catches typing errors and overflow.</summary>
    public const long AmountMinorMax = 1_000_000_000_000;

    /// <summary>
    /// How far <c>fx_rate_date</c> may be from the UTC day of <c>spent_at</c>. The phone sends its local date, which
    /// is up to 14 hours ahead of or behind UTC.
    /// </summary>
    public const int FxDateSlackDays = 1;
}
