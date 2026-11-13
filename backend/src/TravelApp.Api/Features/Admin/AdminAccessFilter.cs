using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Admin;

/// <summary>The team member making this request (set by <see cref="RequireAdminRole"/>).</summary>
internal sealed record AdminCaller(Guid UserId, string Role)
{
    private const string Key = "admin.caller";

    public static AdminCaller From(HttpContext http) =>
        http.Items[Key] as AdminCaller ?? throw new InvalidOperationException("No admin caller; is RequireAdminRole on this endpoint?");

    public void Store(HttpContext http) => http.Items[Key] = this;
}

/// <summary>
/// Checks the team table on every request, not only the token: removing someone or lowering their role
/// works at once, without waiting for their 30-minute token to end.
/// </summary>
internal sealed class RequireAdminRole(string minimumRole) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var userId = http.User.UserId();
        var db = http.RequestServices.GetRequiredService<AppDbContext>();
        var role = await db.Set<AdminMember>().AsNoTracking()
            .Where(m => m.UserId == userId && m.TotpConfirmedAt != null)
            .Select(m => m.Role).SingleOrDefaultAsync(http.RequestAborted);
        if (role is null) return TypedResults.Problem(statusCode: 401, title: "Please log in again.");
        if (AdminRoles.Rank(role) < AdminRoles.Rank(minimumRole))
        {
            return TypedResults.Problem(statusCode: 403, title: "Your role cannot do this. Ask an owner.");
        }

        new AdminCaller(userId, role).Store(http);
        // Back office answers can hold personal data: never kept by a proxy or the browser cache.
        http.Response.Headers.CacheControl = "no-store";
        return await next(context);
    }
}
