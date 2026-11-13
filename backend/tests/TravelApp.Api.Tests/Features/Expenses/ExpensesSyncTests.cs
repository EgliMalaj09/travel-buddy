using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TravelApp.Api.Features.Expenses;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Expenses;

/// <summary>Expenses (KAN-43) written through POST /sync/upload and read back with GET /expenses?tripId=.</summary>
public sealed class ExpensesSyncTests(ApiFactory factory)
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

        public async Task<HttpResponseMessage> GetExpenses(Guid tripId)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"/expenses?tripId={tripId}", UriKind.Relative));
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return await _client.Http.SendAsync(request, Ct);
        }

        public async Task<IReadOnlyList<ExpenseDto>> Expenses(Guid tripId) =>
            (await AuthTestClient.Read<TripExpensesResponse>(await GetExpenses(tripId))).Expenses;

        public async Task<Guid> NewTrip()
        {
            var tripId = Guid.CreateVersion7();
            AllOk(await Upload(
                new
                {
                    op = "PUT", type = "trips", id = tripId,
                    data = new Dictionary<string, object?>
                    {
                        ["name"] = "Marrakech", ["type"] = "solo", ["start_date"] = "2027-04-12", ["end_date"] = "2027-04-19",
                        ["activities"] = "[]", ["status"] = "planned", ["passport_country_snapshot"] = "AL",
                        ["home_currency_snapshot"] = "ALL", ["anniversary_enabled"] = 1,
                    },
                },
                new
                {
                    op = "PUT", type = "trip_stops", id = Guid.CreateVersion7(),
                    data = new Dictionary<string, object?>
                    {
                        ["trip_id"] = tripId.ToString(), ["order"] = 0, ["country_code"] = "MA", ["city_name"] = "Marrakech", ["nights"] = 7,
                    },
                }));
            return tripId;
        }

        public void Dispose() => _client.Dispose();
    }

    private static object ExpensePut(Guid id, Guid tripId, Dictionary<string, object?>? extra = null)
    {
        var data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId.ToString(),
            ["scope"] = "shared",
            ["title"] = "Dinner",
            ["category"] = "food",
            ["amount_minor"] = 20000,
            ["currency"] = "MAD",
            ["spent_at"] = "2027-04-13T19:30:00.000Z",
            ["fx_rate_date"] = "2027-04-13",
            ["place_id"] = null,
            ["note"] = null,
            // Server-only: ignored.
            ["created_by_user_id"] = Guid.NewGuid().ToString(),
            ["paid_by_user_id"] = Guid.NewGuid().ToString(),
            ["owner_user_id"] = null,
            ["version"] = 99,
        };
        foreach (var (k, v) in extra ?? []) data[k] = v;
        return new { op = "PUT", type = "expenses", id, data };
    }

    private static object Patch(Guid id, Dictionary<string, object?> data) => new { op = "PATCH", type = "expenses", id, data };

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    private static IReadOnlyDictionary<string, string[]> Rejected(IReadOnlyList<SyncChangeResult> results)
    {
        var result = Assert.Single(results);
        Assert.Equal(SyncLimits.Rejected, result.Status);
        return result.Problems!;
    }

    [Fact]
    public async Task An_expense_is_saved_and_listed_newest_first_with_server_columns_set_by_the_server()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var dinner = Guid.CreateVersion7();
        var taxi = Guid.CreateVersion7();

        AllOk(await phone.Upload(
            ExpensePut(dinner, tripId),
            ExpensePut(taxi, tripId, new() { ["title"] = "Taxi", ["category"] = "transport", ["spent_at"] = "2027-04-14T08:00:00Z", ["fx_rate_date"] = "2027-04-14" })));

        var list = await phone.Expenses(tripId);
        Assert.Equal([taxi, dinner], list.Select(e => e.Id));
        var saved = list[1];
        Assert.Equal(20000, saved.AmountMinor);
        Assert.Equal("MAD", saved.Currency);
        Assert.Equal(new DateOnly(2027, 4, 13), saved.FxRateDate);
        Assert.Equal(saved.CreatedByUserId, saved.PaidByUserId);
        Assert.NotEqual(Guid.Empty, saved.CreatedByUserId);
        Assert.Null(saved.OwnerUserId);
        Assert.Equal(1, saved.Version);
    }

    [Fact]
    public async Task Large_amounts_fit_and_a_patch_changes_only_the_sent_columns()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        // 50 000 000 IDR in minor units is more than a 32-bit number holds.
        AllOk(await phone.Upload(ExpensePut(id, tripId, new() { ["currency"] = "IDR", ["amount_minor"] = 5_000_000_000L })));
        AllOk(await phone.Upload(Patch(id, new() { ["note"] = "  with dessert ", ["title"] = "Dinner out" })));

        var saved = Assert.Single(await phone.Expenses(tripId));
        Assert.Equal(5_000_000_000L, saved.AmountMinor);
        Assert.Equal("IDR", saved.Currency);
        Assert.Equal("with dessert", saved.Note);
        Assert.Equal("Dinner out", saved.Title);
        Assert.Equal(2, saved.Version);
    }

    [Fact]
    public async Task Rules_from_the_data_model_are_checked()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        Task<IReadOnlyList<SyncChangeResult>> Put(Dictionary<string, object?> extra) => phone.Upload(ExpensePut(Guid.CreateVersion7(), tripId, extra));

        Assert.Contains("amount_minor", Rejected(await Put(new() { ["amount_minor"] = 0 })).Keys);
        Assert.Contains("amount_minor", Rejected(await Put(new() { ["amount_minor"] = -5 })).Keys);
        Assert.Contains("amount_minor", Rejected(await Put(new() { ["amount_minor"] = 12.5 })).Keys);
        Assert.Contains("amount_minor", Rejected(await Put(new() { ["amount_minor"] = ExpenseValues.AmountMinorMax + 1 })).Keys);
        Assert.Contains("currency", Rejected(await Put(new() { ["currency"] = "mad" })).Keys);
        Assert.Contains("category", Rejected(await Put(new() { ["category"] = "fun" })).Keys);
        Assert.Contains("scope", Rejected(await Put(new() { ["scope"] = "public" })).Keys);
        Assert.Contains("title", Rejected(await Put(new() { ["title"] = "  " })).Keys);
        Assert.Contains("title", Rejected(await Put(new() { ["title"] = new string('a', ExpenseValues.TitleMax + 1) })).Keys);
        Assert.Contains("note", Rejected(await Put(new() { ["note"] = new string('a', ExpenseValues.NoteMax + 1) })).Keys);
        Assert.Contains("fx_rate_date", Rejected(await Put(new() { ["fx_rate_date"] = "2027-04-20" })).Keys);
        Assert.Contains("place_id", Rejected(await Put(new() { ["place_id"] = Guid.NewGuid().ToString() })).Keys);
        Assert.Contains("colour", Rejected(await Put(new() { ["colour"] = "red" })).Keys);

        var missing = new { op = "PUT", type = "expenses", id = Guid.CreateVersion7(), data = new Dictionary<string, object?> { ["trip_id"] = tripId.ToString() } };
        var problems = Rejected(await phone.Upload(missing));
        Assert.Contains("amount_minor", problems.Keys);
        Assert.Contains("currency", problems.Keys);
        Assert.Contains("spent_at", problems.Keys);

        // A local date one day off the UTC day is fine (time zones).
        AllOk(await Put(new() { ["spent_at"] = "2027-04-13T23:30:00Z", ["fx_rate_date"] = "2027-04-14" }));
        Assert.Single(await phone.Expenses(tripId));
    }

    [Fact]
    public async Task An_expense_cannot_move_to_another_trip()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var otherTrip = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(ExpensePut(id, tripId)));
        Assert.Contains("trip_id", Rejected(await phone.Upload(Patch(id, new() { ["trip_id"] = otherTrip.ToString() }))).Keys);
    }

    [Fact]
    public async Task A_personal_expense_gets_its_owner_from_the_server()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(ExpensePut(id, tripId, new() { ["scope"] = "personal", ["owner_user_id"] = Guid.NewGuid().ToString() })));
        var saved = Assert.Single(await phone.Expenses(tripId));
        Assert.Equal(saved.CreatedByUserId, saved.OwnerUserId);

        AllOk(await phone.Upload(Patch(id, new() { ["scope"] = "shared" })));
        Assert.Null(Assert.Single(await phone.Expenses(tripId)).OwnerUserId);
    }

    [Fact]
    public async Task Someone_else_cannot_see_or_change_your_expenses()
    {
        using var phone = await Phone.SignedInAsync(factory);
        using var stranger = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(ExpensePut(id, tripId)));

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetExpenses(tripId)).StatusCode);
        Assert.Contains("trip_id", Rejected(await stranger.Upload(ExpensePut(Guid.CreateVersion7(), tripId))).Keys);
        Assert.Contains("id", Rejected(await stranger.Upload(Patch(id, new() { ["amount_minor"] = 1 }))).Keys);
        Assert.Contains("id", Rejected(await stranger.Upload(new { op = "DELETE", type = "expenses", id })).Keys);
        Assert.Equal(20000, Assert.Single(await phone.Expenses(tripId)).AmountMinor);
    }

    [Fact]
    public async Task Deleting_an_expense_or_its_trip_removes_it()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var gone = Guid.CreateVersion7();
        var kept = Guid.CreateVersion7();
        AllOk(await phone.Upload(ExpensePut(gone, tripId), ExpensePut(kept, tripId)));

        AllOk(await phone.Upload(new { op = "DELETE", type = "expenses", id = gone }));
        Assert.Equal([kept], (await phone.Expenses(tripId)).Select(e => e.Id));
        Assert.Contains("id", Rejected(await phone.Upload(Patch(gone, new() { ["title"] = "Back" }))).Keys);

        AllOk(await phone.Upload(new { op = "DELETE", type = "trips", id = tripId }));
        Assert.Equal(HttpStatusCode.NotFound, (await phone.GetExpenses(tripId)).StatusCode);
        // The phone may still send the delete of an expense of the deleted trip: that is fine.
        AllOk(await phone.Upload(new { op = "DELETE", type = "expenses", id = kept }));
    }
}
