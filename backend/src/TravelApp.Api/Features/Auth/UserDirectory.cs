using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Auth;

/// <summary>Accounts for the back office (KAN-55): search, details, suspend and the dashboard counts.</summary>
internal sealed partial class UserDirectory(AppDbContext db, SessionService sessions, TimeProvider clock, ILogger<UserDirectory> logger)
    : IUserDirectory
{
    public const string Suspended = "suspended";

    public async Task<DirectoryPage> SearchAsync(string? query, string? status, int page, int pageSize, CancellationToken ct)
    {
        var users = db.Set<User>().AsNoTracking();
        var q = query?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            if (Guid.TryParse(q, out var id))
            {
                users = users.Where(u => u.Id == id);
            }
            else
            {
                // NormalizedEmail is upper case (Identity). Escape the LIKE wildcards so "%" finds a "%".
                var needle = q.ToUpperInvariant().Replace("\\", "\\\\", StringComparison.Ordinal)
                    .Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
                users = users.Where(u => EF.Functions.Like(u.NormalizedEmail!, $"%{needle}%", "\\"));
            }
        }

        users = status switch
        {
            Suspended => users.Where(u => u.SuspendedAt != null),
            UserStatus.DeletionRequested => users.Where(u => u.Status == UserStatus.DeletionRequested),
            UserStatus.Active => users.Where(u => u.Status == UserStatus.Active && u.SuspendedAt == null),
            _ => users,
        };

        var total = await users.CountAsync(ct);
        var rows = await users.OrderByDescending(u => u.CreatedAt).ThenBy(u => u.Id)
            .Skip(Math.Max(0, page) * pageSize).Take(pageSize).ToListAsync(ct);
        return new DirectoryPage(await ToDirectoryAsync(rows, ct), total);
    }

    public async Task<DirectoryUser?> GetAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Set<User>().AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
        return user is null ? null : (await ToDirectoryAsync([user], ct))[0];
    }

    public async Task<IReadOnlyDictionary<Guid, string>> EmailsAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct) =>
        await db.Set<User>().AsNoTracking().Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email ?? "", ct);

    public async Task<Guid?> FindWithPasswordAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToUpperInvariant();
        return await db.Set<User>().AsNoTracking()
            .Where(u => u.NormalizedEmail == normalized && u.PasswordHash != null)
            .Select(u => (Guid?)u.Id).SingleOrDefaultAsync(ct);
    }

    public async Task<bool> SuspendAsync(Guid userId, string reason, CancellationToken ct)
    {
        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return false;
        var now = clock.GetUtcNow();
        user.SuspendedAt ??= now;
        user.SuspensionReason = reason;
        // A new security stamp makes Identity forget anything it trusted for this account.
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.Touch(now);
        await db.SaveChangesAsync(ct);
        await sessions.RevokeAllAsync(userId, ct);
        LogSuspended(userId);
        return true;
    }

    public async Task<bool> UnsuspendAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return false;
        if (user.SuspendedAt is not null)
        {
            user.SuspendedAt = null;
            user.SuspensionReason = null;
            user.Touch(clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            LogUnsuspended(userId);
        }

        return true;
    }

    public async Task<bool> SignOutEverywhereAsync(Guid userId, CancellationToken ct)
    {
        if (!await db.Set<User>().AnyAsync(u => u.Id == userId, ct)) return false;
        await sessions.RevokeAllAsync(userId, ct);
        return true;
    }

    public async Task<IReadOnlyList<DirectoryUser>> DeletionRequestsAsync(int max, CancellationToken ct)
    {
        var rows = await db.Set<User>().AsNoTracking()
            .Where(u => u.Status == UserStatus.DeletionRequested)
            .OrderBy(u => u.DeleteAfter).Take(max).ToListAsync(ct);
        return await ToDirectoryAsync(rows, ct);
    }

    public async Task<DirectoryTotals> TotalsAsync(DateTimeOffset now, CancellationToken ct)
    {
        var users = db.Set<User>().AsNoTracking();
        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);
        var firstDay = DateOnly.FromDateTime(now.UtcDateTime).AddDays(-29);
        var since = new DateTimeOffset(firstDay.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        var total = await users.CountAsync(ct);
        var active = await users.CountAsync(u => u.Status == UserStatus.Active && u.SuspendedAt == null, ct);
        var suspended = await users.CountAsync(u => u.SuspendedAt != null, ct);
        var deletion = await users.CountAsync(u => u.Status == UserStatus.DeletionRequested, ct);
        var new7 = await users.CountAsync(u => u.CreatedAt >= d7, ct);
        var new30 = await users.CountAsync(u => u.CreatedAt >= d30, ct);
        var tokens = db.Set<RefreshToken>().AsNoTracking();
        var active7 = await tokens.Where(t => t.CreatedAt >= d7).Select(t => t.UserId).Distinct().CountAsync(ct);
        var active30 = await tokens.Where(t => t.CreatedAt >= d30).Select(t => t.UserId).Distinct().CountAsync(ct);

        var created = await users.Where(u => u.CreatedAt >= since).Select(u => u.CreatedAt).ToListAsync(ct);
        var perDay = created.GroupBy(c => DateOnly.FromDateTime(c.UtcDateTime)).ToDictionary(g => g.Key, g => g.Count());
        var days = Enumerable.Range(0, 30).Select(i => firstDay.AddDays(i))
            .Select(d => new DayCount(d, perDay.GetValueOrDefault(d))).ToList();

        return new DirectoryTotals(total, active, suspended, deletion, new7, new30, active7, active30, days);
    }

    private async Task<List<DirectoryUser>> ToDirectoryAsync(List<User> rows, CancellationToken ct)
    {
        var ids = rows.Select(u => u.Id).ToList();
        var now = clock.GetUtcNow();
        var tokens = await db.Set<RefreshToken>().AsNoTracking().Where(t => ids.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                LastActive = g.Max(t => (DateTimeOffset?)t.CreatedAt),
                Sessions = g.Count(t => t.RevokedAt == null && t.ReplacedByTokenId == null && t.ExpiresAt > now),
            })
            .ToDictionaryAsync(x => x.UserId, ct);

        return rows.Select(u =>
        {
            tokens.TryGetValue(u.Id, out var t);
            var status = u.SuspendedAt is not null ? Suspended : u.Status;
            return new DirectoryUser(u.Id, u.Email ?? "", status, u.AuthProviders, u.PasswordHash is not null, u.CreatedAt,
                u.OnboardingCompletedAt, u.TermsVersion, u.TermsAcceptedAt, u.PrivacyVersion, u.PrivacyAcceptedAt,
                u.MarketingConsent, u.DeletionRequestedAt, u.DeleteAfter, u.SuspendedAt, u.SuspensionReason,
                t?.LastActive, t?.Sessions ?? 0);
        }).ToList();
    }

    // Only the opaque user id (GDPR core rule).
    [LoggerMessage(Level = LogLevel.Information, Message = "Account {UserId} suspended by the back office")]
    private partial void LogSuspended(Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Account {UserId} suspension lifted by the back office")]
    private partial void LogUnsuspended(Guid userId);
}
