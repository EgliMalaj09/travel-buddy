using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Access and refresh tokens (A2, A4): one 15-minute access token for the API and PowerSync, one
/// refresh token per phone, replaced on every use. Using a replaced token again ends all sessions.
/// </summary>
public sealed partial class SessionService(
    AppDbContext db,
    SigningKeys keys,
    IOptions<AuthOptions> options,
    TimeProvider clock,
    ILogger<SessionService> logger)
{
    private readonly AuthOptions _options = options.Value;

    /// <summary>Starts a new session for this phone. Older sessions of the same phone end.</summary>
    public async Task<SessionResponse> StartAsync(User user, string deviceId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        await db.Set<RefreshToken>()
            .Where(t => t.UserId == user.Id && t.DeviceId == deviceId && t.RevokedAt == null && t.ReplacedByTokenId == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);

        var (token, row) = NewRefreshToken(user.Id, deviceId, now);
        db.Add(row);
        await db.SaveChangesAsync(ct);
        return Build(user, token, now);
    }

    /// <summary>What a refresh gave: a new session, or why not.</summary>
    public sealed record RefreshOutcome(SessionResponse? Session, bool AccountDeleted = false);

    /// <summary>
    /// Exchanges a refresh token for a new session. No session when the token is not valid any more;
    /// <see cref="RefreshOutcome.AccountDeleted"/> when its account is waiting to be erased (the phone then wipes its data).
    /// </summary>
    public async Task<RefreshOutcome> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var hash = Hash(refreshToken);
        var current = await db.Set<RefreshToken>().SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (current is null)
        {
            return new(null);
        }

        // Every session ended when deletion was asked; tell the phone why, so it removes this account's data.
        if (await db.Set<User>().AnyAsync(u => u.Id == current.UserId && u.Status == UserStatus.DeletionRequested, ct))
        {
            return new(null, AccountDeleted: true);
        }

        if (current.ReplacedByTokenId is not null)
        {
            // An old token was used again: it may have been stolen. End every session of this user (A4).
            LogReuse(current.UserId);
            await RevokeAllAsync(current.UserId, ct);
            return new(null);
        }

        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == current.UserId, ct);
        if (!current.IsActive(now) || user is null || user.DeletedAt is not null)
        {
            return new(null);
        }

        var (token, next) = NewRefreshToken(current.UserId, current.DeviceId, now);
        current.ReplacedByTokenId = next.Id;
        current.RevokedAt = now;
        db.Add(next);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new(null); // The same token was used twice at the same moment.
        }

        return new(Build(user, token, now));
    }

    /// <summary>Ends the session of this refresh token (log out on this phone).</summary>
    public Task LogoutAsync(string refreshToken, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var hash = Hash(refreshToken);
        return db.Set<RefreshToken>()
            .Where(t => t.TokenHash == hash && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
    }

    /// <summary>Ends every session of a user (token reuse, password reset).</summary>
    public Task RevokeAllAsync(Guid userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        return db.Set<RefreshToken>()
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
    }

    private SessionResponse Build(User user, string refreshToken, DateTimeOffset now)
    {
        var expires = now + _options.AccessTokenLifetime;
        var accessToken = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audiences = { _options.ApiAudience, _options.PowerSyncAudience },
            Subject = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString())]),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            SigningCredentials = keys.Credentials,
        });
        return new SessionResponse(accessToken, expires, refreshToken, AuthUserMapper.ToResponse(user));
    }

    private (string Token, RefreshToken Row) NewRefreshToken(Guid userId, string deviceId, DateTimeOffset now)
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        var row = new RefreshToken
        {
            Id = Ids.New(),
            UserId = userId,
            DeviceId = deviceId,
            TokenHash = Hash(token),
            CreatedAt = now,
            ExpiresAt = now + _options.RefreshTokenLifetime,
        };
        return (token, row);
    }

    internal static string Hash(string value) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    [LoggerMessage(Level = LogLevel.Warning, Message = "Refresh token reuse for user {UserId}; ending all sessions")]
    private partial void LogReuse(Guid userId);
}
