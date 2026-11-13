using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TravelApp.Api.Tests.Features.Fx;

/// <summary>
/// Answers like the free Currency API, so tests never call the internet. Records every address it was asked for.
/// Days up to <see cref="LatestDay"/> exist (later ones are 404); "latest" gives <see cref="LatestDay"/>.
/// Rates: EUR 1, MAD 10.5, ALL 97.25, JPY 160, plus junk the server must skip.
/// </summary>
public sealed partial class FakeCurrencyApi : HttpMessageHandler
{
    private readonly ConcurrentQueue<Uri> _requests = new();
    private readonly ConcurrentDictionary<DateOnly, bool> _failing = new();

    /// <summary>Today minus one by default: today's file is not out yet.</summary>
    public DateOnly LatestDay { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);

    /// <summary>Days that answer 503 on both addresses.</summary>
    public void FailFor(DateOnly day) => _failing[day] = true;

    public int CountFor(string dayOrLatest) => _requests.Count(u => u.AbsoluteUri.Contains(dayOrLatest, StringComparison.Ordinal));

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var uri = request.RequestUri!;
        _requests.Enqueue(uri);
        var match = DayInUrl().Match(uri.AbsoluteUri);
        DateOnly day;
        if (match.Value == "latest") day = LatestDay;
        else if (!DateOnly.TryParseExact(match.Value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day))
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest));

        if (_failing.ContainsKey(day)) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        if (day > LatestDay) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));

        var body = JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["date"] = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            ["eur"] = new Dictionary<string, object>
            {
                ["eur"] = 1, ["mad"] = 10.5, ["all"] = 97.25, ["jpy"] = 160, ["1inch"] = 3.2, ["bad"] = -1, ["huge"] = 1e20,
            },
        });
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        });
    }

    [GeneratedRegex(@"(\d{4}-\d{2}-\d{2}|latest)")]
    private static partial Regex DayInUrl();
}
