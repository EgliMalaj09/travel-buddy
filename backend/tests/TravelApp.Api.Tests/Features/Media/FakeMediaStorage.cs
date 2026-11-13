using System.Collections.Concurrent;
using TravelApp.Api.Features.Media;

namespace TravelApp.Api.Tests.Features.Media;

/// <summary>Blob Storage in memory, shared by all tests (keys are per photo id, so tests do not clash).</summary>
internal sealed class FakeMediaStorage : IMediaStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _files = new();

    public bool Has(string key) => _files.ContainsKey(key);

    public byte[]? Get(string key) => _files.GetValueOrDefault(key);

    public async Task PutAsync(string key, Stream content, CancellationToken ct)
    {
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, ct);
        _files[key] = copy.ToArray();
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        return Task.FromResult<Stream?>(_files.TryGetValue(key, out var bytes) ? new MemoryStream(bytes, writable: false) : null);
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        _files.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}
