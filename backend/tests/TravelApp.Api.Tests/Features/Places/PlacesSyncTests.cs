using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TravelApp.Api.Features.Places;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Places;

/// <summary>Places (KAN-35) written through POST /sync/upload and read back with GET /places?tripId=.</summary>
public sealed class PlacesSyncTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class Phone(ApiFactory factory) : IDisposable
    {
        private readonly AuthTestClient _client = new(factory);
        private string _token = "";

        public static async Task<Phone> SignedInAsync(ApiFactory factory)
        {
            var phone = new Phone(factory);
            phone._token = (await phone._client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice())).AccessToken;
            return phone;
        }

        public async Task<IReadOnlyList<SyncChangeResult>> Upload(params object[] changes)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/sync/upload", UriKind.Relative)) { Content = JsonContent.Create(new { changes }) };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return (await AuthTestClient.Read<SyncUploadResponse>(await _client.Http.SendAsync(request, Ct))).Results;
        }

        public async Task<HttpResponseMessage> GetPlaces(Guid tripId)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"/places?tripId={tripId}", UriKind.Relative));
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return await _client.Http.SendAsync(request, Ct);
        }

        public async Task<IReadOnlyList<PlaceDto>> Places(Guid tripId) =>
            (await AuthTestClient.Read<TripPlacesResponse>(await GetPlaces(tripId))).Places;

        /// <summary>A trip of 7 days with one stop.</summary>
        public async Task<Guid> NewTrip()
        {
            var tripId = Guid.CreateVersion7();
            AllOk(await Upload(
                new
                {
                    op = "PUT", type = "trips", id = tripId,
                    data = new Dictionary<string, object?>
                    {
                        ["name"] = "Rome", ["type"] = "solo", ["start_date"] = "2027-04-12", ["end_date"] = "2027-04-19",
                        ["activities"] = "[]", ["status"] = "planned", ["passport_country_snapshot"] = "AL",
                        ["home_currency_snapshot"] = "EUR", ["anniversary_enabled"] = 1,
                    },
                },
                new
                {
                    op = "PUT", type = "trip_stops", id = Guid.CreateVersion7(),
                    data = new Dictionary<string, object?>
                    {
                        ["trip_id"] = tripId.ToString(), ["order"] = 0, ["country_code"] = "IT", ["city_name"] = "Rome", ["nights"] = 7,
                    },
                }));
            return tripId;
        }

        public void Dispose() => _client.Dispose();
    }

    private static object PlacePut(Guid id, Guid? tripId, string title = "Colosseum", Dictionary<string, object?>? extra = null)
    {
        var data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId?.ToString(),
            ["scope"] = "shared",
            ["status"] = "planned",
            ["title"] = title,
            ["country_code"] = "IT",
            ["city_name"] = "Rome",
            ["lat"] = 41.9,
            ["lng"] = 12.5,
            ["category"] = "sight",
            ["planned_date"] = "2027-04-13",
            ["source"] = "manual",
            // As SQLite keeps a boolean.
            ["is_suggested"] = 0,
            // Server-only: ignored.
            ["created_by_user_id"] = Guid.NewGuid().ToString(),
            ["version"] = 99,
        };
        foreach (var (k, v) in extra ?? []) data[k] = v;
        return new { op = "PUT", type = "places", id, data };
    }

    private static object Patch(Guid id, Dictionary<string, object?> data) => new { op = "PATCH", type = "places", id, data };

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    private static IReadOnlyDictionary<string, string[]> Rejected(IReadOnlyList<SyncChangeResult> results)
    {
        var result = Assert.Single(results);
        Assert.Equal(SyncLimits.Rejected, result.Status);
        return result.Problems!;
    }

    [Fact]
    public async Task A_planned_place_is_saved_and_listed_by_day_with_any_day_last()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var anyDay = Guid.CreateVersion7();
        var day2 = Guid.CreateVersion7();
        var day1 = Guid.CreateVersion7();

        AllOk(await phone.Upload(
            PlacePut(anyDay, tripId, "Gelato", new() { ["planned_date"] = null, ["category"] = "food", ["lat"] = null, ["lng"] = null }),
            PlacePut(day2, tripId, "Vatican", new() { ["planned_date"] = "2027-04-14" }),
            PlacePut(day1, tripId, "Colosseum")));

        var places = await phone.Places(tripId);
        Assert.Equal(["Colosseum", "Vatican", "Gelato"], places.Select(p => p.Title));
        var colosseum = places[0];
        Assert.Equal(new DateOnly(2027, 4, 13), colosseum.PlannedDate);
        Assert.Equal("sight", colosseum.Category);
        Assert.NotEqual(Guid.Empty, colosseum.CreatedByUserId);
        Assert.Null(colosseum.OwnerUserId);
        Assert.False(colosseum.IsSuggested);
        Assert.Equal(1, colosseum.Version);
        Assert.Null(places[2].Lat);
    }

    [Fact]
    public async Task Marking_visited_and_back_changes_only_the_sent_columns()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(PlacePut(id, tripId)));

        AllOk(await phone.Upload(Patch(id, new() { ["status"] = "visited", ["visited_at"] = "2027-04-13T11:00:00+02:00" })));
        var visited = Assert.Single(await phone.Places(tripId));
        Assert.Equal("visited", visited.Status);
        Assert.Equal(new DateTimeOffset(2027, 4, 13, 9, 0, 0, TimeSpan.Zero), visited.VisitedAt);
        Assert.Equal("Colosseum", visited.Title);

        AllOk(await phone.Upload(Patch(id, new() { ["status"] = "planned", ["visited_at"] = null })));
        var planned = Assert.Single(await phone.Places(tripId));
        Assert.Equal("planned", planned.Status);
        Assert.Null(planned.VisitedAt);
        Assert.Equal(3, planned.Version);
    }

    [Fact]
    public async Task Rules_from_the_data_model_are_checked()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();

        Assert.Contains("title", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, " "))).Keys);
        Assert.Contains("title", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, new string('a', 121)))).Keys);
        Assert.Contains("category", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, extra: new() { ["category"] = "bar" }))).Keys);
        Assert.Contains("country_code", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, extra: new() { ["country_code"] = "Italy" }))).Keys);
        Assert.Contains("lat", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, extra: new() { ["lng"] = null }))).Keys);
        Assert.Contains("trip_id", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), null))).Keys);
        Assert.Contains("status", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, extra: new() { ["status"] = "bucket" }))).Keys);
        Assert.Contains("colour", Rejected(await phone.Upload(PlacePut(Guid.CreateVersion7(), tripId, extra: new() { ["colour"] = "red" }))).Keys);

        // A place stays with its trip.
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(PlacePut(id, tripId)));
        var otherTrip = await phone.NewTrip();
        Assert.Contains("trip_id", Rejected(await phone.Upload(Patch(id, new() { ["trip_id"] = otherTrip.ToString() }))).Keys);
        // A visited place can go back to planned, not to the bucket list.
        AllOk(await phone.Upload(Patch(id, new() { ["status"] = "visited" })));
        Assert.Contains("status", Rejected(await phone.Upload(Patch(id, new() { ["status"] = "bucket", ["trip_id"] = null }))).Keys);
    }

    [Fact]
    public async Task A_bucket_list_place_is_personal_and_can_be_added_to_a_trip()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();

        AllOk(await phone.Upload(PlacePut(id, null, extra: new() { ["status"] = "bucket", ["scope"] = "personal", ["planned_date"] = null })));
        AllOk(await phone.Upload(Patch(id, new() { ["trip_id"] = tripId.ToString(), ["status"] = "planned", ["scope"] = "shared" })));

        var place = Assert.Single(await phone.Places(tripId));
        Assert.Equal("planned", place.Status);
        Assert.Null(place.OwnerUserId);
    }

    [Fact]
    public async Task Someone_else_cannot_see_or_change_your_places()
    {
        using var me = await Phone.SignedInAsync(factory);
        using var stranger = await Phone.SignedInAsync(factory);
        var tripId = await me.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await me.Upload(PlacePut(id, tripId)));

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetPlaces(tripId)).StatusCode);
        Assert.Contains("id", Rejected(await stranger.Upload(Patch(id, new() { ["title"] = "Mine now" }))).Keys);
        Assert.Contains("trip_id", Rejected(await stranger.Upload(PlacePut(Guid.CreateVersion7(), tripId))).Keys);
        Assert.Contains("id", Rejected(await stranger.Upload(new { op = "DELETE", type = "places", id })).Keys);
        Assert.Equal("Colosseum", Assert.Single(await me.Places(tripId)).Title);
    }

    [Fact]
    public async Task Deleting_a_place_or_its_trip_removes_it()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var gone = Guid.CreateVersion7();
        var kept = Guid.CreateVersion7();
        AllOk(await phone.Upload(PlacePut(gone, tripId), PlacePut(kept, tripId, "Pantheon")));

        AllOk(await phone.Upload(new { op = "DELETE", type = "places", id = gone }));
        Assert.Equal("Pantheon", Assert.Single(await phone.Places(tripId)).Title);
        Assert.Contains("id", Rejected(await phone.Upload(Patch(gone, new() { ["title"] = "Back" }))).Keys);

        AllOk(await phone.Upload(new { op = "DELETE", type = "trips", id = tripId }));
        Assert.Equal(HttpStatusCode.NotFound, (await phone.GetPlaces(tripId)).StatusCode);
        // The phone may still send the place's own delete after the trip's: that is fine.
        AllOk(await phone.Upload(new { op = "DELETE", type = "places", id = kept }));
    }
}
