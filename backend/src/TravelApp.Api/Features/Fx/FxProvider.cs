using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Fx;

/// <summary>One day of rates from the provider: units per euro by upper-case ISO code.</summary>
internal sealed record ProviderRates(DateOnly Date, IReadOnlyDictionary<string, decimal> RatesToEur);

/// <summary>The provider could not be reached or answered with an error.</summary>
internal sealed class FxProviderException(int? statusCode, Exception? inner = null) : Exception("FX provider failed", inner)
{
    public int? StatusCode { get; } = statusCode;
}

/// <summary>The exchange-rate source (the free Currency API today; owner chose it on 13 Nov 2026).</summary>
internal interface IFxProvider
{
    /// <summary>The rates of one day, or null when the provider has none for it (404). Null date = the latest day.</summary>
    Task<ProviderRates?> GetAsync(DateOnly? date, CancellationToken ct);
}

/// <summary>Configuration section "Fx".</summary>
internal sealed class FxOptions
{
    public const string Section = "Fx";

    /// <summary>Main address; "{date}" becomes "2026-11-13" or "latest".</summary>
    public string Url { get; set; } = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/eur.json";

    /// <summary>Second address, tried when the first fails.</summary>
    public string FallbackUrl { get; set; } = "https://{date}.currency-api.pages.dev/v1/currencies/eur.json";

    /// <summary>The first day the provider has rates for.</summary>
    public DateOnly HistoryStart { get; set; } = new(2024, 3, 2);

    /// <summary>Calls per user per minute (the app keeps final days for good, so it asks rarely).</summary>
    public int RequestsPerMinutePerUser { get; set; } = 60;
}

/// <summary>
/// fawazahmed0 Currency API: free, no key, no account, CC0 data, 200+ currencies (ALL, MAD included), a file per day.
/// The request holds only a date, never anything about the user. The HTTP client's own logs are removed in <see cref="FxSetup"/>.
/// </summary>
internal sealed partial class FreeCurrencyApiProvider(HttpClient http, IOptions<FxOptions> options) : IFxProvider
{
    /// <summary>Above this a value is not a real currency rate (keeps the numeric column safe).</summary>
    private const decimal MaxRate = 1_000_000_000_000m;

    public async Task<ProviderRates?> GetAsync(DateOnly? date, CancellationToken ct)
    {
        var name = date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "latest";
        FxProviderException? first = null;
        foreach (var template in (string[])[options.Value.Url, options.Value.FallbackUrl])
        {
            if (string.IsNullOrWhiteSpace(template)) continue;
            try
            {
                return await GetOneAsync(new Uri(template.Replace("{date}", name, StringComparison.Ordinal)), ct);
            }
            catch (FxProviderException ex)
            {
                first ??= ex;
            }
        }

        throw first ?? new FxProviderException(null);
    }

    private async Task<ProviderRates?> GetOneAsync(Uri uri, CancellationToken ct)
    {
        try
        {
            using var response = await http.GetAsync(uri, ct);
            if (response.StatusCode == HttpStatusCode.NotFound) return null;
            if (!response.IsSuccessStatusCode) throw new FxProviderException((int)response.StatusCode);
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            return Parse(doc.RootElement) ?? throw new FxProviderException((int)response.StatusCode);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            throw new FxProviderException(null, ex);
        }
    }

    /// <summary>{"date":"2026-11-13","eur":{"all":97.1,"mad":10.8,…}}; null when it does not look like that.</summary>
    internal static ProviderRates? Parse(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object
            || !root.TryGetProperty("date", out var dateValue) || dateValue.ValueKind != JsonValueKind.String
            || !DateOnly.TryParseExact(dateValue.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            || !root.TryGetProperty("eur", out var eur) || eur.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var rates = new Dictionary<string, decimal>(StringComparer.Ordinal) { ["EUR"] = 1m };
        foreach (var p in eur.EnumerateObject())
        {
            if (!Code().IsMatch(p.Name) || p.Value.ValueKind != JsonValueKind.Number) continue;
            if (!p.Value.TryGetDecimal(out var rate) || rate <= 0 || rate > MaxRate) continue;
            rates[p.Name.ToUpperInvariant()] = Math.Round(rate, 12);
        }

        rates["EUR"] = 1m;
        return new ProviderRates(date, rates);
    }

    [GeneratedRegex("^[a-z]{3}$")]
    private static partial Regex Code();
}
