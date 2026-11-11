using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Auth;

public static class AuthSetup
{
    public const string RateLimitPolicy = "auth";

    /// <summary>
    /// Identity (A3), access token checks (ES256, A1), the /auth rate limit, and the rule that every
    /// endpoint needs a token unless it is marked public.
    /// </summary>
    public static IServiceCollection AddAuthFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.Section));
        services.AddSingleton<SigningKeys>();

        services.AddIdentityCore<User>(o =>
            {
                o.User.RequireUniqueEmail = true;
                o.User.AllowedUserNameCharacters = string.Empty; // the user name is the email; any character
                o.Password.RequiredLength = AuthLimits.PasswordMin;
                o.Password.RequireDigit = false;
                o.Password.RequireLowercase = false;
                o.Password.RequireUppercase = false;
                o.Password.RequireNonAlphanumeric = false;
                o.Password.RequiredUniqueChars = 1;
                o.Lockout.AllowedForNewUsers = true;
                o.Lockout.MaxFailedAccessAttempts = AuthRules.MaxFailedPasswords;
                o.Lockout.DefaultLockoutTimeSpan = AuthRules.Lockout;
            })
            .AddEntityFrameworkStores<AppDbContext>();

        services.AddScoped<AuthService>();
        services.AddScoped<SessionService>();
        services.AddScoped<CodeService>();
        services.AddSingleton<IAuthEmailSender, LogAuthEmailSender>();
        services.AddSingleton<IExternalTokenValidator, OpenIdTokenValidator>();
        services.AddHttpClient<ILeakedPasswordCheck, PwnedPasswordsCheck>(http =>
        {
            http.BaseAddress = new Uri("https://api.pwnedpasswords.com/");
            http.Timeout = TimeSpan.FromSeconds(3);
            http.DefaultRequestHeaders.Add("Add-Padding", "true");
            http.DefaultRequestHeaders.UserAgent.ParseAdd("travel-app-api");
        });

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<SigningKeys, IOptions<AuthOptions>>((jwt, keys, auth) =>
            {
                jwt.MapInboundClaims = false;
                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = auth.Value.Issuer,
                    ValidAudience = auth.Value.ApiAudience,
                    IssuerSigningKey = keys.Key,
                    ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
                    NameClaimType = "sub",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        // Every endpoint needs a valid access token unless it says AllowAnonymous (structure rule 5).
        // Unknown routes (no endpoint) still answer 404.
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder()
                .RequireAssertion(c => c.User.Identity?.IsAuthenticated == true
                    || (c.Resource is HttpContext http && http.GetEndpoint() is null))
                .Build());

        var perMinute = configuration.GetValue<int?>($"{AuthOptions.Section}:{nameof(AuthOptions.RequestsPerMinutePerIp)}") ?? 30;
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
                http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }

    public static WebApplication UseAuthFeature(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();
        return app;
    }
}
