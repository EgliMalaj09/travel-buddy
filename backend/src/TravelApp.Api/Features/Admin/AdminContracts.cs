using System.ComponentModel.DataAnnotations;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Features.Admin;

// Back office (KAN-55, decisions/features/16-back-office.md). Request and response types of /admin, and the small
// interfaces other features implement so the back office can show their numbers without reaching into them.

/// <summary>What each back office role may do. Each role can do everything the one before it can.</summary>
public static class AdminRoles
{
    /// <summary>Dashboard, service status and the app settings (read only).</summary>
    public const string Viewer = "viewer";

    /// <summary>+ find and view accounts, suspend, sign out everywhere, the deletion queue.</summary>
    public const string Support = "support";

    /// <summary>+ export and erase accounts, change app settings, manage the team, read the audit log.</summary>
    public const string Owner = "owner";

    public const string Pattern = "^(viewer|support|owner)$";

    public static int Rank(string role) => role switch { Owner => 3, Support => 2, Viewer => 1, _ => 0 };
}

/// <summary>Error codes in the "code" field of /admin error responses.</summary>
public static class AdminErrorCodes
{
    public const string InvalidCredentials = "invalid_credentials";
    public const string InvalidCode = "invalid_code";
    public const string InvalidToken = "invalid_token";
    public const string TooManyAttempts = "too_many_attempts";
    public const string NotFound = "not_found";
    public const string Conflict = "conflict";
    public const string Invalid = "invalid";
    public const string IsAdmin = "is_admin";
    public const string LastOwner = "last_owner";
    public const string NeedsPassword = "needs_password";
}

// ----- Interfaces other features implement -----

/// <summary>Numbers a feature adds to the dashboard and to an account's page. Counts only, never content.</summary>
public interface IAdminMetrics
{
    /// <summary>Totals across all accounts.</summary>
    Task<IReadOnlyList<AdminMetric>> TotalsAsync(DateTimeOffset now, CancellationToken ct);

    /// <summary>Counts for one account (records still in the database, deleted ones included).</summary>
    Task<IReadOnlyList<AdminMetric>> ForUserAsync(Guid userId, CancellationToken ct);
}

/// <param name="Key">Stable id, for example "trips".</param>
/// <param name="Label">Shown in the back office, for example "Trips".</param>
/// <param name="Hint">Small text under the number, for example "12 in the last 30 days".</param>
public sealed record AdminMetric(string Key, string Label, long Value, string? Hint = null);

/// <summary>An account's trips for support, without names, places or notes.</summary>
public interface IAdminTrips
{
    Task<IReadOnlyList<AdminTripDto>> ForUserAsync(Guid userId, int max, CancellationToken ct);
}

/// <param name="Status">planned or finished.</param>
/// <param name="Stops">Number of stops (cities).</param>
/// <param name="DeletedAt">Set when the user deleted it (kept for sync, removed later).</param>
public sealed record AdminTripDto(
    Guid Id, string Status, DateOnly? StartDate, DateOnly? EndDate, int Stops, DateTimeOffset CreatedAt, DateTimeOffset? DeletedAt);

/// <summary>One outside service the API or the app depends on, for the status page.</summary>
public interface IServiceStatusCheck
{
    Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct);
}

public static class ServiceStates
{
    public const string Ok = "ok";
    public const string Down = "down";
    public const string NotConfigured = "not_configured";

    /// <summary>Works, but in a development-only way (for example codes written to the log instead of emails).</summary>
    public const string DevOnly = "dev_only";
}

/// <param name="Key">Stable id, for example "weather".</param>
/// <param name="Name">The service, for example "Open-Meteo".</param>
/// <param name="UsedFor">What the app uses it for.</param>
/// <param name="State">ok, down, not_configured or dev_only (<see cref="ServiceStates"/>).</param>
/// <param name="LatencyMs">Time of the check call.</param>
/// <param name="Plan">The plan or terms we use now, for example "Free, non-commercial use only".</param>
/// <param name="BeforeLaunch">What to do before the public launch (switch list, decisions/releases.md).</param>
/// <param name="Detail">Short technical detail, for example "HTTP 503". Never personal data.</param>
public sealed record ServiceStatusDto(
    string Key, string Name, string UsedFor, string State, int? LatencyMs, string Plan, string BeforeLaunch, string? Detail = null);

// ----- Login -----

public sealed record AdminLoginRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, MaxLength(AuthLimits.PasswordMax)] string Password);

/// <param name="Kind">"codeRequired" (type the code from your authenticator app) or "setupRequired" (first login: add the key to the app first).</param>
/// <param name="Challenge">Send it back with the code. Valid 5 minutes.</param>
/// <param name="Secret">Only for setupRequired: the key to type into the authenticator app (Base32).</param>
/// <param name="OtpauthUri">Only for setupRequired: the same key as a link, shown as a QR code.</param>
public sealed record AdminLoginResponse(string Kind, string Challenge, string? Secret = null, string? OtpauthUri = null);

public sealed record AdminVerifyRequest(
    [property: Required, MaxLength(2000)] string Challenge,
    [property: Required, RegularExpression(AuthLimits.CodePattern)] string Code);

/// <param name="AccessToken">Send as "Authorization: Bearer". Valid 30 minutes; then log in again.</param>
public sealed record AdminSessionResponse(string AccessToken, DateTimeOffset ExpiresAt, AdminMeDto Me);

/// <param name="Email">Your own email (full).</param>
public sealed record AdminMeDto(Guid UserId, string Email, string Role);

// ----- Dashboard -----

/// <param name="Users">Account counts.</param>
/// <param name="Content">One number per feature (trips, places, photos, ...).</param>
public sealed record AdminDashboardDto(DateTimeOffset At, DirectoryTotals Users, IReadOnlyList<AdminMetric> Content);

// ----- Accounts -----

/// <summary>An account in a list. The email is masked (j***@gmail.com); open the account to see it.</summary>
/// <param name="Status">active, suspended or deletion_requested.</param>
public sealed record AdminUserRowDto(
    Guid Id, string MaskedEmail, string Status, IReadOnlyList<string> AuthProviders, DateTimeOffset CreatedAt, DateTimeOffset? LastActiveAt);

public sealed record AdminUserPageDto(IReadOnlyList<AdminUserRowDto> Users, int Total, int Page, int PageSize);

/// <summary>One account for support. No name, countries, trip names or places: support does not need them.</summary>
/// <param name="IsAdmin">This account is in the back office team (remove it from the team before suspending or erasing).</param>
public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string Status,
    IReadOnlyList<string> AuthProviders,
    bool HasPassword,
    DateTimeOffset CreatedAt,
    DateTimeOffset? OnboardingCompletedAt,
    string? TermsVersion,
    DateTimeOffset? TermsAcceptedAt,
    string? PrivacyVersion,
    DateTimeOffset? PrivacyAcceptedAt,
    bool MarketingConsent,
    DateTimeOffset? DeletionRequestedAt,
    DateTimeOffset? DeleteAfter,
    DateTimeOffset? SuspendedAt,
    string? SuspensionReason,
    DateTimeOffset? LastActiveAt,
    int ActiveSessions,
    bool IsAdmin,
    IReadOnlyList<AdminMetric> Counts,
    IReadOnlyList<AdminTripDto> Trips);

/// <param name="Reason">abuse, fraud, security, legal or other. A code only: never write personal data here.</param>
public sealed record SuspendUserRequest([property: Required, RegularExpression(SuspensionReasons.Pattern)] string Reason);

/// <param name="Confirm">Exactly "ERASE".</param>
public sealed record EraseUserRequest(
    [property: Required, RegularExpression("^ERASE$", ErrorMessage = "Type ERASE to confirm.")] string Confirm);

/// <summary>An account waiting to be erased.</summary>
public sealed record AdminDeletionDto(Guid Id, string MaskedEmail, DateTimeOffset? RequestedAt, DateTimeOffset? DeleteAfter);

// ----- Team -----

/// <param name="TwoFactorReady">The member has finished setting up the authenticator app.</param>
public sealed record AdminMemberDto(
    Guid UserId, string MaskedEmail, string Role, bool TwoFactorReady, DateTimeOffset AddedAt, DateTimeOffset? LastLoginAt);

/// <summary>Adds an existing account (with a password) to the team.</summary>
public sealed record AddAdminMemberRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, RegularExpression(AdminRoles.Pattern)] string Role);

public sealed record ChangeAdminRoleRequest([property: Required, RegularExpression(AdminRoles.Pattern)] string Role);

// ----- Audit -----

/// <summary>One admin action. Ids and codes only, never personal data.</summary>
/// <param name="Action">For example "user.suspended" (<see cref="AdminActions"/>).</param>
/// <param name="AdminMaskedEmail">Who did it (masked).</param>
/// <param name="Details">Codes such as the role or the changed setting names.</param>
public sealed record AdminAuditDto(
    Guid Id, DateTimeOffset At, Guid? AdminUserId, string? AdminMaskedEmail, string Action, string? TargetType, string? TargetId, string? Details);

public sealed record AdminAuditPageDto(IReadOnlyList<AdminAuditDto> Entries, int Total, int Page, int PageSize);

/// <summary>Every audited action.</summary>
public static class AdminActions
{
    public const string Login = "admin.login";
    public const string TwoFactorEnrolled = "admin.2fa_enrolled";
    public const string CodeFailed = "admin.code_failed";
    public const string UsersSearched = "users.searched";
    public const string UserViewed = "user.viewed";
    public const string UserSuspended = "user.suspended";
    public const string UserUnsuspended = "user.unsuspended";
    public const string UserSignedOut = "user.signed_out";
    public const string UserExported = "user.exported";
    public const string UserErased = "user.erased";
    public const string DeletionsViewed = "deletions.viewed";
    public const string ConfigUpdated = "config.updated";
    public const string MemberAdded = "member.added";
    public const string MemberRoleChanged = "member.role_changed";
    public const string MemberRemoved = "member.removed";
    public const string MemberTwoFactorReset = "member.2fa_reset";
}

/// <summary>Settings in the "Admin" configuration section.</summary>
public sealed class AdminOptions
{
    public const string Section = "Admin";

    /// <summary>
    /// Accounts that become owners on their first back office login (how the very first owner gets in).
    /// The account must already exist with a password. Set in the environment, never in the repository.
    /// </summary>
    public List<string> OwnerEmails { get; set; } = [];

    /// <summary>Web addresses of the back office site allowed to call /admin from a browser (CORS), for example https://admin.example.com.</summary>
    public List<string> AllowedOrigins { get; set; } = [];

    public TimeSpan TokenLifetime { get; set; } = TimeSpan.FromMinutes(30);

    /// <summary>Audit entries older than this are removed (GDPR: kept only as long as needed).</summary>
    public int AuditKeepDays { get; set; } = 730;

    /// <summary>PowerSync address for the status page (locally http://localhost:8080).</summary>
    public string? PowerSyncUrl { get; set; }

    /// <summary>Map style used by the app, for the status page.</summary>
    public string MapStyleUrl { get; set; } = "https://tiles.openfreemap.org/styles/liberty";
}
