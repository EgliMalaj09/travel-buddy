using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.AppConfig;

/// <summary>Reads and saves the one AppConfig row.</summary>
internal sealed partial class AppConfigService(AppDbContext db, TimeProvider clock) : IAppConfigStore
{
    public async Task<AppConfigDto> GetAsync(CancellationToken ct) => ToDto(await LoadAsync(tracking: false, ct));

    public async Task<AppConfigUpdateResult> UpdateAsync(UpdateAppConfigRequest request, CancellationToken ct)
    {
        if (Check(request) is { } reason) return new(null, "invalid", reason, []);

        var row = await LoadAsync(tracking: true, ct);
        if (row.Version != request.Version) return new(null, "conflict", "Someone saved the settings first. Reload and try again.", []);

        var changed = new List<string>();
        if (row.MinAppVersion != request.MinAppVersion) changed.Add(nameof(row.MinAppVersion));
        if (row.MaxPhotoSizeMb != request.MaxPhotoSizeMb) changed.Add(nameof(row.MaxPhotoSizeMb));
        if (row.FreeTripLimit != request.FreeTripLimit) changed.Add(nameof(row.FreeTripLimit));
        if (!Same(row.PhotoQualityByPlan, request.PhotoQualityByPlan)) changed.Add(nameof(row.PhotoQualityByPlan));
        if (!Same(row.FeatureFlags, request.FeatureFlags)) changed.Add(nameof(row.FeatureFlags));
        if (changed.Count == 0) return new(ToDto(row), null, null, changed);

        row.MinAppVersion = request.MinAppVersion;
        row.MaxPhotoSizeMb = request.MaxPhotoSizeMb;
        row.FreeTripLimit = request.FreeTripLimit;
        row.PhotoQualityByPlan = new Dictionary<string, string>(request.PhotoQualityByPlan);
        row.FeatureFlags = new Dictionary<string, bool>(request.FeatureFlags);
        row.Version++;
        row.UpdatedAt = clock.GetUtcNow();
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new(null, "conflict", "Someone saved the settings first. Reload and try again.", []);
        }

        return new(ToDto(row), null, null, changed);
    }

    private async Task<AppConfigRow> LoadAsync(bool tracking, CancellationToken ct)
    {
        var rows = tracking ? db.Set<AppConfigRow>() : db.Set<AppConfigRow>().AsNoTracking();
        // The migration adds the row; this only covers a database where it was removed by hand.
        return await rows.SingleOrDefaultAsync(c => c.Id == AppConfigRow.SingletonId, ct)
            ?? new AppConfigRow { UpdatedAt = clock.GetUtcNow() };
    }

    private static string? Check(UpdateAppConfigRequest r)
    {
        foreach (var (plan, quality) in r.PhotoQualityByPlan)
        {
            if (!AppConfigLimits.Plans.Contains(plan)) return $"Unknown plan \"{plan}\". Use free or paid.";
            if (quality is not (AppConfigLimits.Compressed or AppConfigLimits.Full)) return "Photo quality is compressed or full.";
        }

        if (r.FeatureFlags.Count > AppConfigLimits.MaxFlags) return $"At most {AppConfigLimits.MaxFlags} feature switches.";
        foreach (var name in r.FeatureFlags.Keys)
        {
            if (!FlagName().IsMatch(name)) return "Switch names are camelCase letters and digits, for example printAlbumEnabled.";
        }

        return null;
    }

    private static bool Same<T>(Dictionary<string, T> a, Dictionary<string, T> b) =>
        a.Count == b.Count && a.All(kv => b.TryGetValue(kv.Key, out var v) && EqualityComparer<T>.Default.Equals(v, kv.Value));

    private static AppConfigDto ToDto(AppConfigRow c) => new(c.MinAppVersion, c.MaxPhotoSizeMb, c.FreeTripLimit,
        new SortedDictionary<string, string>(c.PhotoQualityByPlan, StringComparer.Ordinal),
        new SortedDictionary<string, bool>(c.FeatureFlags, StringComparer.Ordinal), c.Version, c.UpdatedAt);

    [GeneratedRegex(AppConfigLimits.FlagPattern)]
    private static partial Regex FlagName();
}
