using Microsoft.Extensions.Options;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Geo;

/// <summary>Photon for the status page (KAN-55). Searches a fixed word, never a user's search.</summary>
internal sealed class GeoStatusCheck(IOptions<GeoOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var url = new Uri(options.Value.PhotonUrl, "api?q=lisbon&limit=1").ToString();
        var (state, ms, detail) = await AdminStatusService.PingAsync(http, url, ct);
        return new("place-search", "Photon (komoot)", "Place and city search (KAN-37)", state, ms,
            "Public server, free with fair use, no key; OpenStreetMap attribution",
            "Check it is fine for our traffic; else our own Photon in the EU (Geo:PhotonUrl)", detail);
    }
}
