using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Places;

/// <summary>
/// A place: bucket list, planned or visited (data model 11, D1). One record follows a place from bucket list
/// to planned (it gets a trip) to visited. A repeat visit on another trip is a new record.
/// </summary>
internal sealed class Place : SyncEntity
{
    /// <summary>Empty only for bucket-list places.</summary>
    public Guid? TripId { get; set; }

    /// <summary>Set by the server: the user who added it.</summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>Set by the server, only when <see cref="Scope"/> is personal.</summary>
    public Guid? OwnerUserId { get; set; }

    public string Scope { get; set; } = PlaceValues.Shared;

    public string Status { get; set; } = PlaceValues.Planned;

    public string Title { get; set; } = "";

    public string? Note { get; set; }

    /// <summary>Empty until the place has a position. The app fills in the city of that trip day when it knows it.</summary>
    public double? Lat { get; set; }

    public double? Lng { get; set; }

    public string CountryCode { get; set; } = "";

    public string? CityName { get; set; }

    public string? Address { get; set; }

    public string? GeoProviderId { get; set; }

    public string Category { get; set; } = PlaceValues.Other;

    /// <summary>The trip day it is planned for; empty means "any day".</summary>
    public DateOnly? PlannedDate { get; set; }

    public DateTimeOffset? VisitedAt { get; set; }

    public string Source { get; set; } = PlaceValues.Manual;

    public bool IsSuggested { get; set; }

    public Guid? CoverMediaId { get; set; }

    public Guid? CopiedFromPlaceId { get; set; }
}
