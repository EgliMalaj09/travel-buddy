using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Admin;

/// <summary>Writes the audit log. Every admin action goes through here; only ids and codes are stored.</summary>
internal sealed class AdminAudit(AppDbContext db, TimeProvider clock)
{
    public async Task WriteAsync(Guid? adminUserId, string action, string? targetType, string? targetId, string? details, CancellationToken ct)
    {
        db.Add(new AdminAuditEntry
        {
            Id = Ids.New(),
            At = clock.GetUtcNow(),
            AdminUserId = adminUserId,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            Details = details is { Length: > 500 } ? details[..500] : details,
        });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Removes entries older than the keep time (GDPR storage limitation). Runs after each admin login.</summary>
    public Task<int> RemoveOldAsync(int keepDays, CancellationToken ct)
    {
        var before = clock.GetUtcNow().AddDays(-Math.Max(30, keepDays));
        return db.Set<AdminAuditEntry>().Where(e => e.At < before).ExecuteDeleteAsync(ct);
    }
}

/// <summary>Small text helpers for the back office.</summary>
internal static class AdminText
{
    /// <summary>"jane.doe@gmail.com" → "j***@gmail.com". Lists show only this; the full email is on the account page.</summary>
    public static string MaskEmail(string? email)
    {
        if (string.IsNullOrEmpty(email)) return "";
        var at = email.LastIndexOf('@');
        if (at <= 0) return "***";
        return $"{email[0]}***{email[at..]}";
    }
}
