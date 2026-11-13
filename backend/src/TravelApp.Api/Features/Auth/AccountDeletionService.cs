using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// "Delete my account" and "Restore" (KAN-22, owner's choice 13 Nov 2026: 30 days to change your mind).
/// Asking locks the account at once: every session on every phone ends, and phones that try to refresh hear
/// "account_deleted" and wipe this account's data. Logging in again during the 30 days gives a session that the app
/// uses only to offer Restore. When the days are over the purge job (Account feature) erases everything.
/// </summary>
internal sealed partial class AccountDeletionService(
    AppDbContext db,
    SessionService sessions,
    IOptions<AuthOptions> options,
    TimeProvider clock,
    ILogger<AccountDeletionService> logger) : IAccountsToPurge
{
    internal static readonly AuthFailure NotDeleted = new(409, AuthErrorCodes.NotDeleted, "This account is not waiting to be deleted.");
    internal static readonly AuthFailure AlreadyErased = new(410, AuthErrorCodes.AccountDeleted, "This account has been deleted.");

    public async Task<AuthResult<AuthUserResponse>> RequestAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return AuthService.SessionExpired;

        // Asking twice keeps the first date: the 30 days never get longer by accident.
        if (user.Status != UserStatus.DeletionRequested)
        {
            var now = clock.GetUtcNow();
            user.Status = UserStatus.DeletionRequested;
            user.DeletionRequestedAt = now;
            user.DeleteAfter = now.AddDays(Math.Max(0, options.Value.DeletionGraceDays));
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            user.Touch(now);
            await db.SaveChangesAsync(ct);
            LogRequested(user.Id);
        }

        await sessions.RevokeAllAsync(user.Id, ct);
        return AuthUserMapper.ToResponse(user);
    }

    public async Task<AuthResult<AuthUserResponse>> RestoreAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Set<User>().SingleOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return AuthService.SessionExpired;
        if (user.Status != UserStatus.DeletionRequested) return NotDeleted;

        var now = clock.GetUtcNow();
        // The days are over: the purge job may already be erasing it. Too late to restore.
        if (user.DeleteAfter <= now) return AlreadyErased;

        user.Status = UserStatus.Active;
        user.DeletionRequestedAt = null;
        user.DeleteAfter = null;
        user.Touch(now);
        await db.SaveChangesAsync(ct);
        LogRestored(user.Id);
        return AuthUserMapper.ToResponse(user);
    }

    public async Task<IReadOnlyList<Guid>> DueAsync(DateTimeOffset now, int max, CancellationToken ct) =>
        await db.Set<User>().AsNoTracking()
            .Where(u => u.Status == UserStatus.DeletionRequested && u.DeleteAfter != null && u.DeleteAfter <= now)
            .OrderBy(u => u.DeleteAfter).Select(u => u.Id).Take(max).ToListAsync(ct);

    // Only the opaque user id (GDPR core rule).
    [LoggerMessage(Level = LogLevel.Information, Message = "Account {UserId} asked to be deleted")]
    private partial void LogRequested(Guid userId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Account {UserId} restored")]
    private partial void LogRestored(Guid userId);
}
