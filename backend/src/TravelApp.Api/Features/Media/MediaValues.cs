namespace TravelApp.Api.Features.Media;

/// <summary>Allowed values and limits, as in decisions/data-model.md section 12 (the phone sends these strings).</summary>
public static class MediaValues
{
    public const string Photo = "photo";
    public const string TripPhoto = "trip_photo";
    public const string Shared = "shared";
    public const string Personal = "personal";
    public const string Jpeg = "image/jpeg";
    public const string Compressed = "compressed";
    public const string Full = "full";

    public static readonly IReadOnlyList<string> Scopes = [Shared, Personal];

    /// <summary>"autocapture" exists in the data model but is not accepted yet.</summary>
    public static readonly IReadOnlyList<string> Sources = ["camera", "library"];

    public static readonly IReadOnlyList<string> QualityTiers = [Compressed, Full];

    public const int CaptionMax = 2000;
    public const int SideMax = 20000;

    /// <summary>Largest full image the API takes (after the phone compressed it).</summary>
    public const long FileBytesMax = 15L * 1024 * 1024;

    /// <summary>Largest thumbnail the API takes.</summary>
    public const long ThumbnailBytesMax = 1L * 1024 * 1024;

    /// <summary>Blob keys are opaque: only the media id, never user ids, names or anything personal.</summary>
    public static string FileKey(Guid mediaId) => $"{mediaId:D}/full.jpg";

    public static string ThumbnailKey(Guid mediaId) => $"{mediaId:D}/thumb.jpg";
}
