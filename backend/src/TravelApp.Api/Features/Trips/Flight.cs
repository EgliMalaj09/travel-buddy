using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Trips;

/// <summary>One flight of a trip (data model 8b, T5). Every detail is optional.</summary>
internal sealed class Flight : SyncEntity
{
    public Guid TripId { get; set; }

    public int Order { get; set; }

    /// <summary>outbound, return or other (<see cref="TripValues.Directions"/>).</summary>
    public string Direction { get; set; } = TripValues.Outbound;

    public string? Airline { get; set; }

    public string? FlightNumber { get; set; }

    public string? DepartureAirport { get; set; }

    public string? ArrivalAirport { get; set; }

    /// <summary>Local time at the departure airport, no offset.</summary>
    public DateTime? DepartureLocalTime { get; set; }

    /// <summary>Local time at the arrival airport, no offset.</summary>
    public DateTime? ArrivalLocalTime { get; set; }

    /// <summary>IANA zone, e.g. "Europe/Tirane".</summary>
    public string? DepartureTimeZone { get; set; }

    public string? ArrivalTimeZone { get; set; }

    public string? BookingCode { get; set; }

    public string? Seat { get; set; }

    public string? Terminal { get; set; }
}
