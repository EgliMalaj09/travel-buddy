using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Expenses;

/// <summary>
/// One expense on a trip (data model 13, D5, D7, D8). The amount is kept in the currency it was paid in, in minor
/// units (1250 = 12.50 EUR). The amount in someone's home currency is never stored: each person's app works it out
/// from the daily rate of <see cref="FxRateDate"/> (FxRate table).
/// </summary>
internal sealed class Expense : SyncEntity
{
    public Guid TripId { get; set; }

    /// <summary>Set by the server: the user who added it.</summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>Set by the server. Part 1 trips are solo, so it is always the creator (splitting is D6, Part 2).</summary>
    public Guid PaidByUserId { get; set; }

    public string Scope { get; set; } = ExpenseValues.Shared;

    /// <summary>Set by the server, only when <see cref="Scope"/> is personal (D7).</summary>
    public Guid? OwnerUserId { get; set; }

    public string Title { get; set; } = "";

    public string Category { get; set; } = ExpenseValues.Other;

    /// <summary>In <see cref="Currency"/>, minor units. Always more than 0.</summary>
    public long AmountMinor { get; set; }

    /// <summary>ISO 4217, chosen by the user (default: the local currency of that day's stop).</summary>
    public string Currency { get; set; } = "";

    public DateTimeOffset SpentAt { get; set; }

    /// <summary>The day of <see cref="SpentAt"/> on the phone (local date). Decides which daily rate is used.</summary>
    public DateOnly FxRateDate { get; set; }

    /// <summary>Linking an expense to a place comes later; always empty for now.</summary>
    public Guid? PlaceId { get; set; }

    public string? Note { get; set; }
}
