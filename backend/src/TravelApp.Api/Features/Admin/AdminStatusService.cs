using System.Diagnostics;

namespace TravelApp.Api.Features.Admin;

/// <summary>
/// The status page: asks every <see cref="IServiceStatusCheck"/> at the same time and keeps the answer for one minute,
/// so opening the page many times never hammers the free services.
/// </summary>
internal sealed class AdminStatusService(IServiceScopeFactory scopes, IHttpClientFactory httpClients, TimeProvider clock) : IDisposable
{
    public const string HttpClientName = "admin-status";
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(1);
    private readonly SemaphoreSlim _gate = new(1, 1);
    private (DateTimeOffset At, IReadOnlyList<ServiceStatusDto> Items)? _last;

    public async Task<(DateTimeOffset At, IReadOnlyList<ServiceStatusDto> Items)> GetAsync(bool refresh, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var now = clock.GetUtcNow();
            if (!refresh && _last is { } cached && now - cached.At < CacheFor) return cached;

            await using var scope = scopes.CreateAsyncScope();
            var http = httpClients.CreateClient(HttpClientName);
            var checks = scope.ServiceProvider.GetServices<IServiceStatusCheck>();
            var items = await Task.WhenAll(checks.Select(c => SafeCheckAsync(c, http, ct)));
            _last = (now, items.OrderBy(i => i.Key, StringComparer.Ordinal).ToList());
            return _last.Value;
        }
        finally
        {
            _gate.Release();
        }
    }

    private static async Task<ServiceStatusDto> SafeCheckAsync(IServiceStatusCheck check, HttpClient http, CancellationToken ct)
    {
        try
        {
            return await check.CheckAsync(http, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // Only the error type: messages can hold addresses.
            return new ServiceStatusDto(check.GetType().Name, check.GetType().Name, "", ServiceStates.Down, null, "", "", ex.GetType().Name);
        }
    }

    public void Dispose() => _gate.Dispose();

    /// <summary>Helper for checks that call a web address: state and time from the answer's status code.</summary>
    public static async Task<(string State, int LatencyMs, string Detail)> PingAsync(HttpClient http, string url, CancellationToken ct)
    {
        var watch = Stopwatch.StartNew();
        try
        {
            using var response = await http.GetAsync(new Uri(url), HttpCompletionOption.ResponseHeadersRead, ct);
            var ms = (int)watch.ElapsedMilliseconds;
            return ((int)response.StatusCode < 500 && (int)response.StatusCode != 429 ? ServiceStates.Ok : ServiceStates.Down, ms, $"HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return (ServiceStates.Down, (int)watch.ElapsedMilliseconds, ex is TaskCanceledException ? "Timed out" : "Not reachable");
        }
    }
}

/// <summary>PowerSync and the map tiles: used by the phone, not by the API, so the Admin feature checks them itself.</summary>
internal sealed class PowerSyncStatusCheck(Microsoft.Extensions.Options.IOptions<AdminOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        const string plan = "Locally: PowerSync Open Edition in Docker. Beta: PowerSync Cloud free plan (EU)";
        const string before = "Check the Cloud plan limits for our number of users; move to a paid plan or self-host if needed";
        if (string.IsNullOrWhiteSpace(options.Value.PowerSyncUrl))
        {
            return new("powersync", "PowerSync", "Offline sync to the phones", ServiceStates.NotConfigured, null, plan, before, "Set Admin:PowerSyncUrl");
        }

        var (state, ms, detail) = await AdminStatusService.PingAsync(http, options.Value.PowerSyncUrl.TrimEnd('/') + "/probes/liveness", ct);
        return new("powersync", "PowerSync", "Offline sync to the phones", state, ms, plan, before, detail);
    }
}

internal sealed class MapTilesStatusCheck(Microsoft.Extensions.Options.IOptions<AdminOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var (state, ms, detail) = await AdminStatusService.PingAsync(http, options.Value.MapStyleUrl, ct);
        return new("map-tiles", "OpenFreeMap", "Map tiles in the app (KAN-37)", state, ms,
            "Free public tiles, no key, OpenStreetMap data (attribution shown on every map)",
            "Check they are still free and fine for our traffic; listed in the privacy policy", detail);
    }
}
