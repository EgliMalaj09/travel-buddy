using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Sync;

/// <summary>POST /sync/upload with trips, stops and flights, and reading them back with GET /trips.</summary>
public sealed class SyncUploadTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class Phone(ApiFactory factory) : IDisposable
    {
        private readonly AuthTestClient _client = new(factory);
        private string _token = "";

        public static async Task<Phone> SignedInAsync(ApiFactory factory)
        {
            var phone = new Phone(factory);
            var session = await phone._client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());
            phone._token = session.AccessToken;
            return phone;
        }

        public async Task<HttpResponseMessage> PostUpload(object body)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/sync/upload", UriKind.Relative)) { Content = JsonContent.Create(body) };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return await _client.Http.SendAsync(request, Ct);
        }

        public async Task<IReadOnlyList<SyncChangeResult>> Upload(params object[] changes) =>
            (await AuthTestClient.Read<SyncUploadResponse>(await PostUpload(new { changes }))).Results;

        public async Task<MyTripsResponse> Trips(string query = "") =>
            await AuthTestClient.Read<MyTripsResponse>(await GetTrips(query));

        public async Task<HttpResponseMessage> GetTrips(string query)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/trips" + query, UriKind.Relative));
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return await _client.Http.SendAsync(request, Ct);
        }

        public void Dispose() => _client.Dispose();
    }

    private static object TripPut(Guid id, string name = "Rome & Florence") => new
    {
        op = "PUT",
        type = "trips",
        id,
        data = new Dictionary<string, object?>
        {
            ["name"] = name,
            ["type"] = "solo",
            ["start_date"] = "2027-04-12",
            ["end_date"] = "2027-04-19",
            // As SQLite keeps a list: JSON written as text.
            ["activities"] = "[\"city\",\"food\"]",
            ["status"] = "planned",
            ["passport_country_snapshot"] = "AL",
            ["home_currency_snapshot"] = "EUR",
            ["anniversary_enabled"] = 1,
            // Server-only: ignored.
            ["owner_id"] = Guid.NewGuid().ToString(),
            ["version"] = 99,
        },
    };

    private static object StopPut(Guid id, Guid tripId, int order, string city, int nights = 2) => new
    {
        op = "PUT",
        type = "trip_stops",
        id,
        data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId.ToString(),
            ["order"] = order,
            ["country_code"] = "IT",
            ["city_name"] = city,
            ["lat"] = 41.9,
            ["lng"] = 12.5,
            ["nights"] = nights,
        },
    };

    private static object FlightPut(Guid id, Guid tripId) => new
    {
        op = "PUT",
        type = "flights",
        id,
        data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId.ToString(),
            ["order"] = 0,
            ["direction"] = "outbound",
            ["flight_number"] = "W6 4567",
            ["departure_local_time"] = "2027-04-12T09:40",
            ["departure_time_zone"] = "Europe/Tirane",
        },
    };

    private static object Patch(string type, Guid id, Dictionary<string, object?> data) => new { op = "PATCH", type, id, data };

    private static object Delete(string type, Guid id) => new { op = "DELETE", type, id };

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    [Fact]
    public async Task A_new_trip_with_stops_and_a_flight_is_saved_and_listed()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();
        var rome = Guid.CreateVersion7();
        var florence = Guid.CreateVersion7();
        var flight = Guid.CreateVersion7();

        AllOk(await phone.Upload(TripPut(tripId), StopPut(rome, tripId, 0, "Rome", 4), StopPut(florence, tripId, 1, "Florence", 3), FlightPut(flight, tripId)));

        var mine = await phone.Trips();
        var trip = Assert.Single(mine.Trips);
        Assert.Equal(tripId, trip.Id);
        Assert.Equal("Rome & Florence", trip.Name);
        Assert.NotEqual(Guid.Empty, trip.OwnerId);
        Assert.Equal(["city", "food"], trip.Activities);
        Assert.Equal(new DateOnly(2027, 4, 12), trip.StartDate);
        Assert.Equal(1, trip.Version);
        Assert.True(trip.AnniversaryEnabled);
        Assert.Equal(["Rome", "Florence"], mine.Stops.Select(s => s.CityName));
        var savedFlight = Assert.Single(mine.Flights);
        Assert.Equal(new DateTime(2027, 4, 12, 9, 40, 0), savedFlight.DepartureLocalTime);
    }

    [Fact]
    public async Task A_patch_changes_only_the_columns_sent()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();
        AllOk(await phone.Upload(TripPut(tripId), StopPut(Guid.CreateVersion7(), tripId, 0, "Rome")));

        AllOk(await phone.Upload(Patch("trips", tripId, new() { ["name"] = "  Rome again  ", ["start_date"] = null, ["end_date"] = null })));

        var trip = Assert.Single((await phone.Trips()).Trips);
        Assert.Equal("Rome again", trip.Name);
        Assert.Null(trip.StartDate);
        Assert.Equal(["city", "food"], trip.Activities);
        Assert.Equal(2, trip.Version);
    }

    [Fact]
    public async Task Broken_changes_are_rejected_and_the_others_still_saved()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();

        var results = await phone.Upload(
            TripPut(tripId),
            StopPut(Guid.CreateVersion7(), tripId, 0, "Rome"),
            Patch("trips", tripId, new() { ["end_date"] = "2027-01-01" }),
            Patch("trips", tripId, new() { ["name"] = 5 }),
            Patch("trips", tripId, new() { ["colour"] = "red" }),
            Patch("trips", Guid.CreateVersion7(), new() { ["name"] = "Nowhere" }),
            new { op = "PUT", type = "photos", id = Guid.CreateVersion7(), data = new { a = 1 } });

        Assert.Equal([SyncLimits.Ok, SyncLimits.Ok, SyncLimits.Rejected, SyncLimits.Rejected, SyncLimits.Rejected, SyncLimits.Rejected, SyncLimits.Rejected],
            results.Select(r => r.Status));
        Assert.Contains("end_date", results[2].Problems!.Keys);
        Assert.Contains("name", results[3].Problems!.Keys);
        Assert.Contains("colour", results[4].Problems!.Keys);
        Assert.Contains("id", results[5].Problems!.Keys);
        Assert.Contains("type", results[6].Problems!.Keys);
        Assert.Equal(new DateOnly(2027, 4, 19), Assert.Single((await phone.Trips()).Trips).EndDate);
    }

    [Fact]
    public async Task Nobody_can_see_or_change_another_users_trip()
    {
        using var ana = await Phone.SignedInAsync(factory);
        using var ben = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();
        var stopId = Guid.CreateVersion7();
        AllOk(await ana.Upload(TripPut(tripId), StopPut(stopId, tripId, 0, "Rome")));

        var results = await ben.Upload(
            TripPut(tripId, "Taken"),
            Patch("trips", tripId, new() { ["name"] = "Taken" }),
            StopPut(Guid.CreateVersion7(), tripId, 1, "Milan"),
            Patch("trip_stops", stopId, new() { ["nights"] = 9 }),
            Delete("trips", tripId));

        Assert.All(results, r => Assert.Equal(SyncLimits.Rejected, r.Status));
        Assert.Empty((await ben.Trips()).Trips);
        var mine = await ana.Trips();
        Assert.Equal("Rome & Florence", Assert.Single(mine.Trips).Name);
        Assert.Equal(2, Assert.Single(mine.Stops).Nights);
    }

    [Fact]
    public async Task The_last_stop_cannot_be_removed_but_can_be_replaced()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();
        var rome = Guid.CreateVersion7();
        AllOk(await phone.Upload(TripPut(tripId), StopPut(rome, tripId, 0, "Rome")));

        var alone = await phone.Upload(Delete("trip_stops", rome));
        Assert.Equal(SyncLimits.Rejected, Assert.Single(alone).Status);

        AllOk(await phone.Upload(StopPut(Guid.CreateVersion7(), tripId, 0, "Milan"), Delete("trip_stops", rome)));
        Assert.Equal("Milan", Assert.Single((await phone.Trips()).Stops).CityName);
    }

    [Fact]
    public async Task Deleting_a_trip_removes_its_stops_and_flights_and_repeating_it_is_fine()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = Guid.CreateVersion7();
        var stopId = Guid.CreateVersion7();
        AllOk(await phone.Upload(TripPut(tripId), StopPut(stopId, tripId, 0, "Rome"), FlightPut(Guid.CreateVersion7(), tripId)));

        // The phone also sends deletes for the children, after the trip: all fine.
        AllOk(await phone.Upload(Delete("trips", tripId), Delete("trip_stops", stopId), Delete("trips", tripId)));

        var mine = await phone.Trips();
        Assert.Empty(mine.Trips);
        Assert.Empty(mine.Stops);
        Assert.Empty(mine.Flights);

        var revive = await phone.Upload(Patch("trips", tripId, new() { ["name"] = "Back" }));
        Assert.Equal(SyncLimits.Rejected, Assert.Single(revive).Status);
    }

    [Fact]
    public async Task Upload_needs_a_token_and_valid_input()
    {
        using var client = new AuthTestClient(factory);
        var anonymous = await client.Post("/sync/upload", new { changes = new[] { Delete("trips", Guid.CreateVersion7()) } });
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        using var phone = await Phone.SignedInAsync(factory);
        var empty = await phone.PostUpload(new { changes = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        var badOp = await phone.PostUpload(new { changes = new[] { new { op = "MERGE", type = "trips", id = Guid.CreateVersion7() } } });
        Assert.Equal(HttpStatusCode.BadRequest, badOp.StatusCode);
    }

    [Fact]
    public async Task Trips_come_in_pages_in_order_with_their_own_stops()
    {
        using var phone = await Phone.SignedInAsync(factory);
        // Same first day twice (order then by creation), and two Someday trips that come last.
        string?[] starts = ["2027-06-01", "2027-01-10", null, "2027-03-05", "2027-03-05", null, "2026-12-24"];
        var ids = new List<Guid>();
        foreach (var start in starts)
        {
            var id = Guid.NewGuid();
            ids.Add(id);
            var trip = new Dictionary<string, object?>
            {
                ["name"] = $"Trip {ids.Count}",
                ["type"] = "solo",
                ["start_date"] = start,
                ["end_date"] = start,
                ["activities"] = "[]",
                ["status"] = "planned",
                ["passport_country_snapshot"] = "AL",
                ["home_currency_snapshot"] = "EUR",
            };
            var results = await phone.Upload(new { op = "PUT", type = "trips", id, data = trip },
                StopPut(Guid.NewGuid(), id, 0, $"City {ids.Count}"));
            Assert.All(results, r => Assert.Equal("ok", r.Status));
        }

        var seen = new List<MyTripsResponse>();
        string? cursor = null;
        do
        {
            var page = await phone.Trips(cursor is null ? "?limit=3" : $"?limit=3&after={cursor}");
            seen.Add(page);
            cursor = page.NextCursor;
        }
        while (cursor is not null);

        var all = await phone.Trips();
        Assert.Equal([3, 3, 1], seen.Select(p => p.Trips.Count));
        Assert.Null(all.NextCursor);
        Assert.Equal(all.Trips.Select(t => t.Id), seen.SelectMany(p => p.Trips).Select(t => t.Id));
        Assert.Equal(
            ["2026-12-24", "2027-01-10", "2027-03-05", "2027-03-05", "2027-06-01", null, null],
            all.Trips.Select(t => t.StartDate?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)));
        Assert.Equal(ids.ToHashSet(), all.Trips.Select(t => t.Id).ToHashSet());
        Assert.All(seen, p => Assert.Equal(p.Trips.Select(t => t.Id).ToHashSet(), p.Stops.Select(s => s.TripId).ToHashSet()));
    }

    [Theory]
    [InlineData("?limit=0", "limit")]
    [InlineData("?limit=101", "limit")]
    [InlineData("?after=not-a-cursor", "after")]
    public async Task Bad_paging_values_are_refused(string query, string field)
    {
        using var phone = await Phone.SignedInAsync(factory);

        var response = await phone.GetTrips(query);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(field, await response.Content.ReadAsStringAsync(Ct), StringComparison.Ordinal);
    }
}
