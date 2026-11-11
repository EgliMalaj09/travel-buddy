namespace TravelApp.Api.Features.Auth;

/// <summary>
/// A phone where the email code was entered (decisions/data-model.md, "TrustedDevice").
/// Email logins on a trusted phone need only the password. Trust ends 1 year after the last login there.
/// </summary>
public sealed class TrustedDevice
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>Random id the app creates on first open and keeps in secure storage.</summary>
    public required string DeviceId { get; set; }

    /// <summary>For example "Pixel 8". Optional.</summary>
    public string? Name { get; set; }

    public DateTimeOffset TrustedAt { get; set; }

    public DateTimeOffset LastSeenAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
}
