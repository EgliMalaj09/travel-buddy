using System.Text.Json;

namespace TravelApp.Api.Features.Account;

// Profile, settings, data export and account deletion (KAN-22, decisions/features/10-profile-account.md).

/// <summary>
/// Implemented by every feature that keeps a user's data (structure rule 2: Account only knows this interface).
/// <list type="bullet">
/// <item><see cref="ExportAsync"/>: everything the feature keeps about the user, for "Download my data" (GDPR right of access).</item>
/// <item><see cref="PurgeAsync"/>: removes what a database cascade cannot (files in Blob Storage, rows found by email).</item>
/// </list>
/// The rows themselves go when Auth finally removes the user row: every table has a foreign key to the user or
/// to a trip with ON DELETE CASCADE (Data/FeatureLinks.cs).
/// </summary>
public interface IUserData
{
    /// <summary>Purge order: lower runs first. Files first (so no file is left without its record), the user row last.</summary>
    int PurgeOrder => 0;

    /// <summary>Named parts of the export, for example "trips" → list of trips. Values are serialised as JSON.</summary>
    Task<IReadOnlyDictionary<string, object>> ExportAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Removes data a cascade cannot. Throws when it cannot finish; the purge job tries again later.</summary>
    Task PurgeAsync(Guid userId, CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>Accounts waiting to be erased, from Auth (it owns the user row).</summary>
public interface IAccountsToPurge
{
    /// <summary>Ids of accounts whose waiting time is over, oldest first.</summary>
    Task<IReadOnlyList<Guid>> DueAsync(DateTimeOffset now, int max, CancellationToken cancellationToken);
}

/// <summary>Export and erase on request, for the back office (KAN-55: GDPR requests that come by email).</summary>
public interface IAccountAdmin
{
    /// <summary>The same file as "Download my data".</summary>
    Task<AccountExportResponse> ExportAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Erases the account and all its data now, without the 30 days. Cannot be undone.</summary>
    Task EraseNowAsync(Guid userId, CancellationToken cancellationToken);
}

/// <summary>"Download my data": every record the server keeps about the user, as JSON.</summary>
/// <param name="ExportedAt">When the file was made.</param>
/// <param name="FormatVersion">Changes when the shape of the file changes.</param>
/// <param name="Data">
/// One entry per kind of record: "account", "settings", "devices", "trips", "tripStops", "flights", "places",
/// "checklistItems", "expenses", "photos". Deleted records still kept on the server are included, with deletedAt set.
/// Photo files are not inside; the phone has them, and they can be downloaded with GET /media/{id}/file.
/// </param>
public sealed record AccountExportResponse(DateTimeOffset ExportedAt, int FormatVersion, IReadOnlyDictionary<string, JsonElement> Data);
