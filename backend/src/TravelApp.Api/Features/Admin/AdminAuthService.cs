using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Features.Admin;

/// <summary>An /admin error: HTTP status and one of <see cref="AdminErrorCodes"/>.</summary>
internal sealed record AdminFailure(int Status, string Code, string Title);

/// <summary>Either a value or an <see cref="AdminFailure"/>.</summary>
internal sealed record AdminResult<T>(T? Value, AdminFailure? Error)
{
#pragma warning disable CA2225 // Conversions keep the service code short.
    public static implicit operator AdminResult<T>(T value) => new(value, null);

    public static implicit operator AdminResult<T>(AdminFailure error) => new(default, error);
#pragma warning restore CA2225
}

/// <summary>
/// Back office login (KAN-55): email + password (the account's own), then a 6-digit code from an authenticator app.
/// The first login of a new member shows the key to add to the app; the first right code finishes the setup.
/// </summary>
internal sealed partial class AdminAuthService(
    AppDbContext db,
    IAdminAccess access,
    IUserDirectory directory,
    AdminAudit audit,
    IOptions<AdminOptions> options,
    TimeProvider clock,
    ILogger<AdminAuthService> logger)
{
    public const string ChallengeAudience = "travel-app-admin-2fa";
    public const string TotpKeyPurpose = "admin-totp-v1";
    private const string Issuer = "Travel App admin";
    private static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(5);
    private const int MaxFailedCodes = 5;
    private static readonly TimeSpan CodeLockout = TimeSpan.FromMinutes(15);

    // The same answer whether the email is unknown, the password is wrong or the account is not in the team,
    // so the login page never tells anyone who is an admin.
    internal static readonly AdminFailure InvalidCredentials = new(401, AdminErrorCodes.InvalidCredentials, "Email or password is not right.");
    internal static readonly AdminFailure TooMany = new(429, AdminErrorCodes.TooManyAttempts, "Too many tries. Wait 15 minutes and try again.");
    internal static readonly AdminFailure InvalidCode = new(400, AdminErrorCodes.InvalidCode, "That code is not right. Check the time on your phone and try the next code.");
    internal static readonly AdminFailure InvalidToken = new(401, AdminErrorCodes.InvalidToken, "The login took too long. Start again.");

    public async Task<AdminResult<AdminLoginResponse>> LoginAsync(AdminLoginRequest request, CancellationToken ct)
    {
        var check = await access.CheckPasswordAsync(request.Email, request.Password, ct);
        if (check.Locked) return TooMany;
        if (check.UserId is not { } userId) return InvalidCredentials;

        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct)
            ?? await BootstrapOwnerAsync(userId, request.Email, ct);
        if (member is null) return InvalidCredentials;
        if (member.LockedUntil > clock.GetUtcNow()) return TooMany;

        var challenge = access.IssueToken(userId, ChallengeAudience, ChallengeLifetime);
        if (member.TotpConfirmedAt is not null) return new AdminLoginResponse("codeRequired", challenge);

        // Not set up yet: a new key on every try until the first right code, so an old screenshot is useless.
        var secret = Totp.NewSecret();
        member.TotpSecret = Totp.Protect(secret, access.DeriveKey(TotpKeyPurpose));
        member.TotpLastStep = 0;
        await db.SaveChangesAsync(ct);
        var base32 = Totp.ToBase32(secret);
        return new AdminLoginResponse("setupRequired", challenge, base32, Totp.OtpauthUri(Issuer, request.Email.Trim(), base32));
    }

    public async Task<AdminResult<AdminSessionResponse>> VerifyAsync(AdminVerifyRequest request, CancellationToken ct)
    {
        if (await access.ReadTokenAsync(request.Challenge, ChallengeAudience) is not { } userId) return InvalidToken;
        var member = await db.Set<AdminMember>().SingleOrDefaultAsync(m => m.UserId == userId, ct);
        if (member?.TotpSecret is null) return InvalidToken;

        var now = clock.GetUtcNow();
        if (member.LockedUntil > now) return TooMany;
        var secret = Totp.Unprotect(member.TotpSecret, access.DeriveKey(TotpKeyPurpose));
        var step = secret is null ? null : Totp.Match(secret, request.Code, now, member.TotpLastStep);
        if (step is null)
        {
            member.FailedCodes++;
            if (member.FailedCodes >= MaxFailedCodes)
            {
                member.FailedCodes = 0;
                member.LockedUntil = now + CodeLockout;
            }

            await db.SaveChangesAsync(ct);
            await audit.WriteAsync(userId, AdminActions.CodeFailed, "member", userId.ToString(), null, ct);
            return member.LockedUntil > now ? TooMany : InvalidCode;
        }

        var firstTime = member.TotpConfirmedAt is null;
        member.TotpLastStep = step.Value;
        member.FailedCodes = 0;
        member.LockedUntil = null;
        member.TotpConfirmedAt ??= now;
        member.LastLoginAt = now;
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(userId, firstTime ? AdminActions.TwoFactorEnrolled : AdminActions.Login, "member", userId.ToString(), null, ct);
        await audit.RemoveOldAsync(options.Value.AuditKeepDays, ct);
        LogLogin(userId, member.Role);

        var expires = now + options.Value.TokenLifetime;
        var token = access.IssueToken(userId, access.AdminAudience, options.Value.TokenLifetime);
        var email = (await directory.EmailsAsync([userId], ct)).GetValueOrDefault(userId) ?? "";
        return new AdminSessionResponse(token, expires, new AdminMeDto(userId, email, member.Role));
    }

    /// <summary>An account listed in Admin:OwnerEmails becomes an owner on its first login (how the first owner gets in).</summary>
    private async Task<AdminMember?> BootstrapOwnerAsync(Guid userId, string email, CancellationToken ct)
    {
        var listed = options.Value.OwnerEmails.Any(e => string.Equals(e.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase));
        if (!listed) return null;
        var member = new AdminMember { UserId = userId, Role = AdminRoles.Owner, CreatedAt = clock.GetUtcNow() };
        db.Add(member);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(userId, AdminActions.MemberAdded, "member", userId.ToString(), "role=owner;via=config", ct);
        return member;
    }

    // Only the opaque user id and the role (GDPR core rule).
    [LoggerMessage(Level = LogLevel.Information, Message = "Back office login by {UserId} ({Role})")]
    private partial void LogLogin(Guid userId, string role);
}
