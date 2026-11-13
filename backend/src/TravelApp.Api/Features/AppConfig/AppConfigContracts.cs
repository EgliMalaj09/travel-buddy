using System.ComponentModel.DataAnnotations;

namespace TravelApp.Api.Features.AppConfig;

// AppConfig (decisions/data-model.md, section 6): settings for every phone, edited in the back office (KAN-55).
// The phone reads them from GET /app-config and keeps the last copy for offline use.

public static class AppConfigLimits
{
    public const string VersionPattern = "^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$";
    public const string FlagPattern = "^[a-z][a-zA-Z0-9]{1,39}$";
    public const int MaxFlags = 50;
    public const string Compressed = "compressed";
    public const string Full = "full";
    public static readonly IReadOnlyList<string> Plans = ["free", "paid"];
}

/// <summary>Settings for every phone.</summary>
/// <param name="MinAppVersion">Older app versions show "Update the app" and stop syncing (for example "1.0.0").</param>
/// <param name="MaxPhotoSizeMb">Largest photo file the phone uploads, in MB.</param>
/// <param name="FreeTripLimit">Trips a free account may create or join (D13). Not enforced until plans exist (Part 2).</param>
/// <param name="PhotoQualityByPlan">Plan ("free", "paid") → "compressed" or "full".</param>
/// <param name="FeatureFlags">Feature switches, for example "printAlbumEnabled" → false.</param>
/// <param name="Version">Goes up on every change; send it back when you save so two admins never overwrite each other.</param>
/// <param name="UpdatedAt">Last change.</param>
public sealed record AppConfigDto(
    string MinAppVersion,
    int MaxPhotoSizeMb,
    int FreeTripLimit,
    IReadOnlyDictionary<string, string> PhotoQualityByPlan,
    IReadOnlyDictionary<string, bool> FeatureFlags,
    long Version,
    DateTimeOffset UpdatedAt);

/// <summary>New settings from the back office. <paramref name="Version"/> is the version you started from.</summary>
public sealed record UpdateAppConfigRequest(
    [property: Required, RegularExpression(AppConfigLimits.VersionPattern)] string MinAppVersion,
    [property: Range(1, 50)] int MaxPhotoSizeMb,
    [property: Range(0, 100)] int FreeTripLimit,
    [property: Required] Dictionary<string, string> PhotoQualityByPlan,
    [property: Required] Dictionary<string, bool> FeatureFlags,
    [property: Range(1, long.MaxValue)] long Version);

/// <summary>Read and change AppConfig (used by the Admin feature).</summary>
public interface IAppConfigStore
{
    Task<AppConfigDto> GetAsync(CancellationToken ct);

    /// <summary>The saved settings, or why not: "invalid" (with the reason) or "conflict" (someone saved first).</summary>
    Task<AppConfigUpdateResult> UpdateAsync(UpdateAppConfigRequest request, CancellationToken ct);
}

/// <param name="ChangedFields">Names of the fields that changed (for the audit log; values are not personal data).</param>
public sealed record AppConfigUpdateResult(AppConfigDto? Config, string? Error, string? Reason, IReadOnlyList<string> ChangedFields);
