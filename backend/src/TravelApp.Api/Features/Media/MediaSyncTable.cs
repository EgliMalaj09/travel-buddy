using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// Writes of photo records that come through the sync write endpoint (POST /sync/upload). Only the columns the phone
/// sent are changed (S4). Server-only columns (owner, file keys, size, upload time, sync fields) are never taken
/// from the phone: they are ignored, not refused, because PowerSync sends whole rows.
/// The record comes first; the phone then uploads the files to PUT /media/{id}/thumbnail and /file (D4).
/// </summary>
internal sealed class MediaSyncTable(AppDbContext db, MediaService service, TimeProvider clock) : ISyncTable
{
    public const string MediaTable = "media";

    private static readonly HashSet<string> ServerColumns =
        ["id", "owner_user_id", "file_key", "thumbnail_key", "size_bytes", "uploaded_at", "created_at", "updated_at", "deleted_at", "version"];

    private static readonly HashSet<string> MediaColumns =
    [
        "trip_id", "place_id", "media_type", "purpose", "scope", "source", "is_suggested", "caption", "taken_at", "lat", "lng",
        "country_code", "width", "height", "mime_type", "duration_sec", "content_hash", "quality_tier", "include_in_video", "sort_order",
    ];

    private static readonly string[] NewRecordNeeds =
        ["trip_id", "media_type", "purpose", "source", "width", "height", "mime_type", "content_hash"];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [MediaTable];

    public async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct)
    {
        var media = await db.Set<MediaItem>().FirstOrDefaultAsync(m => m.Id == write.Id, ct);
        if (media is not null && !await service.CanWriteAsync(write.UserId, media, ct))
        {
            // A photo of a deleted trip: deleting it again is fine, anything else is not found.
            return write.Op == SyncLimits.Delete && media.DeletedAt is not null && media.OwnerUserId == write.UserId
                ? Fine : Problem("id", "Not found.");
        }

        if (write.Op == SyncLimits.Delete)
        {
            if (media is null || media.DeletedAt is not null) return Fine;
            var at = clock.GetUtcNow();
            media.DeletedAt = at;
            media.UpdatedAt = at;
            media.Version += 1;
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (media?.DeletedAt is not null) return Problem("id", "This was deleted.");
        if (media is null && write.Op == SyncLimits.Patch) return Problem("id", "Not found.");
        var unknown = write.Data.Columns.Where(c => !MediaColumns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        if (unknown.Count > 0) return unknown.ToDictionary(c => c, _ => UnknownColumn);

        var isNew = media is null;
        media ??= new MediaItem { Id = write.Id, OwnerUserId = write.UserId, CreatedAt = clock.GetUtcNow() };
        var oldTripId = isNew ? null : media.TripId;
        var oldHash = isNew ? null : media.ContentHash;

        Read(write.Data, media);
        if (isNew)
        {
            foreach (var column in NewRecordNeeds)
            {
                if (!write.Data.Has(column)) write.Data.AddProblem(column, "A new photo needs this.");
            }
        }
        if (write.Data.Problems.Count > 0) return write.Data.Problems;

        var problems = MediaService.Check(media, oldTripId, oldHash);
        if (problems.Count > 0) return problems;
        if (!await service.CanWriteAsync(write.UserId, media, ct)) return Problem("trip_id", "Trip not found.");
        if (await service.IsDuplicateAsync(media, ct)) return Problem("content_hash", "This photo is already in the trip.");

        if (isNew)
        {
            media.Version = 0;
            db.Add(media);
        }

        media.UpdatedAt = clock.GetUtcNow();
        media.Version += 1;
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private static void Read(SyncData d, MediaItem m)
    {
        d.Uuid("trip_id", v => m.TripId = v);
        d.Uuid("place_id", v => m.PlaceId = v);
        d.Text("media_type", v => m.MediaType = v ?? "");
        d.Text("purpose", v => m.Purpose = v ?? "");
        d.Text("scope", v => m.Scope = v ?? MediaValues.Shared);
        d.Text("source", v => m.Source = v ?? "");
        d.Bool("is_suggested", v => m.IsSuggested = v ?? false);
        d.Text("caption", v => m.Caption = string.IsNullOrWhiteSpace(v) ? null : v.Trim());
        d.Timestamp("taken_at", v => m.TakenAt = v);
        d.Number("lat", v => m.Lat = v);
        d.Number("lng", v => m.Lng = v);
        d.Text("country_code", v => m.CountryCode = string.IsNullOrEmpty(v) ? null : v);
        d.WholeNumber("width", v => m.Width = v ?? 0);
        d.WholeNumber("height", v => m.Height = v ?? 0);
        d.Text("mime_type", v => m.MimeType = v ?? "");
        d.WholeNumber("duration_sec", v => m.DurationSec = v);
        d.Text("content_hash", v => m.ContentHash = v ?? "");
        d.Text("quality_tier", v => m.QualityTier = v ?? "");
        d.Bool("include_in_video", v => m.IncludeInVideo = v ?? true);
        d.WholeNumber("sort_order", v => m.SortOrder = v);
    }

    private static Dictionary<string, string[]> Problem(string column, string message) =>
        new Dictionary<string, string[]> { [column] = [message] };
}
