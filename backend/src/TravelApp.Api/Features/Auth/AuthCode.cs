namespace TravelApp.Api.Features.Auth;

/// <summary>
/// A 6-digit code sent by email (decision A5): valid 10 minutes, at most 5 tries,
/// at most 1 per minute and 5 per hour per email. Only a hash of the code is stored.
/// </summary>
/// <remarks>
/// A sign-up code also holds the pending sign-up (password hash and consents), because the
/// account is created only when the code is entered.
/// </remarks>
public sealed class AuthCode
{
    public Guid Id { get; set; }

    /// <summary>Normalised (upper case) email the code was sent to.</summary>
    public required string Email { get; set; }

    /// <summary>"signup", "login" (new phone) or "reset" (forgot password).</summary>
    public required string Purpose { get; set; }

    /// <summary>SHA-256 of the code, hex.</summary>
    public required string CodeHash { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public int Attempts { get; set; }

    /// <summary>Set when the code was used or replaced by a newer one.</summary>
    public DateTimeOffset? ConsumedAt { get; set; }

    /// <summary>Sign-up only: Identity password hash, never the password.</summary>
    public string? PendingPasswordHash { get; set; }

    public bool PendingMarketingConsent { get; set; }
}

public static class CodePurpose
{
    public const string SignUp = "signup";
    public const string Login = "login";
    public const string Reset = "reset";
}
