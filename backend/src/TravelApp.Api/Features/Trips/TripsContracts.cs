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
    string HomeCurrencySnapshot);

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
}
