namespace TravelApp.Api.Features.Trips;

/// <summary>Allowed values and limits, exactly as in decisions/data-model.md (the phone sends these strings).</summary>
public static class TripValues
{
    public const string Solo = "solo";
    public const string Shared = "shared";
    public const string Planned = "planned";
    public const string Finished = "finished";
    public const string Outbound = "outbound";
    public const string Return = "return";
    public const string Other = "other";

    public static readonly IReadOnlyList<string> Types = [Solo, Shared];
    public static readonly IReadOnlyList<string> Statuses = [Planned, Finished];
    public static readonly IReadOnlyList<string> Directions = [Outbound, Return, Other];
    public static readonly IReadOnlyList<string> Activities =
        ["beach", "city", "culture", "food", "hiking", "skiing", "road_trip", "business", "relaxing"];

    public const int NameMax = 120;
    public const int CityNameMax = 120;
    public const int AirlineMax = 60;
    public const int FlightNumberMax = 10;
    public const int AirportMax = 60;
    public const int TimeZoneMax = 64;
    public const int BookingCodeMax = 12;
    public const int SeatMax = 10;
    public const int TerminalMax = 10;
}
