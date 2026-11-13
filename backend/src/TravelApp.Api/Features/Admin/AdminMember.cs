namespace TravelApp.Api.Features.Admin;

/// <summary>A back office team member: an existing account with a role and an authenticator app (TOTP).</summary>
internal sealed class AdminMember
{
    public Guid UserId { get; set; }

    /// <summary><see cref="AdminRoles"/>.</summary>
    public string Role { get; set; } = AdminRoles.Viewer;

    /// <summary>The authenticator key, encrypted (AES-GCM with a key derived from the signing key). Never shown again after setup.</summary>
    public string? TotpSecret { get; set; }

    /// <summary>Empty until the first code was right: until then every login shows the setup again.</summary>
    public DateTimeOffset? TotpConfirmedAt { get; set; }

    /// <summary>Time step of the last code used; a code can be used once only.</summary>
    public long TotpLastStep { get; set; }

    public int FailedCodes { get; set; }

    public DateTimeOffset? LockedUntil { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? LastLoginAt { get; set; }
}

/// <summary>One admin action (audit log). Ids and codes only: never an email, a name or any trip content.</summary>
internal sealed class AdminAuditEntry
{
    public Guid Id { get; set; }

    public DateTimeOffset At { get; set; }

    /// <summary>Who did it. Empty for actions before login is complete.</summary>
    public Guid? AdminUserId { get; set; }

    public string Action { get; set; } = "";

    /// <summary>"user", "member", "config".</summary>
    public string? TargetType { get; set; }

    public string? TargetId { get; set; }

    /// <summary>Codes only, for example "role=support" or "fields=MinAppVersion,FeatureFlags".</summary>
    public string? Details { get; set; }
}
