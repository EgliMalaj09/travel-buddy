namespace TravelApp.Api.Features.Trips;

/// <summary>
/// The fields of a trip as the phone sends them in a sync write (field names as in the data model).
/// Server-only fields (ownerId, sync fields) are not here: the server sets them.
/// </summary>
public sealed record TripFields(
    string Name,
    string Type,
    DateOnly? StartDate,
    DateOnly? EndDate,
    IReadOnlyList<string> Activities,
    string Status,
    string PassportCountrySnapshot,
    string HomeCurrencySnapshot,
    DateTimeOffset? FinishedAt = null,
    int? Rating = null,
    string? FinishNote = null);

/// <summary>The fields of a stop as the phone sends them.</summary>
public sealed record TripStopFields(
    Guid TripId,
    int Order,
    string CountryCode,
    string CityName,
    double? Lat,
    double? Lng,
    string? GeoProviderId,
    int Nights);

/// <summary>The fields of a flight as the phone sends them. Times are local at the airport.</summary>
public sealed record FlightFields(
    Guid TripId,
    int Order,
    string Direction,
    string? Airline,
    string? FlightNumber,
    string? DepartureAirport,
    string? ArrivalAirport,
    DateTime? DepartureLocalTime,
    DateTime? ArrivalLocalTime,
    string? DepartureTimeZone,
    string? ArrivalTimeZone,
    string? BookingCode,
    string? Seat,
    string? Terminal);

/// <summary>
/// The checks the sync write endpoint (KAN-16) runs before it applies a trip, stop or flight.
/// Each method returns problems per field ("field" → messages), ready for a ValidationProblem;
/// an empty dictionary means the record is fine. The only public surface of Trips for other features.
/// </summary>
public interface ITripWriteRules
{
    IReadOnlyDictionary<string, string[]> CheckTrip(TripFields trip);

    IReadOnlyDictionary<string, string[]> CheckStop(TripStopFields stop);

    IReadOnlyDictionary<string, string[]> CheckFlight(FlightFields flight);

    /// <summary>True when the user owns the trip (every stop and flight write checks this).</summary>
    Task<bool> OwnsTripAsync(Guid userId, Guid tripId, CancellationToken cancellationToken);

    /// <summary>A trip needs at least one stop; checked when a stop is deleted.</summary>
    Task<int> CountStopsAsync(Guid tripId, CancellationToken cancellationToken);

    /// <summary>Ids of every trip the user owns, deleted ones too (data export and account erase, KAN-22).</summary>
    Task<IReadOnlyList<Guid>> TripIdsOfOwnerAsync(Guid userId, CancellationToken cancellationToken);
}

/// <summary>
/// Implemented by features whose records hang off a trip (Places, later Checklist, Photos, Expenses).
/// When a trip is deleted, Trips calls every hook in the same transaction, so those records are soft-deleted
/// with it and phones see them go. Lets Trips stay unaware of the other features (structure rule 2).
/// </summary>
public interface ITripDeleteHook
{
    Task TripDeletedAsync(Guid tripId, DateTimeOffset at, CancellationToken cancellationToken);
}

/// <summary>A trip as the API returns it (field names as in the data model).</summary>
public sealed record TripDto(
    Guid Id,
    Guid OwnerId,
    string Name,
    string Type,
    DateOnly? StartDate,
    DateOnly? EndDate,
    IReadOnlyList<string> Activities,
    string Status,
    DateTimeOffset? FinishedAt,
    int? Rating,
    string? FinishNote,
    Guid? CoverMediaId,
    string PassportCountrySnapshot,
    string HomeCurrencySnapshot,
    DateTimeOffset? ChecklistGeneratedAt,
    string? ChecklistRulesVersion,
    bool AnniversaryEnabled,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

public sealed record TripStopDto(
    Guid Id,
    Guid TripId,
    int Order,
    string CountryCode,
    string CityName,
    double? Lat,
    double? Lng,
    string? GeoProviderId,
    int Nights,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

/// <summary>Departure and arrival times are local at the airport, without offset ("2027-04-12T09:40:00").</summary>
public sealed record FlightDto(
    Guid Id,
    Guid TripId,
    int Order,
    string Direction,
    string? Airline,
    string? FlightNumber,
    string? DepartureAirport,
    string? ArrivalAirport,
    DateTime? DepartureLocalTime,
    DateTime? ArrivalLocalTime,
    string? DepartureTimeZone,
    string? ArrivalTimeZone,
    string? BookingCode,
    string? Seat,
    string? Terminal,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

/// <summary>One page of the user's trips that are not deleted, with the stops and flights of those trips (in order).</summary>
/// <param name="NextCursor">Send it as "after" to get the next page. Empty on the last page.</param>
public sealed record MyTripsResponse(
    IReadOnlyList<TripDto> Trips,
    IReadOnlyList<TripStopDto> Stops,
    IReadOnlyList<FlightDto> Flights,
    string? NextCursor);

public static class TripsPaging
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 100;
}
