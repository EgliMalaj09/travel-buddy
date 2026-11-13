namespace TravelApp.Api.Features.Fx;

/// <summary>
/// One currency on one day (table "fx_rates", data model 13 FxRate). Server only, read-only for phones, no personal data.
/// A past day's row never changes, so an expense keeps the same home amount forever (D5, D8).
/// </summary>
public sealed class FxRate
{
    /// <summary>The day the provider published the rate for.</summary>
    public DateOnly Date { get; set; }

    /// <summary>ISO 4217, upper case.</summary>
    public string Currency { get; set; } = "";

    /// <summary>How many units of <see cref="Currency"/> one euro buys that day (EUR = 1, MAD ≈ 10.8).</summary>
    public decimal RateToEur { get; set; }

    public DateTimeOffset FetchedAt { get; set; }
}
