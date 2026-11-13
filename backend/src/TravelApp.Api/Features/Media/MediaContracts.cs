namespace TravelApp.Api.Features.Media;

/// <summary>A photo record as the API returns it (all columns, field names as in the data model).</summary>
public sealed record MediaDto(
    Guid Id,
    Guid OwnerUserId,
    Guid? TripId,
    Guid? PlaceId,
    string MediaType,
    string Purpose,
    string Scope,
    string Source,
    bool IsSuggested,
    string? Caption,
    DateTimeOffset? TakenAt,
    double? Lat,
    double? Lng,
    string? CountryCode,
    int Width,
    int Height,
    string MimeType,
    int? DurationSec,
    string ContentHash,
    string QualityTier,
    string? FileKey,
    string? ThumbnailKey,
    long? SizeBytes,
    DateTimeOffset? UploadedAt,
    bool IncludeInVideo,
    int? SortOrder,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

/// <summary>The photos of one trip that are not deleted, newest first (by taken time, else by added time).</summary>
public sealed record TripMediaResponse(IReadOnlyList<MediaDto> Media);
