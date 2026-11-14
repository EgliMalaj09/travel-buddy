using System.ComponentModel.DataAnnotations;

namespace TravelApp.Api.Features.Auth;

// Request and response types of sign-up, login and profile setup
// (decisions/features/01-login-onboarding.md). The app generates its types from these.

public static class AuthLimits
{
    public const int EmailMax = 254;
    public const int PasswordMin = 10;
    public const int PasswordMax = 128;
    public const int DeviceIdMax = 100;
    public const int DeviceNameMax = 100;
    public const int FirstNameMax = 60;
    public const int IdTokenMax = 8000;
    public const int NonceMin = 16;
    public const int NonceMax = 128;
    public const string CodePattern = "^[0-9]{6}$";
    public const string CountryPattern = "^[A-Z]{2}$";
    public const string CurrencyPattern = "^[A-Z]{3}$";
}

/// <summary>"I am 16 or older", terms and privacy, travel tips by email.</summary>
/// <param name="AgeConfirmed">Must be true.</param>
/// <param name="TermsAccepted">Terms and privacy accepted. Must be true.</param>
/// <param name="MarketingConsent">Travel tips by email. Optional, off by default.</param>
public sealed record ConsentsDto(bool AgeConfirmed, bool TermsAccepted, bool MarketingConsent);

/// <summary>Step 1 of email sign-up. Sends a 6-digit code to the email.</summary>
public sealed record SignUpRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, MinLength(AuthLimits.PasswordMin), MaxLength(AuthLimits.PasswordMax)] string Password,
    [property: Required] ConsentsDto Consents);

/// <summary>Email + code + this phone. Used to finish sign-up and to log in on a new phone.</summary>
public sealed record VerifyCodeRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, RegularExpression(AuthLimits.CodePattern)] string Code,
    [property: Required, MinLength(8), MaxLength(AuthLimits.DeviceIdMax)] string DeviceId,
    [property: MaxLength(AuthLimits.DeviceNameMax)] string? DeviceName = null);

public sealed record LoginRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, MaxLength(AuthLimits.PasswordMax)] string Password,
    [property: Required, MinLength(8), MaxLength(AuthLimits.DeviceIdMax)] string DeviceId);

/// <summary>Login answer: a session, or "a code was sent" when the phone is not trusted yet.</summary>
/// <param name="Kind">"session" or "codeRequired".</param>
/// <param name="Session">Set when Kind is "session".</param>
public sealed record LoginResponse(string Kind, SessionResponse? Session);

/// <summary>Google or Apple sign-in, also creates the account when it is new.</summary>
/// <param name="IdToken">The ID token from the Google or Apple sign-in sheet.</param>
/// <param name="DeviceId">This phone.</param>
/// <param name="FirstName">Apple gives the name to the app only on the first sign-in; send it then.</param>
/// <param name="Nonce">
/// The random text the app made for this sign-in (not hashed). The app gave its SHA-256 (hex) to the sign-in sheet,
/// so the token carries it; the API checks they match. Required for Apple; for Google only when the token has a nonce.
/// </param>
public sealed record SocialLoginRequest(
    [property: Required, MaxLength(AuthLimits.IdTokenMax)] string IdToken,
    [property: Required, MinLength(8), MaxLength(AuthLimits.DeviceIdMax)] string DeviceId,
    [property: MaxLength(AuthLimits.FirstNameMax)] string? FirstName = null,
    [property: MinLength(AuthLimits.NonceMin), MaxLength(AuthLimits.NonceMax)] string? Nonce = null);

/// <param name="Purpose">"signup" or "login".</param>
public sealed record ResendCodeRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, RegularExpression("^(signup|login)$")] string Purpose);

public sealed record ForgotPasswordRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email);

public sealed record ResetPasswordRequest(
    [property: Required, EmailAddress, MaxLength(AuthLimits.EmailMax)] string Email,
    [property: Required, RegularExpression(AuthLimits.CodePattern)] string Code,
    [property: Required, MinLength(AuthLimits.PasswordMin), MaxLength(AuthLimits.PasswordMax)] string NewPassword);

public sealed record RefreshRequest([property: Required, MaxLength(200)] string RefreshToken);

public sealed record LogoutRequest([property: Required, MaxLength(200)] string RefreshToken);

/// <summary>Profile setup (2 steps after sign-up). Google/Apple users also send their consents here.</summary>
/// <param name="Language">From the phone, for example "en".</param>
/// <param name="TimeZone">From the phone (IANA), for example "Europe/Tirane".</param>
public sealed record ProfileRequest(
    [property: Required, MinLength(1), MaxLength(AuthLimits.FirstNameMax)] string FirstName,
    [property: Required, RegularExpression(AuthLimits.CountryPattern)] string PassportCountry,
    [property: Required, RegularExpression(AuthLimits.CountryPattern)] string ResidenceCountry,
    [property: Required, RegularExpression(AuthLimits.CurrencyPattern)] string HomeCurrency,
    ConsentsDto? Consents = null,
    [property: MaxLength(10)] string? Language = null,
    [property: MaxLength(64)] string? TimeZone = null);

public sealed record ProfileDto(string FirstName, string PassportCountry, string ResidenceCountry, string HomeCurrency);

/// <summary>Set while the account waits to be erased (KAN-22). The app then shows only "Restore" or "Log out".</summary>
/// <param name="RequestedAt">When the user asked to delete the account.</param>
/// <param name="DeleteAfter">From this moment everything is erased for good.</param>
public sealed record AccountDeletionDto(DateTimeOffset RequestedAt, DateTimeOffset DeleteAfter);

/// <summary>The logged-in user as the app sees it.</summary>
/// <param name="AuthProviders">"email", "google", "apple".</param>
/// <param name="Profile">Empty until profile setup is done.</param>
/// <param name="SuggestedFirstName">First name from Google/Apple, the default in profile setup.</param>
/// <param name="Consents">Empty for Google/Apple users until profile setup.</param>
/// <param name="Deletion">Set when the account is waiting to be erased; empty for a normal account.</param>
public sealed record AuthUserResponse(
    Guid Id,
    string Email,
    IReadOnlyList<string> AuthProviders,
    ProfileDto? Profile,
    string? SuggestedFirstName,
    ConsentsDto? Consents,
    AccountDeletionDto? Deletion = null);

/// <summary>"Delete my account". The user must type the word DELETE, so a stray tap or a replayed call cannot do it.</summary>
/// <param name="Confirm">Exactly "DELETE".</param>
public sealed record DeleteAccountRequest(
    [property: Required, RegularExpression("^DELETE$", ErrorMessage = "Type DELETE to confirm.")] string Confirm);

/// <param name="AccessToken">JWT (ES256), valid 15 minutes. Works for this API and PowerSync.</param>
/// <param name="AccessTokenExpiresAt">When the access token stops working.</param>
/// <param name="RefreshToken">Keep in secure storage. Valid 1 year since last use; replaced on every refresh.</param>
public sealed record SessionResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    AuthUserResponse User);

/// <summary>
/// Error codes in the "code" field of auth error responses (ProblemDetails). The app shows its own text for each.
/// </summary>
public static class AuthErrorCodes
{
    public const string InvalidCredentials = "invalid_credentials";
    public const string InvalidCode = "invalid_code";
    public const string EmailTaken = "email_taken";
    public const string TooManyAttempts = "too_many_attempts";
    public const string SessionExpired = "session_expired";
    public const string PasswordLeaked = "password_leaked";
    public const string InvalidToken = "invalid_token";
    public const string ConsentRequired = "consent_required";

    /// <summary>The account is waiting to be erased: the phone removes this account's data and shows the login.</summary>
    public const string AccountDeleted = "account_deleted";

    /// <summary>The back office suspended this account (KAN-55). The app shows "Contact support".</summary>
    public const string AccountSuspended = "account_suspended";

    /// <summary>Restore asked for an account that is not waiting to be erased.</summary>
    public const string NotDeleted = "not_deleted";

    /// <summary>Google's or Apple's key server could not be reached: try again later, or log in with email.</summary>
    public const string ProviderUnavailable = "provider_unavailable";
}

/// <summary>A public signing key (JSON Web Key, EC P-256).</summary>
public sealed record JwkDto(string Kty, string Crv, string X, string Y, string Kid, string Alg, string Use);

/// <summary>Public keys of our access tokens. PowerSync reads them (jwks_uri).</summary>
public sealed record JwksResponse(IReadOnlyList<JwkDto> Keys);

// ---------------------------------------------------------------------------------------------------------------
// Back office (KAN-55). Auth owns the accounts and the signing key; the Admin feature only uses these interfaces.
// ---------------------------------------------------------------------------------------------------------------

/// <summary>Password check and tokens for the back office login.</summary>
public interface IAdminAccess
{
    /// <summary>
    /// Checks email + password with the same lockout as the app (5 wrong tries, 15 minutes).
    /// Suspended accounts and accounts waiting to be erased never pass.
    /// </summary>
    Task<AdminPasswordResult> CheckPasswordAsync(string email, string password, CancellationToken ct);

    /// <summary>A signed token (ES256, our issuer) for <paramref name="audience"/> with "sub" = the user id.</summary>
    string IssueToken(Guid userId, string audience, TimeSpan lifetime);

    /// <summary>The user id of a token made by <see cref="IssueToken"/> for this audience, or null when it is not valid.</summary>
    Task<Guid?> ReadTokenAsync(string token, string audience);

    /// <summary>A 32-byte key for <paramref name="purpose"/>, derived from the signing key (no extra secret to keep).</summary>
    byte[] DeriveKey(string purpose);

    /// <summary>"aud" of back office access tokens.</summary>
    string AdminAudience { get; }
}

/// <param name="UserId">Set when the password is right.</param>
/// <param name="Locked">Too many wrong tries; wait 15 minutes.</param>
public sealed record AdminPasswordResult(Guid? UserId, bool Locked);

/// <summary>Accounts as the back office sees them.</summary>
public interface IUserDirectory
{
    /// <summary>
    /// Newest first. <paramref name="query"/> is a user id or part of an email (3+ characters);
    /// <paramref name="status"/> is active, suspended or deletion_requested.
    /// </summary>
    Task<DirectoryPage> SearchAsync(string? query, string? status, int page, int pageSize, CancellationToken ct);

    Task<DirectoryUser?> GetAsync(Guid userId, CancellationToken ct);

    /// <summary>Emails of these users (to show admins and audit entries, masked by the caller).</summary>
    Task<IReadOnlyDictionary<Guid, string>> EmailsAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct);

    /// <summary>The account with this email that can log in with a password, or null.</summary>
    Task<Guid?> FindWithPasswordAsync(string email, CancellationToken ct);

    /// <summary>Suspends the account and ends every session. False when there is no such account.</summary>
    Task<bool> SuspendAsync(Guid userId, string reason, CancellationToken ct);

    Task<bool> UnsuspendAsync(Guid userId, CancellationToken ct);

    /// <summary>Ends every session on every phone (for example a lost phone).</summary>
    Task<bool> SignOutEverywhereAsync(Guid userId, CancellationToken ct);

    /// <summary>Accounts waiting to be erased, soonest first.</summary>
    Task<IReadOnlyList<DirectoryUser>> DeletionRequestsAsync(int max, CancellationToken ct);

    /// <summary>Counts for the dashboard.</summary>
    Task<DirectoryTotals> TotalsAsync(DateTimeOffset now, CancellationToken ct);
}

public sealed record DirectoryPage(IReadOnlyList<DirectoryUser> Users, int Total);

/// <summary>One account. No profile fields (name, countries): the back office does not need them.</summary>
public sealed record DirectoryUser(
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
    int ActiveSessions);

/// <param name="ActiveLast7Days">Accounts with a session started or refreshed in the last 7 days.</param>
/// <param name="SignUpsPerDay">Last 30 days, oldest first, one entry per day (UTC) including days with 0.</param>
public sealed record DirectoryTotals(
    int Total,
    int Active,
    int Suspended,
    int DeletionRequested,
    int NewLast7Days,
    int NewLast30Days,
    int ActiveLast7Days,
    int ActiveLast30Days,
    IReadOnlyList<DayCount> SignUpsPerDay);

public sealed record DayCount(DateOnly Day, int Count);
