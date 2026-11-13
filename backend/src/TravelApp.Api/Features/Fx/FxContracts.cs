namespace TravelApp.Api.Features.Fx;

// Request and response types of the daily exchange rates for expenses (KAN-43). The app generates its types from these.

public static class FxValues
{
    /// <summary>Most days in one request (a trip's expense days).</summary>
    public const int MaxDates = 62;

    /// <summary>Most currencies in one request.</summary>
    public const int MaxCurrencies = 30;

    /// <summary>Furthest day ahead that can be asked for (planned expenses use the latest rate until that day).</summary>
    public const int AheadDays = 400;

    /// <summary>
    /// Most new days fetched from the provider in one request. Keeps one account from making hundreds of provider
    /// calls a minute; the other days come back without rates and the app asks again a minute later.
    /// </summary>
    public const int MaxProviderDaysPerRequest = 7;

    /// <summary>When the provider has no rate for a day, the closest earlier day up to this many days back is used.</summary>
    public const int FallbackDays = 7;
}

/// <summary>The rates of one requested day.</summary>
/// <param name="Date">The day that was asked for.</param>
/// <param name="RateDate">The day the rates are really from. Empty when there are none.</param>
/// <param name="Final">True when <paramref name="RateDate"/> is the asked day: these rates never change, so the app keeps them for good.
/// False for today before the day's rates are out, a future day, or a day the provider missed: ask again later.</param>
/// <param name="RatesToEur">Units of each asked currency for 1 euro, by ISO code. A currency the provider does not know is left out.</param>
public sealed record FxDayDto(DateOnly Date, DateOnly? RateDate, bool Final, IReadOnlyDictionary<string, decimal> RatesToEur);

public sealed record FxRatesResponse(IReadOnlyList<FxDayDto> Days);
