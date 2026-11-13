using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Tests.Features.Trips;

/// <summary>The checks the sync write endpoint will run on trips, stops and flights (no database needed).</summary>
public sealed class TripRulesTests
{
    private static readonly TripsService Rules = new(null!);

    internal static TripFields ValidTrip => new(
        "Rome & Florence", "solo", new DateOnly(2027, 4, 12), new DateOnly(2027, 4, 19),
        ["city", "food"], "planned", "AL", "ALL");

    internal static TripStopFields ValidStop(Guid tripId) => new(tripId, 0, "IT", "Rome", 41.9, 12.5, null, 4);

    internal static FlightFields ValidFlight(Guid tripId) => new(
        tripId, 0, "outbound", "Wizz Air", "W6 4567", "TIA", "FCO",
        new DateTime(2027, 4, 12, 9, 40, 0, DateTimeKind.Unspecified), null, "Europe/Tirane", null, "K7Q2LM", "14A", null);

    [Fact]
    public void A_valid_trip_stop_and_flight_pass()
    {
        Assert.Empty(Rules.CheckTrip(ValidTrip));
        Assert.Empty(Rules.CheckStop(ValidStop(Guid.NewGuid())));
        Assert.Empty(Rules.CheckFlight(ValidFlight(Guid.NewGuid())));
    }

    [Fact]
    public void Someday_trips_have_no_dates_and_flights_can_be_empty()
    {
        Assert.Empty(Rules.CheckTrip(ValidTrip with { StartDate = null, EndDate = null, Activities = [] }));
        Assert.Empty(Rules.CheckFlight(new FlightFields(Guid.NewGuid(), 1, "return", null, null, null, null, null, null, null, null, null, null, null)));
    }

    [Fact]
    public void Trip_problems_are_reported_per_field()
    {
        var problems = Rules.CheckTrip(ValidTrip with
        {
            Name = " ",
            Type = "group",
            EndDate = new DateOnly(2027, 4, 1),
            Activities = ["city", "diving"],
            PassportCountrySnapshot = "Albania",
        });

        Assert.Equal(["activities", "endDate", "name", "passportCountrySnapshot", "type"], problems.Keys.Order());
        Assert.Contains("before the first day", problems["endDate"][0], StringComparison.Ordinal);
        Assert.Contains("Send both", Rules.CheckTrip(ValidTrip with { EndDate = null })["endDate"][0], StringComparison.Ordinal);
    }

    [Fact]
    public void Stops_need_a_city_country_and_nights_of_zero_or_more()
    {
        var problems = Rules.CheckStop(ValidStop(Guid.NewGuid()) with { CityName = "", CountryCode = "it", Nights = -1, Lng = null });

        Assert.Equal(["cityName", "countryCode", "lat", "nights"], problems.Keys.Order());
        // Typed offline: no map position yet is fine.
        Assert.Empty(Rules.CheckStop(ValidStop(Guid.NewGuid()) with { Lat = null, Lng = null }));
    }

    [Fact]
    public void Flights_check_direction_lengths_and_time_zones()
    {
        var problems = Rules.CheckFlight(ValidFlight(Guid.NewGuid()) with
        {
            Direction = "inbound",
            FlightNumber = "W6 4567 8901",
            DepartureTimeZone = "Mars/Olympus",
        });

        Assert.Equal(["departureTimeZone", "direction", "flightNumber"], problems.Keys.Order());
    }

    [Fact]
    public void A_finished_trip_needs_dates_a_finish_time_and_a_rating_from_1_to_5()
    {
        var finished = ValidTrip with { Status = "finished", FinishedAt = DateTimeOffset.UnixEpoch, Rating = 4, FinishNote = "Tiles and hills." };
        Assert.Empty(Rules.CheckTrip(finished));

        Assert.Equal(["finishedAt", "rating"], Rules.CheckTrip(ValidTrip with { Status = "finished" }).Keys.Order());
        Assert.Contains("status", Rules.CheckTrip(finished with { StartDate = null, EndDate = null }).Keys);
        Assert.Contains("rating", Rules.CheckTrip(finished with { Rating = 0 }).Keys);
        Assert.Contains("finishNote", Rules.CheckTrip(finished with { FinishNote = new string('a', 201) }).Keys);
        // A planned trip has no finish time, but keeps its rating when it is opened again.
        Assert.Contains("finishedAt", Rules.CheckTrip(ValidTrip with { FinishedAt = DateTimeOffset.UnixEpoch }).Keys);
        Assert.Empty(Rules.CheckTrip(ValidTrip with { Rating = 3 }));
    }
}
