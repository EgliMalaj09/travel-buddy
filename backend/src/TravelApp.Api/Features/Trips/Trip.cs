using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Trips;

/// <summary>A trip (decisions/data-model.md, section 7). Created on the phone, synced.</summary>
internal sealed class Trip : SyncEntity
{
    public Guid OwnerId { get; set; }

    public string Name { get; set; } = "";

    /// <summary>solo or shared (<see cref="TripValues.Types"/>).</summary>
    public string Type { get; set; } = TripValues.Solo;

    /// <summary>Empty for "Someday" trips (T4).</summary>
    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    /// <summary>beach, city, … (<see cref="TripValues.Activities"/>).</summary>
    public List<string> Activities { get; set; } = [];

    /// <summary>planned or finished. "Now" is computed from the dates, never stored.</summary>
    public string Status { get; set; } = TripValues.Planned;

    public DateTimeOffset? FinishedAt { get; set; }

    public Guid? CoverMediaId { get; set; }

    /// <summary>ISO country, copied from the user when the trip is created.</summary>
    public string PassportCountrySnapshot { get; set; } = "";

    /// <summary>ISO currency, copied from the user when the trip is created.</summary>
    public string HomeCurrencySnapshot { get; set; } = "";

    public DateTimeOffset? ChecklistGeneratedAt { get; set; }

    public string? ChecklistRulesVersion { get; set; }

    public bool AnniversaryEnabled { get; set; } = true;
}
