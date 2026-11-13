using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// One photo of a trip with its note (data model section 12, KAN-40). The record syncs like every other row; the
/// image itself lives in Blob Storage under opaque keys (<see cref="MediaValues.FileKey"/>), never in the database.
/// Called MediaItem in code so it does not clash with the feature's namespace; the table is "media".
/// </summary>
internal sealed class MediaItem : SyncEntity
{
    /// <summary>Set by the server: the user who added it.</summary>
    public Guid OwnerUserId { get; set; }

    /// <summary>Required for a trip photo (the only purpose for now). Avatars (KAN-22) will have no trip.</summary>
    public Guid? TripId { get; set; }

    /// <summary>Linking a photo to a place comes later; always empty for now.</summary>
    public Guid? PlaceId { get; set; }

    public string MediaType { get; set; } = MediaValues.Photo;

    public string Purpose { get; set; } = MediaValues.TripPhoto;

    public string Scope { get; set; } = MediaValues.Shared;

    public string Source { get; set; } = "";

    public bool IsSuggested { get; set; }

    /// <summary>The user's note on the photo.</summary>
    public string? Caption { get; set; }

    public DateTimeOffset? TakenAt { get; set; }

    public double? Lat { get; set; }

    public double? Lng { get; set; }

    public string? CountryCode { get; set; }

    public int Width { get; set; }

    public int Height { get; set; }

    public string MimeType { get; set; } = MediaValues.Jpeg;

    /// <summary>Videos are not accepted (D16), so always empty.</summary>
    public int? DurationSec { get; set; }

    /// <summary>SHA-256 of the photo on the phone, 64 lowercase hex characters. Stops the same photo being added twice.</summary>
    public string ContentHash { get; set; } = "";

    public string QualityTier { get; set; } = MediaValues.Compressed;

    /// <summary>Set by the server when the full image is stored.</summary>
    public string? FileKey { get; set; }

    /// <summary>Set by the server when the thumbnail is stored.</summary>
    public string? ThumbnailKey { get; set; }

    /// <summary>Set by the server: size of the stored full image (after metadata was removed).</summary>
    public long? SizeBytes { get; set; }

    /// <summary>Set by the server when the full image is stored.</summary>
    public DateTimeOffset? UploadedAt { get; set; }

    public bool IncludeInVideo { get; set; } = true;

    public int? SortOrder { get; set; }
}
