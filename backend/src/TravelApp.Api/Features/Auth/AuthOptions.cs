namespace TravelApp.Api.Features.Auth;

/// <summary>Settings in the "Auth" configuration section. Secrets come from environment settings, never the repository.</summary>
public sealed class AuthOptions
{
    public const string Section = "Auth";

    /// <summary>"iss" of our tokens.</summary>
    public string Issuer { get; set; } = "travel-app";

    public string ApiAudience { get; set; } = "travel-app-api";

    public string PowerSyncAudience { get; set; } = "travel-app-powersync";

    /// <summary>
    /// ES256 private key (PEM, P-256). Required outside Development (Azure Key Vault in beta).
    /// In Development, when empty, a local key is created once in <see cref="DevKeyFile"/>.
    /// </summary>
    public string? SigningKeyPem { get; set; }

    /// <summary>Development only: where the local signing key is kept (git-ignored).</summary>
    public string DevKeyFile { get; set; } = ".dev-keys/jwt-signing-key.pem";

    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>Stay logged in for 1 year without use (A8).</summary>
    public TimeSpan RefreshTokenLifetime { get; set; } = TimeSpan.FromDays(365);

    /// <summary>A phone stays trusted 1 year after its last login (A8).</summary>
    public TimeSpan TrustedDeviceLifetime { get; set; } = TimeSpan.FromDays(365);

    /// <summary>Current version of the terms and privacy texts the user accepts.</summary>
    public string TermsVersion { get; set; } = "draft-1";

    public string PrivacyVersion { get; set; } = "draft-1";

    /// <summary>Google OAuth client ids allowed as "aud" (iOS, Android and web client ids).</summary>
    public List<string> GoogleClientIds { get; set; } = [];

    /// <summary>Apple "aud": the app's bundle id (placeholder app.travelapp.mobile).</summary>
    public List<string> AppleClientIds { get; set; } = [];

    /// <summary>Requests per minute per IP address on the /auth endpoints (built-in rate limiter).</summary>
    public int RequestsPerMinutePerIp { get; set; } = 30;

    /// <summary>Check new passwords against Pwned Passwords. Off only in tests.</summary>
    public bool CheckLeakedPasswords { get; set; } = true;

    /// <summary>
    /// Days between "Delete my account" and erasing everything for good (owner's choice, 13 Nov 2026).
    /// During this time a login offers "Restore". 0 erases at the next run of the purge job.
    /// </summary>
    public int DeletionGraceDays { get; set; } = 30;
}

/// <summary>Code rules (A5) and password lockout (A8).</summary>
internal static class AuthRules
{
    public static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(10);
    public const int CodeMaxAttempts = 5;
    public static readonly TimeSpan CodeMinInterval = TimeSpan.FromMinutes(1);
    public const int CodesPerHour = 5;
    public const int MaxFailedPasswords = 5;
    public static readonly TimeSpan Lockout = TimeSpan.FromMinutes(15);
}
