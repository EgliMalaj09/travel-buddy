using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Fx;

/// <summary>Daily exchange rates for expenses (KAN-43). The app asks the API, never the rate provider directly.</summary>
public static partial class FxEndpoints
{
    public static IEndpointRouteBuilder MapFxEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/fx").WithTags("Exchange rates").RequireAuthorization()
            .RequireRateLimiting(FxSetup.RateLimitPolicy)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/rates", GetRates).WithName("GetFxRates")
            .WithSummary("Units of each currency for 1 euro, per day. dates and currencies are comma-separated lists " +
                "(e.g. dates=2026-11-10,2026-11-11&currencies=MAD,ALL). Days without their own rates get the closest earlier day, marked not final");

        return app;
    }

    internal static async Task<Results<Ok<FxRatesResponse>, ValidationProblem>> GetRates(
        string dates, string currencies, FxService service, TimeProvider clock, IOptions<FxOptions> options, CancellationToken ct)
    {
        var problems = new Dictionary<string, string[]>();
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

        var days = new List<DateOnly>();
        foreach (var part in (dates ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!DateOnly.TryParseExact(part, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
            {
                problems["dates"] = ["Use days like 2026-11-13, separated by commas."];
                break;
            }
            days.Add(day);
        }
        days = days.Distinct().ToList();
        if (!problems.ContainsKey("dates"))
        {
            if (days.Count == 0) problems["dates"] = ["Ask for at least one day."];
            else if (days.Count > FxValues.MaxDates) problems["dates"] = [$"Up to {FxValues.MaxDates} days at a time."];
            else if (days.Any(d => d < options.Value.HistoryStart)) problems["dates"] = [$"Rates start on {options.Value.HistoryStart:yyyy-MM-dd}."];
            else if (days.Any(d => d > today.AddDays(FxValues.AheadDays))) problems["dates"] = [$"Up to {FxValues.AheadDays} days ahead."];
        }

        var codes = (currencies ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.Ordinal).ToList();
        if (codes.Count == 0) problems["currencies"] = ["Ask for at least one currency."];
        else if (codes.Count > FxValues.MaxCurrencies) problems["currencies"] = [$"Up to {FxValues.MaxCurrencies} currencies at a time."];
        else if (codes.Any(c => !CurrencyCode().IsMatch(c))) problems["currencies"] = ["Use 3-letter ISO currency codes in capitals, like EUR."];

        if (problems.Count > 0) return TypedResults.ValidationProblem(problems);
        return TypedResults.Ok(await service.GetRatesAsync(days, codes, ct));
    }

    [GeneratedRegex("^[A-Z]{3}$")]
    private static partial Regex CurrencyCode();
}
