using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;

namespace TravelApp.Api.Features.Sync;

// The sync write endpoint (KAN-16, decisions/features/02-offline-sync.md).
// The phone sends its waiting changes (the PowerSync upload queue) in the shape PowerSync gives them:
// one change per row, with the table ("type"), the row id, the operation and the changed columns.
// Column names are the database names (snake_case), because that is what PowerSync stores on the phone.

public static class SyncLimits
{
    public const int ChangesMax = 500;
    public const int TypeMax = 64;
    public const string Put = "PUT";
    public const string Patch = "PATCH";
    public const string Delete = "DELETE";
    public const string Ok = "ok";
    public const string Rejected = "rejected";
}

/// <summary>One waiting change from the phone.</summary>
/// <param name="Op">PUT (create or replace the row), PATCH (change some columns) or DELETE (soft delete).</param>
/// <param name="Type">The table, for example "trips", "trip_stops" or "flights".</param>
/// <param name="Id">The row id (UUID v7, created on the phone).</param>
/// <param name="Data">The columns to write, snake_case. Empty for DELETE. Server-only columns are ignored.</param>
public sealed record SyncChange(
    [property: Required, AllowedValues(SyncLimits.Put, SyncLimits.Patch, SyncLimits.Delete)] string Op,
    [property: Required, MaxLength(SyncLimits.TypeMax)] string Type,
    [property: Required] Guid Id,
    Dictionary<string, JsonElement>? Data = null);

/// <summary>The phone's waiting changes, applied in this order.</summary>
public sealed record SyncUploadRequest(
    [property: Required, MinLength(1), MaxLength(SyncLimits.ChangesMax)] IReadOnlyList<SyncChange> Changes);

/// <summary>What happened to one change.</summary>
/// <param name="Status">"ok" or "rejected". A rejected change is not retried: the phone drops it and takes the server's row.</param>
/// <param name="Problems">Why it was rejected, per column ("field" → messages).</param>
public sealed record SyncChangeResult(Guid Id, string Type, string Status, IReadOnlyDictionary<string, string[]>? Problems = null);

/// <summary>One result per change, in the same order.</summary>
public sealed record SyncUploadResponse(IReadOnlyList<SyncChangeResult> Results);

/// <summary>A change after the endpoint has checked its shape, handed to the feature that owns the table.</summary>
public sealed record SyncWrite(Guid UserId, string Op, string Type, Guid Id, SyncData Data);

/// <summary>
/// A feature that owns synced tables implements this (structure rule 2: Sync only knows this interface).
/// Each write checks ownership and the feature's rules, then applies the columns one by one (S4).
/// </summary>
public interface ISyncTable
{
    /// <summary>The tables this feature writes, for example ["trips", "trip_stops", "flights"].</summary>
    IReadOnlyCollection<string> Types { get; }

    /// <summary>Applies the change. Returns problems per field; an empty dictionary means it was saved.</summary>
    Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken cancellationToken);
}

/// <summary>
/// The columns of one change, with typed readers. Values may come as JSON types or as text,
/// because the phone's local database (SQLite) keeps dates, lists and booleans as text or numbers.
/// Every reader records a problem when the value has the wrong type.
/// </summary>
public sealed class SyncData(IReadOnlyDictionary<string, JsonElement> values)
{
    private readonly Dictionary<string, List<string>> _problems = [];

    public IEnumerable<string> Columns => values.Keys;

    public bool Has(string column) => values.ContainsKey(column);

    public IReadOnlyDictionary<string, string[]> Problems => _problems.ToDictionary(p => p.Key, p => p.Value.ToArray());

    public void AddProblem(string column, string message)
    {
        if (!_problems.TryGetValue(column, out var list)) _problems[column] = list = [];
        list.Add(message);
    }

    /// <summary>Reads a column when it was sent. <paramref name="set"/> runs only for a value of the right type.</summary>
    public void Text(string column, Action<string?> set) => Read(column, set, v => v.ValueKind == JsonValueKind.String ? (true, v.GetString()) : (false, null), "text");

    public void WholeNumber(string column, Action<int?> set) => Read(column, set, v => v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i) ? (true, i) : (false, (int?)null), "a whole number");

    /// <summary>A whole number that may be larger than an int (money in minor units).</summary>
    public void LongNumber(string column, Action<long?> set) => Read(column, set, v => v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var i) ? (true, i) : (false, (long?)null), "a whole number");

    public void Number(string column, Action<double?> set) => Read(column, set, v => v.ValueKind == JsonValueKind.Number ? (true, v.GetDouble()) : (false, (double?)null), "a number");

    /// <summary>JSON true/false, or 1/0 as SQLite stores it.</summary>
    public void Bool(string column, Action<bool?> set) => Read(column, set, v => v.ValueKind switch
    {
        JsonValueKind.True => (true, true),
        JsonValueKind.False => (true, false),
        JsonValueKind.Number when v.TryGetInt32(out var i) && i is 0 or 1 => (true, i == 1),
        _ => (false, (bool?)null),
    }, "true or false");

    /// <summary>"2027-04-12".</summary>
    public void Date(string column, Action<DateOnly?> set) => Read(column, set, v =>
        v.ValueKind == JsonValueKind.String && DateOnly.TryParseExact(v.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? (true, d) : (false, (DateOnly?)null), "a date like 2027-04-12");

    /// <summary>Local time without offset, "2027-04-12T09:40" or with seconds.</summary>
    public void LocalDateTime(string column, Action<DateTime?> set) => Read(column, set, v =>
        v.ValueKind == JsonValueKind.String && System.DateTime.TryParseExact(v.GetString(), ["yyyy-MM-ddTHH:mm", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-dd HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? (true, DateTime.SpecifyKind(d, DateTimeKind.Unspecified)) : (false, (DateTime?)null), "a local time like 2027-04-12T09:40");

    /// <summary>A time with offset, "2027-04-12T09:40:00+02:00".</summary>
    public void Timestamp(string column, Action<DateTimeOffset?> set) => Read(column, set, v =>
        v.ValueKind == JsonValueKind.String && DateTimeOffset.TryParse(v.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? (true, d.ToUniversalTime()) : (false, (DateTimeOffset?)null), "a time with offset");

    public void Uuid(string column, Action<Guid?> set) => Read(column, set, v =>
        v.ValueKind == JsonValueKind.String && System.Guid.TryParse(v.GetString(), out var g) ? (true, g) : (false, (Guid?)null), "a UUID");

    /// <summary>A JSON list of texts, or that list written as text (how SQLite keeps it).</summary>
    public void StringList(string column, Action<List<string>?> set) => Read(column, set, v =>
    {
        var list = v;
        if (v.ValueKind == JsonValueKind.String)
        {
            try { list = JsonDocument.Parse(v.GetString()!).RootElement; }
            catch (JsonException) { return (false, null); }
        }
        if (list.ValueKind != JsonValueKind.Array || list.EnumerateArray().Any(e => e.ValueKind != JsonValueKind.String)) return (false, null);
        return (true, list.EnumerateArray().Select(e => e.GetString()!).ToList());
    }, "a list of texts");

    private void Read<T>(string column, Action<T?> set, Func<JsonElement, (bool Ok, T? Value)> parse, string expected)
    {
        if (!values.TryGetValue(column, out var value)) return;
        if (value.ValueKind == JsonValueKind.Null)
        {
            set(default);
            return;
        }
        var (ok, parsed) = parse(value);
        if (ok) set(parsed);
        else AddProblem(column, $"Must be {expected}.");
    }
}
