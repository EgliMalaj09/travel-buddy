using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Trips;

/// <summary>Create a trip, backend side (KAN-19): the rules from decisions/features/03-create-trip.md.</summary>
internal sealed partial class TripsService(AppDbContext db) : ITripWriteRules
{
    public IReadOnlyDictionary<string, string[]> CheckTrip(TripFields trip)
    {
        var problems = new Problems();
        if (string.IsNullOrWhiteSpace(trip.Name)) problems.Add("name", "The trip needs a name.");
        else if (trip.Name.Trim().Length > TripValues.NameMax) problems.Add("name", $"The name can be up to {TripValues.NameMax} characters.");
        if (!TripValues.Types.Contains(trip.Type)) problems.Add("type", "Type must be solo or shared.");
        if (!TripValues.Statuses.Contains(trip.Status)) problems.Add("status", "Status must be planned or finished.");
        if (trip.StartDate is null != trip.EndDate is null) problems.Add("endDate", "Send both the first and the last day, or neither (Someday).");
        else if (trip.EndDate < trip.StartDate) problems.Add("endDate", "The last day is before the first day.");
        foreach (var a in trip.Activities.Where(a => !TripValues.Activities.Contains(a)))
            problems.Add("activities", $"Unknown activity \"{a}\".");
        if (trip.Activities.Distinct().Count() != trip.Activities.Count) problems.Add("activities", "An activity is listed twice.");
        if (!CountryCode().IsMatch(trip.PassportCountrySnapshot)) problems.Add("passportCountrySnapshot", "Use a 2-letter ISO country code.");
        if (!CurrencyCode().IsMatch(trip.HomeCurrencySnapshot)) problems.Add("homeCurrencySnapshot", "Use a 3-letter ISO currency code.");
        return problems.Result;
    }

    public IReadOnlyDictionary<string, string[]> CheckStop(TripStopFields stop)
    {
        var problems = new Problems();
        if (stop.TripId == Guid.Empty) problems.Add("tripId", "The stop needs its trip.");
        if (stop.Order < 0) problems.Add("order", "Order must be 0 or more.");
        if (stop.Nights < 0) problems.Add("nights", "Nights must be 0 or more.");
        if (string.IsNullOrWhiteSpace(stop.CityName)) problems.Add("cityName", "The stop needs a city.");
        else if (stop.CityName.Trim().Length > TripValues.CityNameMax) problems.Add("cityName", $"The city can be up to {TripValues.CityNameMax} characters.");
        if (!CountryCode().IsMatch(stop.CountryCode)) problems.Add("countryCode", "Use a 2-letter ISO country code.");
        if (stop.Lat is null != stop.Lng is null) problems.Add("lat", "Send both lat and lng, or neither (typed offline).");
        else if (stop.Lat is < -90 or > 90 || stop.Lng is < -180 or > 180) problems.Add("lat", "The map position is out of range.");
        return problems.Result;
    }

    public IReadOnlyDictionary<string, string[]> CheckFlight(FlightFields flight)
    {
        var problems = new Problems();
        if (flight.TripId == Guid.Empty) problems.Add("tripId", "The flight needs its trip.");
        if (flight.Order < 0) problems.Add("order", "Order must be 0 or more.");
        if (!TripValues.Directions.Contains(flight.Direction)) problems.Add("direction", "Direction must be outbound, return or other.");
        problems.MaxLength("airline", flight.Airline, TripValues.AirlineMax);
        problems.MaxLength("flightNumber", flight.FlightNumber, TripValues.FlightNumberMax);
        problems.MaxLength("departureAirport", flight.DepartureAirport, TripValues.AirportMax);
        problems.MaxLength("arrivalAirport", flight.ArrivalAirport, TripValues.AirportMax);
        problems.MaxLength("bookingCode", flight.BookingCode, TripValues.BookingCodeMax);
        problems.MaxLength("seat", flight.Seat, TripValues.SeatMax);
        problems.MaxLength("terminal", flight.Terminal, TripValues.TerminalMax);
        CheckTimeZone(problems, "departureTimeZone", flight.DepartureTimeZone);
        CheckTimeZone(problems, "arrivalTimeZone", flight.ArrivalTimeZone);
        return problems.Result;
    }

    /// <summary>The user's trips that are not deleted, with their live stops and flights.</summary>
    public async Task<MyTripsResponse> ListMineAsync(Guid userId, CancellationToken ct)
    {
        var trips = await db.Set<Trip>().AsNoTracking()
            .Where(t => t.OwnerId == userId && t.DeletedAt == null)
            .OrderBy(t => t.StartDate == null).ThenBy(t => t.StartDate).ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);
        var tripIds = trips.Select(t => t.Id).ToList();
        var stops = await db.Set<TripStop>().AsNoTracking()
            .Where(s => tripIds.Contains(s.TripId) && s.DeletedAt == null)
            .OrderBy(s => s.TripId).ThenBy(s => s.Order)
            .ToListAsync(ct);
        var flights = await db.Set<Flight>().AsNoTracking()
            .Where(f => tripIds.Contains(f.TripId) && f.DeletedAt == null)
            .OrderBy(f => f.TripId).ThenBy(f => f.Order)
            .ToListAsync(ct);
        return new MyTripsResponse(
            trips.Select(t => new TripDto(t.Id, t.OwnerId, t.Name, t.Type, t.StartDate, t.EndDate, t.Activities, t.Status, t.FinishedAt,
                t.CoverMediaId, t.PassportCountrySnapshot, t.HomeCurrencySnapshot, t.ChecklistGeneratedAt, t.ChecklistRulesVersion,
                t.AnniversaryEnabled, t.CreatedAt, t.UpdatedAt, t.DeletedAt, t.Version)).ToList(),
            stops.Select(s => new TripStopDto(s.Id, s.TripId, s.Order, s.CountryCode, s.CityName, s.Lat, s.Lng, s.GeoProviderId,
                s.Nights, s.CreatedAt, s.UpdatedAt, s.DeletedAt, s.Version)).ToList(),
            flights.Select(f => new FlightDto(f.Id, f.TripId, f.Order, f.Direction, f.Airline, f.FlightNumber, f.DepartureAirport,
                f.ArrivalAirport, f.DepartureLocalTime, f.ArrivalLocalTime, f.DepartureTimeZone, f.ArrivalTimeZone, f.BookingCode,
                f.Seat, f.Terminal, f.CreatedAt, f.UpdatedAt, f.DeletedAt, f.Version)).ToList());
    }

    public Task<bool> OwnsTripAsync(Guid userId, Guid tripId, CancellationToken cancellationToken) =>
        db.Set<Trip>().AnyAsync(t => t.Id == tripId && t.OwnerId == userId && t.DeletedAt == null, cancellationToken);

    public Task<int> CountStopsAsync(Guid tripId, CancellationToken cancellationToken) =>
        db.Set<TripStop>().CountAsync(s => s.TripId == tripId && s.DeletedAt == null, cancellationToken);

    private static void CheckTimeZone(Problems problems, string field, string? zone)
    {
        if (zone is null) return;
        if (!TimeZoneInfo.TryFindSystemTimeZoneById(zone, out _))
            problems.Add(field, string.Create(CultureInfo.InvariantCulture, $"Unknown time zone \"{zone}\"."));
    }

    [GeneratedRegex("^[A-Z]{2}$")]
    private static partial Regex CountryCode();

    [GeneratedRegex("^[A-Z]{3}$")]
    private static partial Regex CurrencyCode();

    /// <summary>Collects problems per field.</summary>
    private sealed class Problems
    {
        private readonly Dictionary<string, List<string>> _items = [];

        public IReadOnlyDictionary<string, string[]> Result => _items.ToDictionary(p => p.Key, p => p.Value.ToArray());

        public void Add(string field, string message)
        {
            if (!_items.TryGetValue(field, out var list)) _items[field] = list = [];
            list.Add(message);
        }

        public void MaxLength(string field, string? value, int max)
        {
            if (value is not null && value.Length > max) Add(field, $"Up to {max} characters.");
        }
    }
}
