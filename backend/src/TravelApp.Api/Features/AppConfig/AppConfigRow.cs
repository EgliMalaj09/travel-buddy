namespace TravelApp.Api.Features.AppConfig;

/// <summary>The one AppConfig row (id 1). Not personal data.</summary>
internal sealed class AppConfigRow
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;

    public string MinAppVersion { get; set; } = "1.0.0";

    public int MaxPhotoSizeMb { get; set; } = 15;

    public int FreeTripLimit { get; set; } = 1;

    public Dictionary<string, string> PhotoQualityByPlan { get; set; } = new() { ["free"] = "compressed", ["paid"] = "full" };

    public Dictionary<string, bool> FeatureFlags { get; set; } = [];

    public long Version { get; set; } = 1;

    public DateTimeOffset UpdatedAt { get; set; }
}
