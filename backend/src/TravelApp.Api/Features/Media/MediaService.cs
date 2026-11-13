using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Media;

/// <summary>The result of storing a part of a photo, turned into a status code by the endpoint.</summary>
internal enum UploadOutcome
{
    Stored,
    NotFound,
    NotJpeg,
    TooLarge,
    StorageUnavailable,
}

/// <summary>Photos and notes, backend side (KAN-40): the rules of data model section 12, the files and the cleanup.</summary>
internal sealed partial class MediaService(
    AppDbContext db, ITripWriteRules trips, IMediaStorage storage, TimeProvider clock, IOptions<MediaOptions> options) : ITripDeleteHook
{
    /// <summary>The checks for one record after the phone's columns were applied. Problems use column names.</summary>
    public static IReadOnlyDictionary<string, string[]> Check(MediaItem m, Guid? oldTripId, string? oldHash)
    {
        var problems = new Dictionary<string, List<string>>();
        void Add(string column, string message)
        {
            if (!problems.TryGetValue(column, out var list)) problems[column] = list = [];
            list.Add(message);
        }

        if (m.MediaType != MediaValues.Photo) Add("media_type", "Only photos can be added for now.");
        if (m.Purpose != MediaValues.TripPhoto) Add("purpose", "Only trip photos can be added for now.");
        if (!MediaValues.Scopes.Contains(m.Scope)) Add("scope", "Scope must be shared or personal.");
        if (!MediaValues.Sources.Contains(m.Source)) Add("source", "Source must be camera or library.");
        if (m.IsSuggested) Add("is_suggested", "Suggested photos are not available yet.");
        if (m.Caption?.Length > MediaValues.CaptionMax) Add("caption", $"Up to {MediaValues.CaptionMax} characters.");
        if (m.Lat is null != m.Lng is null) Add(m.Lat is null ? "lat" : "lng", "Send both lat and lng, or neither.");
        if (m.Lat is < -90 or > 90) Add("lat", "Must be between -90 and 90.");
        if (m.Lng is < -180 or > 180) Add("lng", "Must be between -180 and 180.");
        if (m.CountryCode is not null && !CountryCode().IsMatch(m.CountryCode)) Add("country_code", "Use a 2-letter ISO country code in capitals.");
        if (m.Width is < 1 or > MediaValues.SideMax) Add("width", $"Must be between 1 and {MediaValues.SideMax}.");
        if (m.Height is < 1 or > MediaValues.SideMax) Add("height", $"Must be between 1 and {MediaValues.SideMax}.");
        if (m.MimeType != MediaValues.Jpeg) Add("mime_type", "Photos are sent as image/jpeg.");
        if (m.DurationSec is not null) Add("duration_sec", "Only videos have a duration.");
        if (!ContentHash().IsMatch(m.ContentHash)) Add("content_hash", "Must be a SHA-256 in 64 lowercase hex characters.");
        if (!MediaValues.QualityTiers.Contains(m.QualityTier)) Add("quality_tier", "Must be compressed or full.");
        if (m.TripId is null) Add("trip_id", "A trip photo needs its trip.");
        if (m.PlaceId is not null) Add("place_id", "Linking a photo to a place is not available yet.");
        if (oldTripId is { } before && before != m.TripId) Add("trip_id", "A photo cannot move to another trip.");
        if (oldHash is not null && oldHash != m.ContentHash) Add("content_hash", "The photo of a record cannot change.");

        return problems.ToDictionary(p => p.Key, p => p.Value.ToArray());
    }

    /// <summary>True when the user may change the record: it is theirs and the trip is theirs.</summary>
    public async Task<bool> CanWriteAsync(Guid userId, MediaItem m, CancellationToken ct) =>
        m.OwnerUserId == userId && m.TripId is { } tripId && await trips.OwnsTripAsync(userId, tripId, ct);

    /// <summary>True when the same photo is already in the trip for this user (deleted ones do not count).</summary>
    public Task<bool> IsDuplicateAsync(MediaItem m, CancellationToken ct) =>
        db.Set<MediaItem>().AnyAsync(o => o.Id != m.Id && o.TripId == m.TripId && o.OwnerUserId == m.OwnerUserId
            && o.ContentHash == m.ContentHash && o.DeletedAt == null, ct);

    /// <summary>The trip's photos, or null when the trip is not the user's.</summary>
    public async Task<TripMediaResponse?> ListForTripAsync(Guid userId, Guid tripId, CancellationToken ct)
    {
        if (!await trips.OwnsTripAsync(userId, tripId, ct)) return null;
        var media = await db.Set<MediaItem>().AsNoTracking()
            .Where(m => m.TripId == tripId && m.DeletedAt == null && m.Purpose == MediaValues.TripPhoto)
            .OrderByDescending(m => m.TakenAt ?? m.CreatedAt).ThenByDescending(m => m.Id)
            .ToListAsync(ct);
        return new TripMediaResponse(media.Select(ToDto).ToList());
    }

    /// <summary>
    /// Stores the full image or the thumbnail of a record that is already on the server, after removing its metadata.
    /// Sending the same part again replaces it (the phone retries).
    /// </summary>
    public async Task<UploadOutcome> StoreAsync(Guid userId, Guid id, bool thumbnail, Stream body, CancellationToken ct)
    {
        if (await FindOwnAsync(userId, id, ct) is null) return UploadOutcome.NotFound;
        var max = thumbnail ? MediaValues.ThumbnailBytesMax : MediaValues.FileBytesMax;
        var bytes = await ReadUpToAsync(body, max, ct);
        if (bytes is null) return UploadOutcome.TooLarge;
        if (!JpegMetadata.LooksLikeJpeg(bytes) || JpegMetadata.Strip(bytes) is not { } clean) return UploadOutcome.NotJpeg;

        var key = thumbnail ? MediaValues.ThumbnailKey(id) : MediaValues.FileKey(id);
        try
        {
            using var content = new MemoryStream(clean, writable: false);
            await storage.PutAsync(key, content, ct);
        }
        catch (MediaStorageUnavailableException)
        {
            return UploadOutcome.StorageUnavailable;
        }

        // One UPDATE (no read-modify-write), so a sync write at the same moment cannot clash with it.
        var now = clock.GetUtcNow();
        var rows = db.Set<MediaItem>().Where(m => m.Id == id && m.DeletedAt == null);
        var changed = thumbnail
            ? await rows.ExecuteUpdateAsync(u => u.SetProperty(m => m.ThumbnailKey, key)
                .SetProperty(m => m.UpdatedAt, now).SetProperty(m => m.Version, m => m.Version + 1), ct)
            : await rows.ExecuteUpdateAsync(u => u.SetProperty(m => m.FileKey, key).SetProperty(m => m.SizeBytes, (long)clean.Length)
                .SetProperty(m => m.UploadedAt, now).SetProperty(m => m.UpdatedAt, now).SetProperty(m => m.Version, m => m.Version + 1), ct);
        return changed == 1 ? UploadOutcome.Stored : UploadOutcome.NotFound;
    }

    /// <summary>The stored part, or null when the record is not the user's, is deleted, or that part is not uploaded yet.</summary>
    /// <exception cref="MediaStorageUnavailableException">The file store cannot be reached.</exception>
    public async Task<Stream?> OpenAsync(Guid userId, Guid id, bool thumbnail, CancellationToken ct)
    {
        var media = await FindOwnAsync(userId, id, ct);
        var key = thumbnail ? media?.ThumbnailKey : media?.FileKey;
        return key is null ? null : await storage.OpenReadAsync(key, ct);
    }

    /// <summary>A deleted trip takes its photos with it (soft delete, so phones see it; files go with the cleanup job).</summary>
    public Task TripDeletedAsync(Guid tripId, DateTimeOffset at, CancellationToken ct) =>
        db.Set<MediaItem>().Where(m => m.TripId == tripId && m.DeletedAt == null)
            .ExecuteUpdateAsync(u => u.SetProperty(m => m.DeletedAt, at).SetProperty(m => m.UpdatedAt, at).SetProperty(m => m.Version, m => m.Version + 1), ct);

    /// <summary>
    /// GDPR: removes the files and then the rows of photos deleted more than <see cref="MediaOptions.CleanupAfterDays"/>
    /// days ago. A row whose files could not be removed stays for the next run. Returns how many rows were removed.
    /// </summary>
    public async Task<int> CleanupAsync(CancellationToken ct)
    {
        var before = clock.GetUtcNow().AddDays(-options.Value.CleanupAfterDays);
        var removed = 0;
        while (true)
        {
            var ids = await db.Set<MediaItem>().Where(m => m.DeletedAt != null && m.DeletedAt < before)
                .OrderBy(m => m.DeletedAt).Select(m => m.Id).Take(100).ToListAsync(ct);
            if (ids.Count == 0) return removed;
            var done = new List<Guid>(ids.Count);
            foreach (var id in ids)
            {
                try
                {
                    // Both keys always: a file may have arrived after the row was deleted.
                    await storage.DeleteAsync(MediaValues.FileKey(id), ct);
                    await storage.DeleteAsync(MediaValues.ThumbnailKey(id), ct);
                    done.Add(id);
                }
                catch (MediaStorageUnavailableException)
                {
                    return removed + await DeleteRowsAsync(done, ct);
                }
            }
            removed += await DeleteRowsAsync(done, ct);
        }
    }

    public static MediaDto ToDto(MediaItem m) => new(m.Id, m.OwnerUserId, m.TripId, m.PlaceId, m.MediaType, m.Purpose, m.Scope,
        m.Source, m.IsSuggested, m.Caption, m.TakenAt, m.Lat, m.Lng, m.CountryCode, m.Width, m.Height, m.MimeType, m.DurationSec,
        m.ContentHash, m.QualityTier, m.FileKey, m.ThumbnailKey, m.SizeBytes, m.UploadedAt, m.IncludeInVideo, m.SortOrder,
        m.CreatedAt, m.UpdatedAt, m.DeletedAt, m.Version);

    private async Task<MediaItem?> FindOwnAsync(Guid userId, Guid id, CancellationToken ct)
    {
        var media = await db.Set<MediaItem>().AsNoTracking().FirstOrDefaultAsync(m => m.Id == id && m.DeletedAt == null, ct);
        return media is not null && await CanWriteAsync(userId, media, ct) ? media : null;
    }

    private Task<int> DeleteRowsAsync(List<Guid> ids, CancellationToken ct) =>
        ids.Count == 0 ? Task.FromResult(0) : db.Set<MediaItem>().Where(m => ids.Contains(m.Id)).ExecuteDeleteAsync(ct);

    /// <summary>The whole body, or null when it is bigger than <paramref name="max"/> bytes.</summary>
    private static async Task<byte[]?> ReadUpToAsync(Stream body, long max, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await body.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > max) return null;
            buffer.Write(chunk, 0, read);
        }
        return buffer.ToArray();
    }

    [GeneratedRegex("^[A-Z]{2}$")]
    private static partial Regex CountryCode();

    [GeneratedRegex("^[0-9a-f]{64}$")]
    private static partial Regex ContentHash();
}
