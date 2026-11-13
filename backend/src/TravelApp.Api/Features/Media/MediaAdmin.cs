using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Media;

/// <summary>Photo counts and storage for the back office (KAN-55). Never captions, positions or files.</summary>
internal sealed class MediaAdminMetrics(AppDbContext db) : IAdminMetrics
{
    public async Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct)
    {
        var media = db.Set<MediaItem>().AsNoTracking().Where(m => m.DeletedAt == null);
        var count = await media.CountAsync(ct);
        var bytes = await media.SumAsync(m => m.SizeBytes ?? 0, ct);
        return
        [
            new("photos", "Photos", count),
            new("storage-mb", "Photo storage (MB)", (long)Math.Ceiling(bytes / 1_048_576d), "Files only, thumbnails not counted"),
        ];
    }

    public async Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct)
    {
        var media = db.Set<MediaItem>().AsNoTracking().Where(m => m.OwnerUserId == userId && m.DeletedAt == null);
        var bytes = await media.SumAsync(m => m.SizeBytes ?? 0, ct);
        return
        [
            new("photos", "Photos", await media.CountAsync(ct)),
            new("storage-mb", "Photo storage (MB)", (long)Math.Ceiling(bytes / 1_048_576d)),
        ];
    }
}

/// <summary>Is Blob Storage reachable? Reads a key that never exists: "not there" means the store answers.</summary>
internal sealed class MediaStatusCheck(IMediaStorage storage, IOptions<MediaOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var local = options.Value.BlobConnectionString.Contains("UseDevelopmentStorage", StringComparison.OrdinalIgnoreCase);
        var plan = local ? "Azurite, the free local emulator (development)" : "Azure Blob Storage, EU region, private container";
        const string before = "Beta: a real Azure Storage account in the EU (Media__BlobConnectionString in the environment)";
        if (string.IsNullOrWhiteSpace(options.Value.BlobConnectionString))
        {
            return new("storage", "Photo storage", "Photo files (KAN-40)", ServiceStates.NotConfigured, null, plan, before, "Set Media:BlobConnectionString");
        }

        var watch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            await using var stream = await storage.OpenReadAsync("status-check/none.jpg", ct);
            return new("storage", "Photo storage", "Photo files (KAN-40)", local ? ServiceStates.DevOnly : ServiceStates.Ok,
                (int)watch.ElapsedMilliseconds, plan, before);
        }
        catch (MediaStorageUnavailableException)
        {
            return new("storage", "Photo storage", "Photo files (KAN-40)", ServiceStates.Down, (int)watch.ElapsedMilliseconds, plan, before, "Not reachable");
        }
    }
}
