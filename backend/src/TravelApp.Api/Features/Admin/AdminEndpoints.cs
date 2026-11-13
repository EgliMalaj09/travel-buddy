using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.AppConfig;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Features.Admin;

/// <summary>
/// The back office API (KAN-55). /admin/auth is public (login); everything else needs a back office token
/// (scheme AdminBearer: app tokens do not work here) and a role checked against the team table on every call.
/// </summary>
public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var root = app.MapGroup("/admin").WithTags("Back office").RequireCors(AdminSetup.CorsPolicy)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        var auth = root.MapGroup("/auth").AllowAnonymous().RequireRateLimiting(AuthSetup.RateLimitPolicy);
        auth.MapPost("/login", Login).WithName("AdminLogin")
            .WithSummary("Back office login, step 1: email + password. Then the code from the authenticator app (or its setup)");
        auth.MapPost("/verify", Verify).WithName("AdminVerify").ProducesProblem(StatusCodes.Status400BadRequest)
            .WithSummary("Back office login, step 2: the 6-digit code. Returns a 30-minute back office token");

        var api = root.MapGroup("").RequireAuthorization(AdminSetup.AuthPolicy).RequireRateLimiting(AdminSetup.RateLimitPolicy)
            .ProducesProblem(StatusCodes.Status403Forbidden);
        var viewer = api.MapGroup("").AddEndpointFilter(new RequireAdminRole(AdminRoles.Viewer));
        var support = api.MapGroup("").AddEndpointFilter(new RequireAdminRole(AdminRoles.Support));
        var owner = api.MapGroup("").AddEndpointFilter(new RequireAdminRole(AdminRoles.Owner));

        viewer.MapGet("/me", Me).WithName("AdminMe").WithSummary("You: id, email and role");
        viewer.MapGet("/dashboard", Dashboard).WithName("AdminDashboard").WithSummary("Account counts, sign-ups per day and content totals");
        viewer.MapGet("/services", Services).WithName("AdminServices")
            .WithSummary("Status of the outside services, their plan and what to do before launch (cached 1 minute)");
        viewer.MapGet("/config", GetConfig).WithName("AdminGetConfig").WithSummary("App settings for every phone");
        owner.MapPut("/config", UpdateConfig).WithName("AdminUpdateConfig").ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Change the app settings. Send the version you started from; 409 when someone saved first");

        support.MapGet("/users", Users).WithName("AdminUsers")
            .WithSummary("Find accounts by id or part of the email; emails are masked. 25 per page, newest first");
        support.MapGet("/users/{id:guid}", User).WithName("AdminUser").ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("One account: status, consents, counts and trips (no names or places). Audited");
        support.MapPost("/users/{id:guid}/suspend", Suspend).WithName("AdminSuspendUser")
            .ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Suspend: no login and every session ends. Reason is a code");
        support.MapPost("/users/{id:guid}/unsuspend", Unsuspend).WithName("AdminUnsuspendUser").ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Lift a suspension");
        support.MapPost("/users/{id:guid}/sign-out", SignOut).WithName("AdminSignOutUser").ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("End every session on every phone (for example a lost phone)");
        owner.MapGet("/users/{id:guid}/export", Export).WithName("AdminExportUser").ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("The account's data file, for a GDPR access request that came by email. Audited");
        owner.MapPost("/users/{id:guid}/erase", Erase).WithName("AdminEraseUser")
            .ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Erase the account and all its data now (GDPR erasure request). Body {confirm: \"ERASE\"}. Cannot be undone");
        support.MapGet("/deletions", Deletions).WithName("AdminDeletions")
            .WithSummary("Accounts waiting to be erased (30 days after Delete my account), soonest first");

        owner.MapGet("/members", Members).WithName("AdminMembers").WithSummary("The back office team");
        owner.MapPost("/members", AddMember).WithName("AdminAddMember")
            .ProducesProblem(StatusCodes.Status400BadRequest).ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Add an existing account (with a password) to the team");
        owner.MapPut("/members/{userId:guid}", ChangeRole).WithName("AdminChangeRole")
            .ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Change a member's role");
        owner.MapDelete("/members/{userId:guid}", RemoveMember).WithName("AdminRemoveMember")
            .ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict)
            .WithSummary("Remove a member (works at once)");
        owner.MapPost("/members/{userId:guid}/reset-2fa", ResetTwoFactor).WithName("AdminResetTwoFactor")
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Lost phone: the member sets up the authenticator app again at the next login");
        owner.MapGet("/audit", Audit).WithName("AdminAudit").WithSummary("Every admin action, newest first, 25 per page");

        return app;
    }

    internal static async Task<Results<Ok<AdminLoginResponse>, ProblemHttpResult>> Login(
        AdminLoginRequest request, AdminAuthService service, CancellationToken ct) => OkOr(await service.LoginAsync(request, ct));

    internal static async Task<Results<Ok<AdminSessionResponse>, ProblemHttpResult>> Verify(
        AdminVerifyRequest request, AdminAuthService service, CancellationToken ct) => OkOr(await service.VerifyAsync(request, ct));

    internal static async Task<Ok<AdminMeDto>> Me(HttpContext http, IUserDirectory directory, CancellationToken ct)
    {
        var caller = AdminCaller.From(http);
        var email = (await directory.EmailsAsync([caller.UserId], ct)).GetValueOrDefault(caller.UserId) ?? "";
        return TypedResults.Ok(new AdminMeDto(caller.UserId, email, caller.Role));
    }

    internal static async Task<Ok<AdminDashboardDto>> Dashboard(AdminService service, CancellationToken ct) =>
        TypedResults.Ok(await service.DashboardAsync(ct));

    internal static async Task<Ok<AdminServicesDto>> Services(AdminStatusService status, CancellationToken ct, bool refresh = false)
    {
        var (at, items) = await status.GetAsync(refresh, ct);
        return TypedResults.Ok(new AdminServicesDto(at, items));
    }

    internal static async Task<Ok<AppConfigDto>> GetConfig(IAppConfigStore store, CancellationToken ct) =>
        TypedResults.Ok(await store.GetAsync(ct));

    internal static async Task<Results<Ok<AppConfigDto>, ProblemHttpResult>> UpdateConfig(
        UpdateAppConfigRequest request, AdminService service, HttpContext http, CancellationToken ct) =>
        OkOr(await service.UpdateConfigAsync(AdminCaller.From(http), request, ct));

    internal static async Task<Ok<AdminUserPageDto>> Users(
        AdminService service, HttpContext http, CancellationToken ct,
        [FromQuery, MaxLength(254)] string? q = null,
        [FromQuery, RegularExpression("^(active|suspended|deletion_requested)$")] string? status = null,
        [FromQuery, Range(0, 10000)] int page = 0) =>
        TypedResults.Ok(await service.SearchAsync(AdminCaller.From(http), q, status, page, ct));

    internal static async Task<Results<Ok<AdminUserDto>, ProblemHttpResult>> User(Guid id, AdminService service, HttpContext http, CancellationToken ct) =>
        OkOr(await service.GetUserAsync(AdminCaller.From(http), id, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> Suspend(
        Guid id, SuspendUserRequest request, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.SuspendAsync(AdminCaller.From(http), id, request.Reason, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> Unsuspend(Guid id, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.UnsuspendAsync(AdminCaller.From(http), id, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> SignOut(Guid id, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.SignOutAsync(AdminCaller.From(http), id, ct));

    internal static async Task<Results<Ok<AccountExportResponse>, ProblemHttpResult>> Export(Guid id, AdminService service, HttpContext http, CancellationToken ct) =>
        OkOr(await service.ExportAsync(AdminCaller.From(http), id, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> Erase(
        Guid id, EraseUserRequest request, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.EraseAsync(AdminCaller.From(http), id, ct));

    internal static async Task<Ok<IReadOnlyList<AdminDeletionDto>>> Deletions(AdminService service, HttpContext http, CancellationToken ct) =>
        TypedResults.Ok(await service.DeletionsAsync(AdminCaller.From(http), ct));

    internal static async Task<Ok<IReadOnlyList<AdminMemberDto>>> Members(AdminService service, CancellationToken ct) =>
        TypedResults.Ok(await service.MembersAsync(ct));

    internal static async Task<Results<Ok<AdminMemberDto>, ProblemHttpResult>> AddMember(
        AddAdminMemberRequest request, AdminService service, HttpContext http, CancellationToken ct) =>
        OkOr(await service.AddMemberAsync(AdminCaller.From(http), request, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> ChangeRole(
        Guid userId, ChangeAdminRoleRequest request, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.ChangeRoleAsync(AdminCaller.From(http), userId, request.Role, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> RemoveMember(Guid userId, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.RemoveMemberAsync(AdminCaller.From(http), userId, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> ResetTwoFactor(Guid userId, AdminService service, HttpContext http, CancellationToken ct) =>
        NoContentOr(await service.ResetTwoFactorAsync(AdminCaller.From(http), userId, ct));

    internal static async Task<Ok<AdminAuditPageDto>> Audit(
        AdminService service, CancellationToken ct,
        [FromQuery, MaxLength(40)] string? action = null,
        [FromQuery, Range(0, 10000)] int page = 0) =>
        TypedResults.Ok(await service.AuditAsync(action, page, ct));

    private static Results<Ok<T>, ProblemHttpResult> OkOr<T>(AdminResult<T> result) =>
        result.Error is { } error ? Problem(error) : TypedResults.Ok(result.Value!);

    private static Results<NoContent, ProblemHttpResult> NoContentOr<T>(AdminResult<T> result) =>
        result.Error is { } error ? Problem(error) : TypedResults.NoContent();

    private static ProblemHttpResult Problem(AdminFailure error) =>
        TypedResults.Problem(title: error.Title, statusCode: error.Status, extensions: new Dictionary<string, object?> { ["code"] = error.Code });
}

/// <param name="CheckedAt">When the services were last asked (answers are kept 1 minute).</param>
public sealed record AdminServicesDto(DateTimeOffset CheckedAt, IReadOnlyList<ServiceStatusDto> Services);
