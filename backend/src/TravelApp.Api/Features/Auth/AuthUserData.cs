using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// The account's part of "Download my data" and of the final erase (KAN-22).
/// Export: the profile, consents, login methods and trusted phones. Never the password hash, security stamps or tokens.
/// Purge (last of all): codes sent to the email, then the user row. The database removes everything that hangs off it
/// (logins, sessions, trusted phones, settings, trips with their stops, flights, places, checklist, expenses, photo records).
/// </summary>
internal sealed class AuthUserData(AppDbContext db) : IUserData
{
    public int PurgeOrder => int.MaxValue;

    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var u = await db.Set<User>().AsNoTracking().SingleAsync(x => x.Id == userId, ct);
        var account = new
        {
            u.Id,
            u.Email,
            u.EmailConfirmed,
            u.AuthProviders,
            u.FirstName,
            u.LastName,
            u.DisplayName,
            u.PassportCountry,
            u.ResidenceCountry,
            u.HomeCurrency,
            u.Language,
            u.TimeZone,
            u.AgeConfirmedAt,
            u.TermsVersion,
            u.TermsAcceptedAt,
            u.PrivacyVersion,
            u.PrivacyAcceptedAt,
            u.MarketingConsent,
            u.MarketingConsentAt,
            u.OnboardingCompletedAt,
            u.Status,
            u.DeletionRequestedAt,
            u.DeleteAfter,
            u.CreatedAt,
            u.UpdatedAt,
        };
        var devices = await db.Set<TrustedDevice>().AsNoTracking().Where(d => d.UserId == userId)
            .OrderBy(d => d.TrustedAt)
            .Select(d => new { d.Name, d.TrustedAt, d.LastSeenAt, d.ExpiresAt })
            .ToListAsync(ct);
        return new Dictionary<string, object> { ["account"] = account, ["devices"] = devices };
    }

    public async Task PurgeAsync(Guid userId, CancellationToken ct)
    {
        var email = await db.Set<User>().Where(u => u.Id == userId).Select(u => u.NormalizedEmail).SingleOrDefaultAsync(ct);
        if (email is not null)
        {
            await db.Set<AuthCode>().Where(c => c.Email == email).ExecuteDeleteAsync(ct);
        }

        await db.Set<User>().Where(u => u.Id == userId).ExecuteDeleteAsync(ct);
    }
}
