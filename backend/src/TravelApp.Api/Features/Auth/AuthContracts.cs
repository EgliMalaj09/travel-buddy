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
public sealed record SocialLoginRequest(
    [property: Required, MaxLength(AuthLimits.IdTokenMax)] string IdToken,
    [property: Required, MinLength(8), MaxLength(AuthLimits.DeviceIdMax)] string DeviceId,
    [property: MaxLength(AuthLimits.FirstNameMax)] string? FirstName = null);

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

/// <summary>The logged-in user as the app sees it.</summary>
/// <param name="AuthProviders">"email", "google", "apple".</param>
/// <param name="Profile">Empty until profile setup is done.</param>
/// <param name="SuggestedFirstName">First name from Google/Apple, the default in profile setup.</param>
/// <param name="Consents">Empty for Google/Apple users until profile setup.</param>
public sealed record AuthUserResponse(
    Guid Id,
    string Email,
    IReadOnlyList<string> AuthProviders,
    ProfileDto? Profile,
    string? SuggestedFirstName,
    ConsentsDto? Consents);

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
}

/// <summary>A public signing key (JSON Web Key, EC P-256).</summary>
public sealed record JwkDto(string Kty, string Crv, string X, string Y, string Kid, string Alg, string Use);

/// <summary>Public keys of our access tokens. PowerSync reads them (jwks_uri).</summary>
public sealed record JwksResponse(IReadOnlyList<JwkDto> Keys);
