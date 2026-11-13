using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Web;

namespace TravelApp.Api.Tests.Features.Weather;

/// <summary>
/// Answers like Open-Meteo, so tests never call the internet. Records every address it was asked for.
/// Forecast days: 10..20 °C, 2.5 mm, 40 %, no snow.
/// Archive days depend on how many years ago they are (1, 2, 3): min 5/6/7, max 15/16/17, rain 0/1.5/3 mm, snow 0/1/2 cm.
/// </summary>
public sealed class FakeOpenMeteo : HttpMessageHandler
{
    private readonly ConcurrentQueue<Uri> _requests = new();

    public bool Fail { get; set; }

    public IReadOnlyList<Uri> Requests => [.. _requests];

    /// <summary>Requests whose latitude parameter is exactly this text (e.g. "41.9").</summary>
    public int CountFor(string latitude) =>
        _requests.Count(u => HttpUtility.ParseQueryString(u.Query)["latitude"] == latitude);

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;
        _requests.Enqueue(uri);
        if (Fail) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var query = HttpUtility.ParseQueryString(uri.Query);
        var start = DateOnly.ParseExact(query["start_date"]!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var end = DateOnly.ParseExact(query["end_date"]!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var archive = uri.Host.StartsWith("archive", StringComparison.Ordinal);
        var thisYear = DateTime.UtcNow.Year;

        var time = new List<string>();
        var max = new List<double?>();
        var min = new List<double?>();
        var rain = new List<double?>();
        var chance = new List<double?>();
        var snow = new List<double?>();
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            time.Add(d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (archive)
            {
                var ago = thisYear - d.Year;
                min.Add(4 + ago);
                max.Add(14 + ago);
                rain.Add(ago switch { 1 => 0, 2 => 1.5, _ => 3 });
                snow.Add(ago - 1);
            }
            else
            {
                min.Add(10);
                max.Add(20);
                rain.Add(2.5);
                chance.Add(40);
                snow.Add(0);
            }
        }

        var daily = new Dictionary<string, object>
        {
            ["time"] = time, ["temperature_2m_max"] = max, ["temperature_2m_min"] = min,
            ["precipitation_sum"] = rain, ["snowfall_sum"] = snow,
        };
        if (!archive) daily["precipitation_probability_max"] = chance;
        var body = JsonSerializer.Serialize(new { latitude = 0, longitude = 0, daily });
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        });
    }
}
