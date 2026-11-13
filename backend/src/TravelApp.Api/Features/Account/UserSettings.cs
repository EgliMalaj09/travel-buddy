using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// UserSettings (data model section 4): one row per account, synced, so every phone of the user has the same
/// reminder switches, quiet hours and units. The row id is the user id. Times are local "HH:MM" text, as the phone keeps them.
/// </summary>
internal sealed class UserSettings : SyncEntity
{
    public bool RemindersEnabled { get; set; } = true;

    public bool RemindChecklist { get; set; } = true;

    public bool RemindPackTonight { get; set; } = true;

    public bool RemindFlight { get; set; } = true;

    public bool RemindAnniversary { get; set; } = true;

    public string ReminderTime { get; set; } = "19:00";

    public string QuietHoursStart { get; set; } = "22:00";

    public string QuietHoursEnd { get; set; } = "08:00";

    /// <summary>km or mi.</summary>
    public string DistanceUnit { get; set; } = "km";

    /// <summary>C or F.</summary>
    public string TemperatureUnit { get; set; } = "C";

    /// <summary>shared or personal.</summary>
    public string DefaultPlaceScope { get; set; } = "shared";
}

internal static class UserSettingsValues
{
    public const string Table = "user_settings";
    public static readonly string[] DistanceUnits = ["km", "mi"];
    public static readonly string[] TemperatureUnits = ["C", "F"];
    public static readonly string[] PlaceScopes = ["shared", "personal"];
    public const string TimePattern = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
}
