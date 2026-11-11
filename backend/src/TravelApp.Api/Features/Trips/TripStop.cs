using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Trips;

/// <summary>
/// A city where the traveller sleeps (data model 8; T7: sights are Places, not stops).
/// Arrival and departure are computed from the trip start date and the nights; never stored.
/// </summary>
internal sealed class TripStop : SyncEntity
{
    public Guid TripId { get; set; }

    public int Order { get; set; }

    public string CountryCode { get; set; } = "";

    public string CityName { get; set; } = "";

    /// <summary>Empty when the city was typed offline; filled in when the phone is online.</summary>
    public double? Lat { get; set; }

    public double? Lng { get; set; }

    public string? GeoProviderId { get; set; }

    public int Nights { get; set; }
}
