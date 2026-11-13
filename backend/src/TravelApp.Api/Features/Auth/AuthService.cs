using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Auth;

/// <summary>An auth error: HTTP status and one of <see cref="AuthErrorCodes"/>.</summary>
public sealed record AuthFailure(int Status, string Code, string Title);

/// <summary>Either a value or an <see cref="AuthFailure"/>.</summary>
public sealed record AuthResult<T>(T? Value, AuthFailure? Error)
{
#pragma warning disable CA2225 // Conversions keep the service code short; Value/Error are the named alternatives.
    public static implicit operator AuthResult<T>(T value) => new(value, null);

    public static implicit operator AuthResult<T>(AuthFailure error) => new(default, error);
#pragma warning restore CA2225
}

/// <summary>Sign-up, login, Google/Apple, codes, password reset and profile setup (KAN-12).</summary>
public sealed class AuthService(
    AppDbContext db,
    UserManager<User> users,
    IPasswordHasher<User> hasher,
    CodeService codes,
    SessionService sessions,
    ILeakedPasswordCheck leaked,
    IExternalTokenValidator external,
    IOptions<AuthOptions> options,
    TimeProvider clock)
{
    private readonly AuthOptions _options = options.Value;

    internal static readonly AuthFailure InvalidCredentials = new(401, AuthErrorCodes.InvalidCredentials, "Email or password is not right.");
    internal static readonly AuthFailure InvalidCode = new(400, AuthErrorCodes.InvalidCode, "That code is not right or has expired.");
    internal static readonly AuthFailure TooMany = new(429, AuthErrorCodes.TooManyAttempts, "Too many tries. Wait a little and try again.");
    internal static readonly AuthFailure EmailTaken = new(409, AuthErrorCodes.EmailTaken, "This email already has an account. Log in instead.");
    internal static readonly AuthFailure PasswordLeaked = new(400, AuthErrorCodes.PasswordLeaked, "This password appears in known data leaks. Choose another one.");
    internal static readonly AuthFailure ConsentRequired = new(400, AuthErrorCodes.ConsentRequired, "Confirm you are 16 or older and accept the terms and privacy.");
    internal static readonly AuthFailure InvalidToken = new(401, AuthErrorCodes.InvalidToken, "The sign-in could not be checked. Try again.");
    internal static readonly AuthFailure SessionExpired = new(401, AuthErrorCodes.SessionExpired, "Please log in again.");
    internal static readonly AuthFailure AccountDeleted = new(401, AuthErrorCodes.AccountDeleted, "This account is waiting to be deleted. Log in to restore it.");

    public async Task<AuthResult<bool>> SignUpAsync(SignUpRequest request, CancellationToken ct)
    {
        if (!request.Consents.AgeConfirmed || !request.Consents.TermsAccepted)
        {
            return ConsentRequired;
        }

        var email = Normalize(request.Email);
        var existing = await users.FindByEmailAsync(request.Email.Trim());
        if (existing?.PasswordHash is not null)
        {
            return EmailTaken;
        }

        if (await leaked.IsLeakedAsync(request.Password, ct))
        {
            return PasswordLeaked;
        }

        if (!await codes.CanSendAsync(email, CodePurpose.SignUp, ct))
        {
            return TooMany;
        }

        var passwordHash = hasher.HashPassword(existing ?? new User(), request.Password);
        await codes.SendAsync(email, request.Email.Trim(), CodePurpose.SignUp, row =>
        {
            row.PendingPasswordHash = passwordHash;
            row.PendingMarketingConsent = request.Consents.MarketingConsent;
        }, ct);
        return true;
    }

    /// <summary>Code from the sign-up email: creates the account (or adds email login to a Google/Apple account, L3).</summary>
    public async Task<AuthResult<SessionResponse>> VerifySignUpAsync(VerifyCodeRequest request, CancellationToken ct)
    {
        var (result, code) = await codes.CheckAsync(Normalize(request.Email), CodePurpose.SignUp, request.Code, ct);
        if (result != CodeService.CheckResult.Ok)
        {
            return result == CodeService.CheckResult.TooManyAttempts ? TooMany : InvalidCode;
        }

        var now = clock.GetUtcNow();
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user?.PasswordHash is not null)
        {
            return EmailTaken;
        }

        if (user is null)
        {
            user = NewUser(request.Email, now);
            AcceptConsents(user, code!.PendingMarketingConsent, now);
            user.PasswordHash = code.PendingPasswordHash;
            user.AddProvider(AuthProvider.Email);
            await users.CreateAsync(user);
        }
        else
        {
            user.PasswordHash = code!.PendingPasswordHash;
            user.AddProvider(AuthProvider.Email);
            if (user.TermsAcceptedAt is null)
            {
                AcceptConsents(user, code.PendingMarketingConsent, now);
            }

            user.Touch(now);
            await users.UpdateAsync(user);
        }

        await TrustDeviceAsync(user.Id, request.DeviceId, request.DeviceName, now, ct);
        return await sessions.StartAsync(user, request.DeviceId, ct);
    }

    /// <summary>Email + password. On a phone that is not trusted yet, a code is sent instead of a session.</summary>
    public async Task<AuthResult<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user?.PasswordHash is null || user.DeletedAt is not null)
        {
            return InvalidCredentials;
        }

        if (await users.IsLockedOutAsync(user))
        {
            return TooMany;
        }

        if (!await users.CheckPasswordAsync(user, request.Password))
        {
            await users.AccessFailedAsync(user);
            return await users.IsLockedOutAsync(user) ? TooMany : InvalidCredentials;
        }

        await users.ResetAccessFailedCountAsync(user);
        var now = clock.GetUtcNow();
        if (BeingErased(user, now)) return AccountDeletionService.AlreadyErased;
        var device = await db.Set<TrustedDevice>()
            .SingleOrDefaultAsync(d => d.UserId == user.Id && d.DeviceId == request.DeviceId, ct);
        if (device is not null && device.ExpiresAt > now)
        {
            await TrustDeviceAsync(user.Id, request.DeviceId, null, now, ct);
            return new LoginResponse("session", await sessions.StartAsync(user, request.DeviceId, ct));
        }

        var email = Normalize(request.Email);
        if (await codes.CanSendAsync(email, CodePurpose.Login, ct))
        {
            await codes.SendAsync(email, user.Email!, CodePurpose.Login, null, ct);
        }
        else if (await codes.FindLiveAsync(email, CodePurpose.Login, ct) is null)
        {
            return TooMany;
        }

        return new LoginResponse("codeRequired", null);
    }

    /// <summary>Code from the new-phone email: logs in and trusts this phone for 1 year.</summary>
    public async Task<AuthResult<SessionResponse>> VerifyLoginAsync(VerifyCodeRequest request, CancellationToken ct)
    {
        var (result, _) = await codes.CheckAsync(Normalize(request.Email), CodePurpose.Login, request.Code, ct);
        if (result != CodeService.CheckResult.Ok)
        {
            return result == CodeService.CheckResult.TooManyAttempts ? TooMany : InvalidCode;
        }

        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return InvalidCode;
        }

        if (BeingErased(user, clock.GetUtcNow())) return AccountDeletionService.AlreadyErased;
        await TrustDeviceAsync(user.Id, request.DeviceId, request.DeviceName, clock.GetUtcNow(), ct);
        return await sessions.StartAsync(user, request.DeviceId, ct);
    }

    /// <summary>Google or Apple: finds the account by provider id, then by confirmed email (L3), or creates it.</summary>
    public async Task<AuthResult<SessionResponse>> SocialLoginAsync(string provider, SocialLoginRequest request, CancellationToken ct)
    {
        var identity = await external.ValidateAsync(provider, request.IdToken, ct);
        if (identity is null || !NonceMatches(provider, identity.Nonce, request.Nonce))
        {
            return InvalidToken;
        }

        var now = clock.GetUtcNow();
        var user = await users.FindByLoginAsync(provider, identity.Subject);
        if (user is null)
        {
            user = await users.FindByEmailAsync(identity.Email);
            if (user is null)
            {
                user = NewUser(identity.Email, now);
                user.SuggestedFirstName = request.FirstName ?? identity.FirstName;
                user.AddProvider(provider);
                await users.CreateAsync(user);
            }
            else
            {
                user.AddProvider(provider);
                user.EmailConfirmed = true;
                user.SuggestedFirstName ??= request.FirstName ?? identity.FirstName;
                user.Touch(now);
                await users.UpdateAsync(user);
            }

            await users.AddLoginAsync(user, new UserLoginInfo(provider, identity.Subject, provider));
        }

        if (BeingErased(user, now)) return AccountDeletionService.AlreadyErased;
        return await sessions.StartAsync(user, request.DeviceId, ct);
    }

    /// <summary>"Send a new code". Does nothing when there is no recent sign-up or login to resend for.</summary>
    public async Task<AuthResult<bool>> ResendCodeAsync(ResendCodeRequest request, CancellationToken ct)
    {
        var email = Normalize(request.Email);
        var since = clock.GetUtcNow() - TimeSpan.FromHours(1);
        var last = await db.Set<AuthCode>()
            .Where(c => c.Email == email && c.Purpose == request.Purpose && c.CreatedAt > since)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (last is null)
        {
            return true;
        }

        if (!await codes.CanSendAsync(email, request.Purpose, ct))
        {
            return TooMany;
        }

        await codes.SendAsync(email, request.Email.Trim(), request.Purpose, row =>
        {
            row.PendingPasswordHash = last.PendingPasswordHash;
            row.PendingMarketingConsent = last.PendingMarketingConsent;
        }, ct);
        return true;
    }

    /// <summary>Sends a reset code when the account exists. Same answer when it does not (no account guessing).</summary>
    public async Task<AuthResult<bool>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || user.DeletedAt is not null)
        {
            return true;
        }

        var email = Normalize(request.Email);
        if (!await codes.CanSendAsync(email, CodePurpose.Reset, ct))
        {
            return TooMany;
        }

        await codes.SendAsync(email, user.Email!, CodePurpose.Reset, null, ct);
        return true;
    }

    /// <summary>
    /// The token must carry SHA-256(nonce the app sent), as hex. This ties the token to this sign-in, so a token
    /// taken from somewhere else cannot be replayed without its nonce. Apple tokens must always have one.
    /// </summary>
    internal static bool NonceMatches(string provider, string? tokenNonce, string? requestNonce)
    {
        if (tokenNonce is null)
        {
            return provider != AuthProvider.Apple;
        }

        if (requestNonce is null)
        {
            return false;
        }

        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(requestNonce)));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(hash), Encoding.ASCII.GetBytes(tokenNonce.ToLowerInvariant()));
    }

    /// <summary>Code + new password. Also how Google/Apple users add email login. Ends all sessions.</summary>
    public async Task<AuthResult<bool>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct)
    {
        if (await leaked.IsLeakedAsync(request.NewPassword, ct))
        {
            return PasswordLeaked;
        }

        var (result, _) = await codes.CheckAsync(Normalize(request.Email), CodePurpose.Reset, request.Code, ct);
        if (result != CodeService.CheckResult.Ok)
        {
            return result == CodeService.CheckResult.TooManyAttempts ? TooMany : InvalidCode;
        }

        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            return InvalidCode;
        }

        user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
        user.EmailConfirmed = true;
        user.AddProvider(AuthProvider.Email);
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.Touch(clock.GetUtcNow());
        await users.UpdateAsync(user);
        await sessions.RevokeAllAsync(user.Id, ct);
        return true;
    }

    public async Task<AuthResult<AuthUserResponse>> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Set<User>().AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
        return user is null ? SessionExpired : AuthUserMapper.ToResponse(user);
    }

    /// <summary>Profile setup: name, countries, currency; consents for Google/Apple users.</summary>
    public async Task<AuthResult<AuthUserResponse>> SaveProfileAsync(Guid userId, ProfileRequest request, CancellationToken ct)
    {
        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            return SessionExpired;
        }

        var now = clock.GetUtcNow();
        if (request.Consents is { } consents)
        {
            if (!consents.AgeConfirmed || !consents.TermsAccepted)
            {
                return ConsentRequired;
            }

            AcceptConsents(user, consents.MarketingConsent, now);
        }
        else if (user.TermsAcceptedAt is null)
        {
            return ConsentRequired;
        }

        user.FirstName = request.FirstName.Trim();
        user.DisplayName ??= user.FirstName;
        user.PassportCountry = request.PassportCountry;
        user.ResidenceCountry = request.ResidenceCountry;
        user.HomeCurrency = request.HomeCurrency;
        user.Language = request.Language ?? user.Language;
        user.TimeZone = request.TimeZone ?? user.TimeZone;
        user.OnboardingCompletedAt ??= now;
        user.Touch(now);
        await db.SaveChangesAsync(ct);
        return AuthUserMapper.ToResponse(user);
    }

    /// <summary>
    /// The 30 days after "Delete my account" are over: no new session, so none is alive when the purge job erases it
    /// (KAN-22). During the 30 days a login works and the app offers Restore.
    /// </summary>
    internal static bool BeingErased(User user, DateTimeOffset now) =>
        user.Status == UserStatus.DeletionRequested && user.DeleteAfter <= now;

    private static User NewUser(string email, DateTimeOffset now) => new()
    {
        Id = Ids.New(),
        Email = email.Trim(),
        UserName = email.Trim(),
        EmailConfirmed = true,
        CreatedAt = now,
        UpdatedAt = now,
        Version = 1,
    };

    private void AcceptConsents(User user, bool marketing, DateTimeOffset now)
    {
        user.AgeConfirmedAt ??= now;
        if (user.TermsVersion != _options.TermsVersion)
        {
            user.TermsVersion = _options.TermsVersion;
            user.TermsAcceptedAt = now;
        }

        if (user.PrivacyVersion != _options.PrivacyVersion)
        {
            user.PrivacyVersion = _options.PrivacyVersion;
            user.PrivacyAcceptedAt = now;
        }

        if (user.MarketingConsentAt is null || user.MarketingConsent != marketing)
        {
            user.MarketingConsent = marketing;
            user.MarketingConsentAt = now;
        }
    }

    private async Task TrustDeviceAsync(Guid userId, string deviceId, string? name, DateTimeOffset now, CancellationToken ct)
    {
        var device = await db.Set<TrustedDevice>().SingleOrDefaultAsync(d => d.UserId == userId && d.DeviceId == deviceId, ct);
        if (device is null)
        {
            device = new TrustedDevice { Id = Ids.New(), UserId = userId, DeviceId = deviceId, TrustedAt = now };
            db.Add(device);
        }
        else if (device.ExpiresAt <= now)
        {
            device.TrustedAt = now;
        }

        device.Name = name ?? device.Name;
        device.LastSeenAt = now;
        device.ExpiresAt = now + _options.TrustedDeviceLifetime;
        await db.SaveChangesAsync(ct);
    }

    private string Normalize(string email) => users.NormalizeEmail(email.Trim());
}
