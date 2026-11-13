using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.AppConfig;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Features.Admin;

/// <summary>
/// Everything the back office does after login (KAN-55). Each action that reads an account or changes anything
/// writes one audit entry. Lists show masked emails; only the account page shows the full email.
/// </summary>
internal sealed partial class AdminService(
    AppDbContext db,
    IUserDirectory directory,
    IAccountAdmin accounts,
    IAppConfigStore config,
    IEnumerable<IAdminMetrics> metrics,
    IAdminTrips trips,
    AdminAudit audit,
    TimeProvider clock,
    ILogger<AdminService> logger)
{
    public const int PageSize = 25;

    internal static readonly AdminFailure NotFound = new(404, AdminErrorCodes.NotFound, "No account with this id.");
    internal static readonly AdminFailure IsAdmin = new(409, AdminErrorCodes.IsAdmin, "This account is in the back office team. Remove it from the team first.");
    internal static readonly AdminFailure LastOwner = new(409, AdminErrorCodes.LastOwner, "The team needs at least one owner, and you cannot remove or demote yourself.");
    internal static readonly AdminFailure NeedsPassword = new(400, AdminErrorCodes.NeedsPassword, "No account with this email and a password. They must sign up in the app with email and password first.");

    public async Task<AdminDashboardDto> DashboardAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var users = await directory.TotalsAsync(now, ct);
        var content = new List<AdminMetric>();
        foreach (var m in metrics) content.AddRange(await m.TotalsAsync(now, ct));
        return new AdminDashboardDto(now, users, content);
    }

    public async Task<AdminUserPageDto> SearchAsync(AdminCaller caller, string? q, string? status, int page, CancellationToken ct)
    {
        var result = await directory.SearchAsync(q, status, page, PageSize, ct);
        // The search words can be an email, so they are not stored; only that a search happened.
        await audit.WriteAsync(caller.UserId, AdminActions.UsersSearched, null, null, status is null ? null : $"status={status}", ct);
        var rows = result.Users.Select(u => new AdminUserRowDto(u.Id, AdminText.MaskEmail(u.Email), u.Status, u.AuthProviders, u.CreatedAt, u.LastActiveAt)).ToList();
        return new AdminUserPageDto(rows, result.Total, page, PageSize);
    }

    public async Task<AdminResult<AdminUserDto>> GetUserAsync(AdminCaller caller, Guid id, CancellationToken ct)
    {
        if (await directory.GetAsync(id, ct) is not { } u) return NotFound;
        await audit.WriteAsync(caller.UserId, AdminActions.UserViewed, "user", id.ToString(), null, ct);
        var counts = new List<AdminMetric>();
        foreach (var m in metrics) counts.AddRange(await m.ForUserAsync(id, ct));
        var isAdmin = await db.Set<AdminMember>().AnyAsync(m => m.UserId == id, ct);
        return new AdminUserDto(u.Id, u.Email, u.Status, u.AuthProviders, u.HasPassword, u.CreatedAt, u.OnboardingCompletedAt,
            u.TermsVersion, u.TermsAcceptedAt, u.PrivacyVersion, u.PrivacyAcceptedAt, u.MarketingConsent, u.DeletionRequestedAt,
            u.DeleteAfter, u.SuspendedAt, u.SuspensionReason, u.LastActiveAt, u.ActiveSessions, isAdmin, counts,
            await trips.ForUserAsync(id, 50, ct));
    }

    public async Task<AdminResult<bool>> SuspendAsync(AdminCaller caller, Guid id, string reason, CancellationToken ct)
    {
        if (await db.Set<AdminMember>().AnyAsync(m => m.UserId == id, ct)) return IsAdmin;
        if (!await directory.SuspendAsync(id, reason, ct)) return NotFound;
        await audit.WriteAsync(caller.UserId, AdminActions.UserSuspended, "user", id.ToString(), $"reason={reason}", ct);
        return true;
    }

    public async Task<AdminResult<bool>> UnsuspendAsync(AdminCaller caller, Guid id, CancellationToken ct)
    {
        if (!await directory.UnsuspendAsync(id, ct)) return NotFound;
        await audit.WriteAsync(caller.UserId, AdminActions.UserUnsuspended, "user", id.ToString(), null, ct);
        return true;
    }

    public async Task<AdminResult<bool>> SignOutAsync(AdminCaller caller, Guid id, CancellationToken ct)
    {
        if (!await directory.SignOutEverywhereAsync(id, ct)) return NotFound;
        await audit.WriteAsync(caller.UserId, AdminActions.UserSignedOut, "user", id.ToString(), null, ct);
        return true;
    }

    public async Task<AdminResult<AccountExportResponse>> ExportAsync(AdminCaller caller, Guid id, CancellationToken ct)
    {
        if (await directory.GetAsync(id, ct) is null) return NotFound;
        var export = await accounts.ExportAsync(id, ct);
        await audit.WriteAsync(caller.UserId, AdminActions.UserExported, "user", id.ToString(), null, ct);
        return export;
    }

    public async Task<AdminResult<bool>> EraseAsync(AdminCaller caller, Guid id, CancellationToken ct)
    {
        if (await db.Set<AdminMember>().AnyAsync(m => m.UserId == id, ct)) return IsAdmin;
        if (!await directory.SignOutEverywhereAsync(id, ct)) return NotFound;
        await accounts.EraseNowAsync(id, ct);
        await audit.WriteAsync(caller.UserId, AdminActions.UserErased, "user", id.ToString(), null, ct);
        LogErased(id, caller.UserId);
        return true;
    }

    public async Task<IReadOnlyList<AdminDeletionDto>> DeletionsAsync(AdminCaller caller, CancellationToken ct)
    {
        var rows = await directory.DeletionRequestsAsync(200, ct);
        await audit.WriteAsync(caller.UserId, AdminActions.DeletionsViewed, null, null, null, ct);
        return rows.Select(u => new AdminDeletionDto(u.Id, AdminText.MaskEmail(u.Email), u.DeletionRequestedAt, u.DeleteAfter)).ToList();
    }

    public async Task<AdminResult<AppConfigDto>> UpdateConfigAsync(AdminCaller caller, UpdateAppConfigRequest request, CancellationToken ct)
    {
        var result = await config.UpdateAsync(request, ct);
        if (result.Error == "conflict") return new AdminFailure(409, AdminErrorCodes.Conflict, result.Reason!);
        if (result.Error is not null) return new AdminFailure(400, AdminErrorCodes.Invalid, result.Reason!);
        if (result.ChangedFields.Count > 0)
        {
            await audit.WriteAsync(caller.UserId, AdminActions.ConfigUpdated, "config", "app", $"fields={string.Join(',', result.ChangedFields)}", ct);
        }

        return result.Config!;
    }

    public async Task<IReadOnlyList<AdminMemberDto>> MembersAsync(CancellationToken ct)
    {
        var members = await db.Set<AdminMember>().AsNoTracking().OrderBy(m => m.CreatedAt).ToListAsync(ct);
        var emails = await directory.EmailsAsync(members.Select(m => m.UserId).ToList(), ct);
        return members.Select(m => new AdminMemberDto(m.UserId, AdminText.MaskEmail(emails.GetValueOrDefault(m.UserId)), m.Role,
            m.TotpConfirmedAt is not null, m.CreatedAt, m.LastLoginAt)).ToList();
    }

    public async Task<AdminResult<AdminMemberDto>> AddMemberAsync(AdminCaller caller, AddAdminMemberRequest request, CancellationToken ct)
    {
        if (await directory.FindWithPasswordAsync(request.Email, ct) is not { } userId) return NeedsPassword;
        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct);
        if (member is not null) return new AdminFailure(409, AdminErrorCodes.Conflict, "This account is already in the team.");
        member = new AdminMember { UserId = userId, Role = request.Role, CreatedAt = clock.GetUtcNow(), CreatedBy = caller.UserId };
        db.Add(member);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(caller.UserId, AdminActions.MemberAdded, "member", userId.ToString(), $"role={request.Role}", ct);
        return new AdminMemberDto(userId, AdminText.MaskEmail(request.Email), member.Role, false, member.CreatedAt, null);
    }

    public async Task<AdminResult<bool>> ChangeRoleAsync(AdminCaller caller, Guid userId, string role, CancellationToken ct)
    {
        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct);
        if (member is null) return new AdminFailure(404, AdminErrorCodes.NotFound, "Not in the team.");
        if (member.Role == role) return true;
        if (member.Role == AdminRoles.Owner && (userId == caller.UserId || await OwnersAsync(ct) <= 1)) return LastOwner;
        member.Role = role;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(caller.UserId, AdminActions.MemberRoleChanged, "member", userId.ToString(), $"role={role}", ct);
        return true;
    }

    public async Task<AdminResult<bool>> RemoveMemberAsync(AdminCaller caller, Guid userId, CancellationToken ct)
    {
        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct);
        if (member is null) return new AdminFailure(404, AdminErrorCodes.NotFound, "Not in the team.");
        if (userId == caller.UserId || (member.Role == AdminRoles.Owner && await OwnersAsync(ct) <= 1)) return LastOwner;
        db.Remove(member);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(caller.UserId, AdminActions.MemberRemoved, "member", userId.ToString(), null, ct);
        return true;
    }

    /// <summary>Lost phone: the member sets up the authenticator app again at their next login.</summary>
    public async Task<AdminResult<bool>> ResetTwoFactorAsync(AdminCaller caller, Guid userId, CancellationToken ct)
    {
        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct);
        if (member is null) return new AdminFailure(404, AdminErrorCodes.NotFound, "Not in the team.");
        member.TotpSecret = null;
        member.TotpConfirmedAt = null;
        member.TotpLastStep = 0;
        member.FailedCodes = 0;
        member.LockedUntil = null;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(caller.UserId, AdminActions.MemberTwoFactorReset, "member", userId.ToString(), null, ct);
        return true;
    }

    public async Task<AdminAuditPageDto> AuditAsync(string? action, int page, CancellationToken ct)
    {
        var entries = db.Set<AdminAuditEntry>().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(action)) entries = entries.Where(e => e.Action == action);
        var total = await entries.CountAsync(ct);
        var rows = await entries.OrderByDescending(e => e.At).ThenByDescending(e => e.Id)
            .Skip(Math.Max(0, page) * PageSize).Take(PageSize).ToListAsync(ct);
        var adminIds = rows.Where(r => r.AdminUserId is not null).Select(r => r.AdminUserId!.Value).Distinct().ToList();
        var emails = await directory.EmailsAsync(adminIds, ct);
        var dtos = rows.Select(r => new AdminAuditDto(r.Id, r.At, r.AdminUserId,
            r.AdminUserId is { } a && emails.TryGetValue(a, out var e) ? AdminText.MaskEmail(e) : null,
            r.Action, r.TargetType, r.TargetId, r.Details)).ToList();
        return new AdminAuditPageDto(dtos, total, page, PageSize);
    }

    private Task<int> OwnersAsync(CancellationToken ct) => db.Set<AdminMember>().CountAsync(m => m.Role == AdminRoles.Owner, ct);

    // Only opaque ids (GDPR core rule).
    [LoggerMessage(Level = LogLevel.Warning, Message = "Account {UserId} erased now by admin {AdminId}")]
    private partial void LogErased(Guid userId, Guid adminId);
}
