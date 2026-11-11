using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// 6-digit email codes (A5): valid 10 minutes, at most 5 tries, at most 1 per minute and
/// 5 per hour per email. A new code replaces the older one of the same purpose.
/// </summary>
public sealed class CodeService(AppDbContext db, IAuthEmailSender email, TimeProvider clock)
{
    public enum CheckResult
    {
        Ok,
        Wrong,
        TooManyAttempts,
    }

    /// <summary>
    /// False when the limits are reached: 5 codes per hour per email, and 1 per minute per email
    /// and purpose (so a sign-up code does not block a password reset a few seconds later).
    /// </summary>
    public async Task<bool> CanSendAsync(string normalizedEmail, string purpose, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var recent = await db.Set<AuthCode>()
            .Where(c => c.Email == normalizedEmail && c.CreatedAt > now - TimeSpan.FromHours(1))
            .Select(c => new { c.CreatedAt, c.Purpose })
            .ToListAsync(ct);
        return recent.Count < AuthRules.CodesPerHour
            && !recent.Any(c => c.Purpose == purpose && c.CreatedAt > now - AuthRules.CodeMinInterval);
    }

    /// <summary>Creates and sends a code. Call <see cref="CanSendAsync"/> first.</summary>
    public async Task SendAsync(string normalizedEmail, string address, string purpose, Action<AuthCode>? fill, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        await db.Set<AuthCode>()
            .Where(c => c.Email == normalizedEmail && c.Purpose == purpose && c.ConsumedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ConsumedAt, now), ct);

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
        var row = new AuthCode
        {
            Id = Ids.New(),
            Email = normalizedEmail,
            Purpose = purpose,
            CodeHash = Hash(normalizedEmail, purpose, code),
            CreatedAt = now,
            ExpiresAt = now + AuthRules.CodeLifetime,
        };
        fill?.Invoke(row);
        db.Add(row);
        await db.SaveChangesAsync(ct);
        await email.SendCodeAsync(address, purpose, code, ct);
    }

    /// <summary>The newest code that can still be used, or null.</summary>
    public Task<AuthCode?> FindLiveAsync(string normalizedEmail, string purpose, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        return db.Set<AuthCode>()
            .Where(c => c.Email == normalizedEmail && c.Purpose == purpose && c.ConsumedAt == null && c.ExpiresAt > now)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    /// <summary>Checks a code; a right code is used up, a wrong one counts as a try.</summary>
    public async Task<(CheckResult Result, AuthCode? Code)> CheckAsync(string normalizedEmail, string purpose, string code, CancellationToken ct)
    {
        var live = await FindLiveAsync(normalizedEmail, purpose, ct);
        if (live is null)
        {
            return (CheckResult.Wrong, null);
        }

        if (live.Attempts >= AuthRules.CodeMaxAttempts)
        {
            return (CheckResult.TooManyAttempts, null);
        }

        var now = clock.GetUtcNow();
        var expected = Encoding.ASCII.GetBytes(live.CodeHash);
        var actual = Encoding.ASCII.GetBytes(Hash(normalizedEmail, purpose, code));
        if (!CryptographicOperations.FixedTimeEquals(expected, actual))
        {
            // Counted in the database, so parallel guesses cannot get more than 5 tries.
            var counted = await db.Set<AuthCode>()
                .Where(c => c.Id == live.Id && c.Attempts < AuthRules.CodeMaxAttempts)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.Attempts, c => c.Attempts + 1), ct);
            return (counted == 0 || live.Attempts + 1 >= AuthRules.CodeMaxAttempts ? CheckResult.TooManyAttempts : CheckResult.Wrong, null);
        }

        var used = await db.Set<AuthCode>()
            .Where(c => c.Id == live.Id && c.ConsumedAt == null && c.Attempts < AuthRules.CodeMaxAttempts)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ConsumedAt, now), ct);
        return used == 1 ? (CheckResult.Ok, live) : (CheckResult.Wrong, null);
    }

    private static string Hash(string email, string purpose, string code) =>
        SessionService.Hash($"{email}|{purpose}|{code}");
}
