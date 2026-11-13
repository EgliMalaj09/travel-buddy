using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// "Download my data" (KAN-22). Settings are not here: they sync through PowerSync (stream "my_settings") and
/// POST /sync/upload (type "user_settings"). Delete and restore are in Auth (/me/delete, /me/restore), which owns the account.
/// </summary>
public static class AccountEndpoints
{
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var me = app.MapGroup("/me").WithTags("Me").RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);
        me.MapGet("/export", Export).WithName("ExportMyData")
            .RequireRateLimiting(AccountSetup.ExportRateLimitPolicy)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .WithSummary("Download my data: everything the server keeps about you, as JSON (GDPR right of access). 5 per hour");
        return app;
    }

    internal static async Task<Ok<AccountExportResponse>> Export(ClaimsPrincipal user, AccountService service, HttpContext http, CancellationToken ct)
    {
        var export = await service.ExportAsync(user.UserId(), ct);
        // Personal data: never kept by a proxy or the phone's HTTP cache.
        http.Response.Headers.CacheControl = "no-store";
        return TypedResults.Ok(export);
    }
}
