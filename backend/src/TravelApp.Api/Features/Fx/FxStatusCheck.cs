using Microsoft.Extensions.Options;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Fx;

/// <summary>The free Currency API for the status page (KAN-55).</summary>
internal sealed class FxStatusCheck(IOptions<FxOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var (state, ms, detail) = await AdminStatusService.PingAsync(http, options.Value.Url.Replace("{date}", "latest", StringComparison.Ordinal), ct);
        return new("fx", "Currency API (fawazahmed0)", "Exchange rates for expenses (KAN-43)", state, ms,
            "Free, no key, no service promise; rates already stored stay",
            "Check it still works and is still free; else a paid source (key in Fx:*)", detail);
    }
}
