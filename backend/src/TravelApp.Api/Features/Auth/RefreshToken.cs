namespace TravelApp.Api.Features.Auth;

/// <summary>
/// A phone's login session (decisions/data-model.md, "RefreshToken", decision A4).
/// Only a hash of the token is stored. Every use replaces it with a new one; using an old one
/// again ends all sessions of the user (stolen token protection).
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public required string DeviceId { get; set; }

    /// <summary>SHA-256 of the token, hex. The token itself is never stored.</summary>
    public required string TokenHash { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>1 year after it was issued; each use issues a new token, so this is "1 year since last use".</summary>
    public DateTimeOffset ExpiresAt { get; set; }

    public Guid? ReplacedByTokenId { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ReplacedByTokenId is null && ExpiresAt > now;
}
