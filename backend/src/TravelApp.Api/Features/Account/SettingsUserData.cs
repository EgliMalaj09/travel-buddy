using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Account;

/// <summary>The settings row in "Download my data". Erased by the cascade from the user row.</summary>
internal sealed class SettingsUserData(AppDbContext db) : IUserData
{
    public async Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken ct)
    {
        var settings = await db.Set<UserSettings>().AsNoTracking().SingleOrDefaultAsync(s => s.Id == userId, ct);
        // No row yet means the phone never changed anything: the defaults apply.
        return new Dictionary<string, object> { ["settings"] = settings ?? new UserSettings { Id = userId } };
    }
}
