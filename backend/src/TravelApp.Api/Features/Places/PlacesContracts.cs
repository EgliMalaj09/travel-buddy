namespace TravelApp.Api.Features.Places;

/// <summary>A place as the API returns it (field names as in the data model).</summary>
public sealed record PlaceDto(
    Guid Id,
    Guid? TripId,
    Guid CreatedByUserId,
    Guid? OwnerUserId,
    string Scope,
    string Status,
    string Title,
    string? Note,
    double? Lat,
    double? Lng,
    string CountryCode,
    string? CityName,
    string? Address,
    string? GeoProviderId,
    string Category,
    DateOnly? PlannedDate,
    DateTimeOffset? VisitedAt,
    string Source,
    bool IsSuggested,
    Guid? CoverMediaId,
    Guid? CopiedFromPlaceId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

/// <summary>The places of one trip that are not deleted: by planned day ("any day" last), then in the order they were added.</summary>
public sealed record TripPlacesResponse(IReadOnlyList<PlaceDto> Places);
