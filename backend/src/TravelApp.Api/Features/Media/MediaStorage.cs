using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Media;

/// <summary>Where the photo files live. Keys are opaque (<see cref="MediaValues.FileKey"/>); tests use an in-memory store.</summary>
internal interface IMediaStorage
{
    /// <summary>Stores (or replaces) the JPEG under the key.</summary>
    Task PutAsync(string key, Stream content, CancellationToken ct);

    /// <summary>The stored JPEG, or null when there is none.</summary>
    Task<Stream?> OpenReadAsync(string key, CancellationToken ct);

    /// <summary>Removes the file; nothing happens when it is not there.</summary>
    Task DeleteAsync(string key, CancellationToken ct);
}

/// <summary>Thrown when the file store cannot be reached. Endpoints answer 503; the API keeps running.</summary>
internal sealed class MediaStorageUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>Configuration section "Media".</summary>
internal sealed class MediaOptions
{
    public const string Section = "Media";

    /// <summary>Azure Storage connection string. Locally Azurite: "UseDevelopmentStorage=true". Beta and production: environment settings.</summary>
    public string BlobConnectionString { get; set; } = "";

    public string ContainerName { get; set; } = "media";

    /// <summary>Calls to /media per user per minute (each photo is two uploads: thumbnail and file).</summary>
    public int RequestsPerMinutePerUser { get; set; } = 120;

    /// <summary>A deleted photo's files and row are removed for good after this many days (data model section 12).</summary>
    public int CleanupAfterDays { get; set; } = 30;

    /// <summary>How often the cleanup job runs.</summary>
    public int CleanupIntervalMinutes { get; set; } = 60;
}

/// <summary>
/// Azure Blob Storage (Azurite locally). The client is made on first use, so a missing or wrong connection string
/// or a store that is down never stops the API from starting; file endpoints answer 503 instead.
/// The SDK's own logging and telemetry are off: its logs can contain request addresses (GDPR core rule).
/// </summary>
internal sealed partial class AzureBlobMediaStorage(IOptions<MediaOptions> options, ILogger<AzureBlobMediaStorage> logger)
    : IMediaStorage, IDisposable
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private BlobContainerClient? _container;

    public async Task PutAsync(string key, Stream content, CancellationToken ct)
    {
        var container = await ContainerAsync(ct);
        await Guard(() => container.GetBlobClient(key).UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = MediaValues.Jpeg },
        }, ct));
    }

    public async Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        var container = await ContainerAsync(ct);
        try
        {
            var result = await Guard(() => container.GetBlobClient(key).DownloadStreamingAsync(cancellationToken: ct));
            return result.Value.Content;
        }
        catch (MediaStorageUnavailableException ex) when (ex.InnerException is RequestFailedException { Status: 404 })
        {
            return null;
        }
    }

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        var container = await ContainerAsync(ct);
        await Guard(() => container.GetBlobClient(key).DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: ct));
    }

    private async Task<BlobContainerClient> ContainerAsync(CancellationToken ct)
    {
        if (_container is not null) return _container;
        await _gate.WaitAsync(ct);
        try
        {
            if (_container is not null) return _container;
            if (string.IsNullOrWhiteSpace(options.Value.BlobConnectionString))
                throw new MediaStorageUnavailableException("No Media:BlobConnectionString configured.");
            BlobContainerClient container;
            try
            {
                var clientOptions = new BlobClientOptions();
                clientOptions.Diagnostics.IsLoggingEnabled = false;
                clientOptions.Diagnostics.IsDistributedTracingEnabled = false;
                clientOptions.Diagnostics.IsTelemetryEnabled = false;
                clientOptions.Retry.MaxRetries = 2;
                clientOptions.Retry.NetworkTimeout = TimeSpan.FromSeconds(30);
                container = new BlobServiceClient(options.Value.BlobConnectionString, clientOptions)
                    .GetBlobContainerClient(options.Value.ContainerName);
            }
            catch (FormatException ex)
            {
                throw new MediaStorageUnavailableException("Media:BlobConnectionString is not valid.", ex);
            }
            // Private container: files are only read through the API, never by address.
            await Guard(() => container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct));
            _container = container;
            return container;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<T> Guard<T>(Func<Task<T>> call)
    {
        try
        {
            return await call();
        }
        catch (Exception ex) when (ex is RequestFailedException or AggregateException or HttpRequestException or IOException)
        {
            // Only the error type and status: the SDK's messages can contain addresses.
            var status = (ex as RequestFailedException)?.Status ?? 0;
            if (status != 404) LogFailed(ex.GetType().Name, status);
            throw new MediaStorageUnavailableException("Media storage call failed.", ex);
        }
    }

    public void Dispose() => _gate.Dispose();

    [LoggerMessage(Level = LogLevel.Warning, Message = "Media storage call failed: {ErrorType} status {Status}")]
    private partial void LogFailed(string errorType, int status);
}
