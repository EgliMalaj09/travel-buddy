using Microsoft.Extensions.Options;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Weather;

/// <summary>Open-Meteo for the status page (KAN-55). Asks for one day in a fixed city, never a user's place.</summary>
internal sealed class WeatherStatusCheck(IOptions<WeatherOptions> options) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var url = $"{options.Value.ForecastUrl.ToString().TrimEnd('/')}?latitude=52.52&longitude=13.41&daily=temperature_2m_max&forecast_days=1";
        var (state, ms, detail) = await AdminStatusService.PingAsync(http, url, ct);
        return new("weather", "Open-Meteo", "Weather for packing (KAN-29)", state, ms,
            "Free tier, no key, non-commercial use only; CC BY 4.0 attribution shown in the app",
            "Paid Open-Meteo plan (key in Weather:*) or switch to MET Norway", detail);
    }
}
