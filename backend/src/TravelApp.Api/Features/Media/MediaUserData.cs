using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// Photos and notes in "Download my data" and in the final erase (KAN-22).
/// Export: the photo records with their notes (the image files are on the phone and at GET /media/{id}/file).
/// Purge (first of all): the files in Blob Storage, before the records go with the cascade, so no file is left behind.
/// </summary>
internal sealed class MediaUserData(AppDbContext db, ITripWriteRules trips, IMediaStorage storage) : IUserData
{
    public int PurgeOrder => -100;

    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var photos = await (await OfUserAsync(userId, ct)).AsNoTracking().OrderBy(m => m.CreatedAt).ToListAsync(ct);
        return new Dictionary<string, object> { ["photos"] = photos.Select(ExportRow).ToList() };
    }

    /// <summary>Throws <see cref="MediaStorageUnavailableException"/> when Blob Storage is down; the job tries again later.</summary>
    public async Task PurgeAsync(Guid userId, CancellationToken ct)
    {
        var ids = await (await OfUserAsync(userId, ct)).Select(m => m.Id).ToListAsync(ct);
        foreach (var id in ids)
        {
            // Both keys always: a file may have arrived after the row was deleted.
            await storage.DeleteAsync(MediaValues.FileKey(id), ct);
            await storage.DeleteAsync(MediaValues.ThumbnailKey(id), ct);
        }
    }

    private async Task<IQueryable<MediaItem>> OfUserAsync(Guid userId, CancellationToken ct)
    {
        var tripIds = await trips.TripIdsOfOwnerAsync(userId, ct);
        return db.Set<MediaItem>().Where(m => m.OwnerUserId == userId || (m.TripId != null && tripIds.Contains(m.TripId.Value)));
    }

    // Storage keys are internal details; the export says where to download the file instead.
    private static object ExportRow(MediaItem m) => new
    {
        m.Id, m.TripId, m.PlaceId, m.MediaType, m.Purpose, m.Scope, m.Source, m.Caption, m.TakenAt, m.Lat, m.Lng,
        m.CountryCode, m.Width, m.Height, m.MimeType, m.SizeBytes, m.UploadedAt, m.IncludeInVideo, m.SortOrder,
        m.CreatedAt, m.UpdatedAt, m.DeletedAt,
        File = m.UploadedAt is null ? null : $"/media/{m.Id:D}/file",
    };
}
