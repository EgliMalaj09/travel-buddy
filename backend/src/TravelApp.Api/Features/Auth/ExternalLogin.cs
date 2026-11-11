using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace TravelApp.Api.Features.Auth;

/// <summary>What we keep from a checked Google or Apple ID token.</summary>
/// <param name="Subject">The provider's id for this person (stays the same).</param>
/// <param name="Email">Confirmed email.</param>
/// <param name="FirstName">Given name, when the provider sends one.</param>
public sealed record ExternalIdentity(string Subject, string Email, string? FirstName);

/// <summary>Checks a Google or Apple ID token. Returns null when the token is not valid.</summary>
public interface IExternalTokenValidator
{
    Task<ExternalIdentity?> ValidateAsync(string provider, string idToken, CancellationToken ct);
}

/// <summary>
/// Checks ID tokens with Microsoft's token libraries against Google's and Apple's public keys (A7).
/// The keys are downloaded from the providers' OpenID configuration and cached.
/// </summary>
internal sealed partial class OpenIdTokenValidator : IExternalTokenValidator
{
    private readonly AuthOptions _options;
    private readonly ILogger<OpenIdTokenValidator> _logger;
    private readonly Dictionary<string, (ConfigurationManager<OpenIdConnectConfiguration> Config, string[] Issuers)> _providers;

    public OpenIdTokenValidator(IOptions<AuthOptions> options, ILogger<OpenIdTokenValidator> logger)
    {
        _options = options.Value;
        _logger = logger;
        _providers = new()
        {
            [AuthProvider.Google] = (Manager("https://accounts.google.com/.well-known/openid-configuration"),
                ["https://accounts.google.com", "accounts.google.com"]),
            [AuthProvider.Apple] = (Manager("https://appleid.apple.com/.well-known/openid-configuration"),
                ["https://appleid.apple.com"]),
        };
    }

    public async Task<ExternalIdentity?> ValidateAsync(string provider, string idToken, CancellationToken ct)
    {
        var audiences = provider == AuthProvider.Google ? _options.GoogleClientIds : _options.AppleClientIds;
        if (audiences.Count == 0)
        {
            LogNotConfigured(provider);
            return null;
        }

        var (manager, issuers) = _providers[provider];
        var config = await manager.GetConfigurationAsync(ct);
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuers = issuers,
            ValidAudiences = audiences,
            IssuerSigningKeys = config.SigningKeys,
            ValidateLifetime = true,
        });
        if (!result.IsValid)
        {
            LogInvalid(provider, result.Exception);
            return null;
        }

        var claims = result.ClaimsIdentity;
        var subject = claims.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var email = claims.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
        // Only confirmed emails may link to an existing account (L3). Apple sends "true" as text or as a boolean.
        var verified = claims.FindFirst("email_verified")?.Value;
        if (subject is null || email is null || !string.Equals(verified, "true", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new ExternalIdentity(subject, email, claims.FindFirst(ClaimTypes.GivenName)?.Value ?? claims.FindFirst("given_name")?.Value);
    }

    private static ConfigurationManager<OpenIdConnectConfiguration> Manager(string url) =>
        new(url, new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });

    [LoggerMessage(Level = LogLevel.Warning, Message = "{Provider} login is not configured (no client ids)")]
    private partial void LogNotConfigured(string provider);

    [LoggerMessage(Level = LogLevel.Information, Message = "{Provider} ID token refused")]
    private partial void LogInvalid(string provider, Exception? ex);
}
