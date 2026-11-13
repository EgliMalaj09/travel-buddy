namespace TravelApp.Api.Features.Account;

/// <summary>Configuration section "Account". The 30 days before an erase are Auth:DeletionGraceDays.</summary>
internal sealed class AccountOptions
{
    public const string Section = "Account";

    /// <summary>How often the purge job looks for accounts whose 30 days are over.</summary>
    public int PurgeIntervalMinutes { get; set; } = 60;

    /// <summary>"Download my data" calls per user per hour (the export reads every table).</summary>
    public int ExportsPerHourPerUser { get; set; } = 5;
}
