using System.Text.RegularExpressions;

namespace TravelApp.Api.Shared;

/// <summary>
/// Positions in a query (lat, lng) must be plain numbers with a decimal point. Without this,
/// "lat=41,8902" is read as 418902 (the comma counts as a thousands separator) and "lat=4,1" as 41,
/// a wrong but valid point. Such a value answers 400 "The request could not be read." and, as in
/// <see cref="BadRequestHandler"/>, the value is never logged or sent back (GDPR core rule).
/// Runs as middleware after login and rate limiting, so it comes before the endpoint's own checks.
/// </summary>
internal static partial class PlainNumberQueries
{
    private static readonly string[] Keys = ["lat", "lng"];

    public static WebApplication UsePlainNumberQueries(this WebApplication app, params string[] pathPrefixes)
    {
        app.Use(async (http, next) =>
        {
            if (pathPrefixes.Any(p => http.Request.Path.StartsWithSegments(p)) && HasBadNumber(http.Request.Query))
            {
                await TypedResults.Problem(statusCode: StatusCodes.Status400BadRequest, title: "The request could not be read.")
                    .ExecuteAsync(http);
                return;
            }

            await next(http);
        });
        return app;
    }

    internal static bool HasBadNumber(IQueryCollection query) =>
        Keys.Any(key => query.TryGetValue(key, out var values) && values.Any(v => v is not null && !PlainNumber().IsMatch(v)));

    [GeneratedRegex(@"^\s*[-+]?[0-9]+(\.[0-9]+)?\s*$")]
    private static partial Regex PlainNumber();
}
