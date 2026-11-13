using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Password check and tokens for the back office (KAN-55). Uses the same signing key as the app's tokens, but every
/// back office token has its own audience, so the two kinds can never be swapped.
/// </summary>
internal sealed class AdminAccess(IServiceScopeFactory scopes, SigningKeys keys, IOptions<AuthOptions> options, TimeProvider clock)
    : IAdminAccess
{
    private readonly AuthOptions _options = options.Value;

    public string AdminAudience => _options.AdminAudience;

    public async Task<AdminPasswordResult> CheckPasswordAsync(string email, string password, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = await users.FindByEmailAsync(email.Trim());
        if (user?.PasswordHash is null || user.DeletedAt is not null) return new(null, false);
        if (await users.IsLockedOutAsync(user)) return new(null, true);
        if (!await users.CheckPasswordAsync(user, password))
        {
            await users.AccessFailedAsync(user);
            return new(null, await users.IsLockedOutAsync(user));
        }

        await users.ResetAccessFailedCountAsync(user);
        var blocked = user.SuspendedAt is not null || user.Status == UserStatus.DeletionRequested;
        return new(blocked ? null : user.Id, false);
    }

    public string IssueToken(Guid userId, string audience, TimeSpan lifetime)
    {
        var now = clock.GetUtcNow();
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = audience,
            Subject = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, userId.ToString())]),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = (now + lifetime).UtcDateTime,
            SigningCredentials = keys.Credentials,
        });
    }

    public async Task<Guid?> ReadTokenAsync(string token, string audience)
    {
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = _options.Issuer,
            ValidAudience = audience,
            IssuerSigningKey = keys.Key,
            ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
            ClockSkew = TimeSpan.FromSeconds(30),
            LifetimeValidator = (notBefore, expires, _, _) =>
                expires is { } e && e > clock.GetUtcNow().UtcDateTime && (notBefore is not { } n || n <= clock.GetUtcNow().UtcDateTime.AddSeconds(30)),
        });
        return result.IsValid && result.Claims.TryGetValue(JwtRegisteredClaimNames.Sub, out var sub)
            && Guid.TryParse(sub?.ToString(), out var id) ? id : null;
    }

    public byte[] DeriveKey(string purpose) =>
        HKDF.DeriveKey(HashAlgorithmName.SHA256, keys.PrivateKeyBytes(), 32, salt: [], info: Encoding.UTF8.GetBytes(purpose));
}
