using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Trips;

/// <summary>
/// Writes of trips, stops and flights that come through the sync write endpoint (KAN-16).
/// Only the columns the phone sent are changed (S4: per field, last change wins). Server-only columns
/// (owner, sync fields) are never taken from the phone. Every write checks that the user owns the trip.
/// </summary>
internal sealed class TripsSyncTable(AppDbContext db, ITripWriteRules rules, IEnumerable<ITripDeleteHook> deleteHooks, TimeProvider clock) : ISyncTable
{
    public const string TripsTable = "trips";
    public const string StopsTable = "trip_stops";
    public const string FlightsTable = "flights";

    /// <summary>Set by the server. The phone has them too (PowerSync sends whole rows), so they are ignored, not refused.</summary>
    private static readonly HashSet<string> ServerColumns = ["id", "owner_id", "created_at", "updated_at", "deleted_at", "version"];

    private static readonly HashSet<string> TripColumns =
    [
        "name", "type", "start_date", "end_date", "activities", "status", "finished_at", "rating", "finish_note", "cover_media_id",
        "passport_country_snapshot", "home_currency_snapshot", "checklist_generated_at", "checklist_rules_version", "anniversary_enabled",
    ];

    private static readonly HashSet<string> StopColumns = ["trip_id", "order", "country_code", "city_name", "lat", "lng", "geo_provider_id", "nights"];

    private static readonly HashSet<string> FlightColumns =
    [
        "trip_id", "order", "direction", "airline", "flight_number", "departure_airport", "arrival_airport",
        "departure_local_time", "arrival_local_time", "departure_time_zone", "arrival_time_zone", "booking_code", "seat", "terminal",
    ];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [TripsTable, StopsTable, FlightsTable];

    public Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct) => write.Type switch
    {
        TripsTable => ApplyTripAsync(write, ct),
        StopsTable => ApplyStopAsync(write, ct),
        FlightsTable => ApplyFlightAsync(write, ct),
        _ => throw new ArgumentOutOfRangeException(nameof(write), write.Type, "Not a Trips table."),
    };

    private async Task<IReadOnlyDictionary<string, string[]>> ApplyTripAsync(SyncWrite write, CancellationToken ct)
    {
        var trip = await db.Set<Trip>().FirstOrDefaultAsync(t => t.Id == write.Id, ct);
        if (trip is not null && trip.OwnerId != write.UserId) return NotFound();

        if (write.Op == SyncLimits.Delete)
        {
            if (trip is null || trip.DeletedAt is not null) return Fine;
            var at = Now;
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            SoftDelete(trip, at);
            // Its stops and flights go with it, so no one sees them on their own.
            await db.Set<TripStop>().Where(s => s.TripId == trip.Id && s.DeletedAt == null)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.DeletedAt, at).SetProperty(s => s.UpdatedAt, at).SetProperty(s => s.Version, s => s.Version + 1), ct);
            await db.Set<Flight>().Where(f => f.TripId == trip.Id && f.DeletedAt == null)
                .ExecuteUpdateAsync(u => u.SetProperty(f => f.DeletedAt, at).SetProperty(f => f.UpdatedAt, at).SetProperty(f => f.Version, f => f.Version + 1), ct);
            // Records of other features on this trip (places, ...) go too.
            foreach (var hook in deleteHooks) await hook.TripDeletedAsync(trip.Id, at, ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Fine;
        }

        if (Start(write, trip, TripColumns) is { } refused) return refused;
        trip ??= Add(new Trip { Id = write.Id, OwnerId = write.UserId });

        var d = write.Data;
        d.Text("name", v => trip.Name = v?.Trim() ?? "");
        d.Text("type", v => trip.Type = v ?? "");
        d.Date("start_date", v => trip.StartDate = v);
        d.Date("end_date", v => trip.EndDate = v);
        d.StringList("activities", v => trip.Activities = v ?? []);
        d.Text("status", v => trip.Status = v ?? "");
        d.Timestamp("finished_at", v => trip.FinishedAt = v);
        d.WholeNumber("rating", v => trip.Rating = v);
        d.Text("finish_note", v => trip.FinishNote = Clean(v));
        d.Uuid("cover_media_id", v => trip.CoverMediaId = v);
        d.Text("passport_country_snapshot", v => trip.PassportCountrySnapshot = v ?? "");
        d.Text("home_currency_snapshot", v => trip.HomeCurrencySnapshot = v ?? "");
        d.Timestamp("checklist_generated_at", v => trip.ChecklistGeneratedAt = v);
        d.Text("checklist_rules_version", v => trip.ChecklistRulesVersion = v);
        d.Bool("anniversary_enabled", v =>
        {
            if (v is { } b) trip.AnniversaryEnabled = b;
            else d.AddProblem("anniversary_enabled", "Must be true or false.");
        });
        if (trip.ChecklistRulesVersion?.Length > 20) d.AddProblem("checklist_rules_version", "Up to 20 characters.");
        if (d.Problems.Count > 0) return d.Problems;

        var problems = rules.CheckTrip(new TripFields(trip.Name, trip.Type, trip.StartDate, trip.EndDate, trip.Activities,
            trip.Status, trip.PassportCountrySnapshot, trip.HomeCurrencySnapshot, trip.FinishedAt, trip.Rating, trip.FinishNote));
        if (problems.Count > 0) return ToColumns(problems);

        Touch(trip);
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private async Task<IReadOnlyDictionary<string, string[]>> ApplyStopAsync(SyncWrite write, CancellationToken ct)
    {
        var stop = await db.Set<TripStop>().FirstOrDefaultAsync(s => s.Id == write.Id, ct);
        if (stop is not null && !await OwnsAsync(write.UserId, stop.TripId, includeDeleted: true, ct)) return NotFound();

        if (write.Op == SyncLimits.Delete)
        {
            if (stop is null || stop.DeletedAt is not null) return Fine;
            // A trip needs at least one stop (its own delete takes the stops with it).
            if (await TripIsLiveAsync(stop.TripId, ct) && await rules.CountStopsAsync(stop.TripId, ct) <= 1)
                return Problem("id", "A trip needs at least one stop. Add the new stop first, then remove this one.");
            SoftDelete(stop, Now);
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (Start(write, stop, StopColumns) is { } refused) return refused;
        var isNew = stop is null;
        stop ??= Add(new TripStop { Id = write.Id });
        var oldTripId = stop.TripId;

        var d = write.Data;
        d.Uuid("trip_id", v => stop.TripId = v ?? Guid.Empty);
        d.WholeNumber("order", v => Required(d, "order", v, i => stop.Order = i));
        d.Text("country_code", v => stop.CountryCode = v ?? "");
        d.Text("city_name", v => stop.CityName = v?.Trim() ?? "");
        d.Number("lat", v => stop.Lat = v);
        d.Number("lng", v => stop.Lng = v);
        d.Text("geo_provider_id", v => stop.GeoProviderId = v);
        d.WholeNumber("nights", v => Required(d, "nights", v, i => stop.Nights = i));
        if (stop.GeoProviderId?.Length > 200) d.AddProblem("geo_provider_id", "Up to 200 characters.");
        if (isNew && !d.Has("nights")) d.AddProblem("nights", "A new stop needs its nights.");
        if (d.Problems.Count > 0) return d.Problems;
        if (TripMoved(isNew, oldTripId, stop.TripId) is { } moved) return moved;

        var problems = rules.CheckStop(new TripStopFields(stop.TripId, stop.Order, stop.CountryCode, stop.CityName,
            stop.Lat, stop.Lng, stop.GeoProviderId, stop.Nights));
        if (problems.Count > 0) return ToColumns(problems);
        if (!await rules.OwnsTripAsync(write.UserId, stop.TripId, ct)) return Problem("trip_id", "Trip not found.");

        Touch(stop);
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private async Task<IReadOnlyDictionary<string, string[]>> ApplyFlightAsync(SyncWrite write, CancellationToken ct)
    {
        var flight = await db.Set<Flight>().FirstOrDefaultAsync(f => f.Id == write.Id, ct);
        if (flight is not null && !await OwnsAsync(write.UserId, flight.TripId, includeDeleted: true, ct)) return NotFound();

        if (write.Op == SyncLimits.Delete)
        {
            if (flight is null || flight.DeletedAt is not null) return Fine;
            SoftDelete(flight, Now);
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (Start(write, flight, FlightColumns) is { } refused) return refused;
        var isNew = flight is null;
        flight ??= Add(new Flight { Id = write.Id });
        var oldTripId = flight.TripId;

        var d = write.Data;
        d.Uuid("trip_id", v => flight.TripId = v ?? Guid.Empty);
        d.WholeNumber("order", v => Required(d, "order", v, i => flight.Order = i));
        d.Text("direction", v => flight.Direction = v ?? "");
        d.Text("airline", v => flight.Airline = Clean(v));
        d.Text("flight_number", v => flight.FlightNumber = Clean(v));
        d.Text("departure_airport", v => flight.DepartureAirport = Clean(v));
        d.Text("arrival_airport", v => flight.ArrivalAirport = Clean(v));
        d.LocalDateTime("departure_local_time", v => flight.DepartureLocalTime = v);
        d.LocalDateTime("arrival_local_time", v => flight.ArrivalLocalTime = v);
        d.Text("departure_time_zone", v => flight.DepartureTimeZone = Clean(v));
        d.Text("arrival_time_zone", v => flight.ArrivalTimeZone = Clean(v));
        d.Text("booking_code", v => flight.BookingCode = Clean(v));
        d.Text("seat", v => flight.Seat = Clean(v));
        d.Text("terminal", v => flight.Terminal = Clean(v));
        if (d.Problems.Count > 0) return d.Problems;
        if (TripMoved(isNew, oldTripId, flight.TripId) is { } moved) return moved;

        var problems = rules.CheckFlight(new FlightFields(flight.TripId, flight.Order, flight.Direction, flight.Airline,
            flight.FlightNumber, flight.DepartureAirport, flight.ArrivalAirport, flight.DepartureLocalTime, flight.ArrivalLocalTime,
            flight.DepartureTimeZone, flight.ArrivalTimeZone, flight.BookingCode, flight.Seat, flight.Terminal));
        if (problems.Count > 0) return ToColumns(problems);
        if (!await rules.OwnsTripAsync(write.UserId, flight.TripId, ct)) return Problem("trip_id", "Trip not found.");

        Touch(flight);
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private DateTimeOffset Now => clock.GetUtcNow();

    /// <summary>Common checks before a PUT or PATCH: the row may not be deleted, PATCH needs the row, no unknown columns.</summary>
    private static Dictionary<string, string[]>? Start(SyncWrite write, SyncEntity? row, HashSet<string> columns)
    {
        if (row?.DeletedAt is not null) return Problem("id", "This was deleted.");
        if (row is null && write.Op == SyncLimits.Patch) return NotFound();
        var unknown = write.Data.Columns.Where(c => !columns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        return unknown.Count > 0
            ? unknown.ToDictionary(c => c, _ => UnknownColumn)
            : null;
    }

    private T Add<T>(T row) where T : SyncEntity
    {
        row.CreatedAt = Now;
        row.Version = 0;
        db.Add(row);
        return row;
    }

    private void Touch(SyncEntity row)
    {
        row.UpdatedAt = Now;
        row.Version += 1;
    }

    private static void SoftDelete(SyncEntity row, DateTimeOffset at)
    {
        row.DeletedAt = at;
        row.UpdatedAt = at;
        row.Version += 1;
    }

    private Task<bool> OwnsAsync(Guid userId, Guid tripId, bool includeDeleted, CancellationToken ct) =>
        db.Set<Trip>().AnyAsync(t => t.Id == tripId && t.OwnerId == userId && (includeDeleted || t.DeletedAt == null), ct);

    private Task<bool> TripIsLiveAsync(Guid tripId, CancellationToken ct) =>
        db.Set<Trip>().AnyAsync(t => t.Id == tripId && t.DeletedAt == null, ct);

    /// <summary>A stop or flight stays with its trip.</summary>
    private static Dictionary<string, string[]>? TripMoved(bool isNew, Guid oldTripId, Guid newTripId) =>
        !isNew && oldTripId != newTripId ? Problem("trip_id", "A stop or flight cannot move to another trip.") : null;

    private static void Required(SyncData d, string column, int? value, Action<int> set)
    {
        if (value is { } v) set(v);
        else d.AddProblem(column, "Must be a whole number.");
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static Dictionary<string, string[]> NotFound() => Problem("id", "Not found.");

    private static Dictionary<string, string[]> Problem(string column, string message) =>
        new Dictionary<string, string[]> { [column] = [message] };

    /// <summary>The rules name fields like the data model (startDate); the phone sent columns (start_date).</summary>
    private static Dictionary<string, string[]> ToColumns(IReadOnlyDictionary<string, string[]> problems) =>
        problems.ToDictionary(p => SnakeCase(p.Key), p => p.Value);

    private static string SnakeCase(string name) =>
        string.Concat(name.Select((c, i) => char.IsUpper(c) ? (i > 0 ? "_" : "") + char.ToLowerInvariant(c) : c.ToString()));
}
