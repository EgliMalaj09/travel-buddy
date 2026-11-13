using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Checklist;

/// <summary>Checklist items written through POST /sync/upload (KAN-25), checked in the real database.</summary>
public sealed class ChecklistSyncTests(ApiFactory factory)
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

        /// <summary>A trip with one stop, ready for checklist items.</summary>
        public async Task<Guid> NewTripAsync()
        {
            var tripId = Guid.CreateVersion7();
            AllOk(await Upload(
                new
                {
                    op = "PUT",
                    type = "trips",
                    id = tripId,
                    data = new Dictionary<string, object?>
                    {
                        ["name"] = "Rome",
                        ["type"] = "solo",
                        ["start_date"] = "2027-04-12",
                        ["end_date"] = "2027-04-19",
                        ["activities"] = "[]",
                        ["status"] = "planned",
                        ["passport_country_snapshot"] = "AL",
                        ["home_currency_snapshot"] = "EUR",
                        ["anniversary_enabled"] = 1,
                    },
                },
                new
                {
                    op = "PUT",
                    type = "trip_stops",
                    id = Guid.CreateVersion7(),
                    data = new Dictionary<string, object?> { ["trip_id"] = tripId.ToString(), ["order"] = 0, ["country_code"] = "IT", ["city_name"] = "Rome", ["nights"] = 7 },
                }));
            return tripId;
        }

        public void Dispose() => _client.Dispose();
    }

    private static object ItemPut(Guid id, Guid tripId, Dictionary<string, object?>? extra = null)
    {
        var data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId.ToString(),
            ["type"] = "task",
            ["title"] = "Check your passport",
            ["category"] = "documents",
            ["done"] = 0,
            ["due_date"] = "2027-03-13",
            ["reason"] = "rule",
            ["source"] = "auto",
            ["rule_id"] = "passport-valid",
            ["source_url"] = "https://travel-europe.europa.eu/",
            ["sort_order"] = 10,
            // Server-only: ignored.
            ["version"] = 7,
            ["done_by_user_id"] = Guid.NewGuid().ToString(),
        };
        foreach (var (k, v) in extra ?? []) data[k] = v;
        return new { op = "PUT", type = "checklist_items", id, data };
    }

    private static object Patch(Guid id, Dictionary<string, object?> data) => new { op = "PATCH", type = "checklist_items", id, data };

    private static object Delete(Guid id) => new { op = "DELETE", type = "checklist_items", id };

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    private async Task<T> InDb<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private Task<Dictionary<string, object?>> Row(Guid id) => InDb(async db =>
    {
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync(Ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT * FROM checklist_items WHERE id = @id";
        var p = cmd.CreateParameter();
        p.ParameterName = "id";
        p.Value = id;
        cmd.Parameters.Add(p);
        await using var reader = await cmd.ExecuteReaderAsync(Ct);
        Assert.True(await reader.ReadAsync(Ct));
        return Enumerable.Range(0, reader.FieldCount).ToDictionary(reader.GetName, i => reader.IsDBNull(i) ? null : reader.GetValue(i));
    });

    [Fact]
    public async Task An_item_is_saved_and_ticking_it_records_who_and_when()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTripAsync();
        var id = Guid.CreateVersion7();

        AllOk(await phone.Upload(ItemPut(id, tripId)));
        var row = await Row(id);
        Assert.Equal("Check your passport", row["title"]);
        Assert.Equal(false, row["done"]);
        Assert.Null(row["done_by_user_id"]);
        Assert.Equal(1L, row["version"]);

        AllOk(await phone.Upload(Patch(id, new() { ["done"] = true, ["done_at"] = "2027-03-01T10:00:00+01:00" })));
        row = await Row(id);
        Assert.Equal(true, row["done"]);
        Assert.NotNull(row["done_by_user_id"]);
        Assert.Equal(new DateTimeOffset(2027, 3, 1, 9, 0, 0, TimeSpan.Zero), new DateTimeOffset((DateTime)row["done_at"]!, TimeSpan.Zero));

        AllOk(await phone.Upload(Patch(id, new() { ["done"] = false })));
        row = await Row(id);
        Assert.Null(row["done_by_user_id"]);
        Assert.Null(row["done_at"]);
    }

    [Fact]
    public async Task The_same_auto_item_from_two_phones_is_one_row()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTripAsync();
        var id = Guid.CreateVersion7();

        AllOk(await phone.Upload(ItemPut(id, tripId)));
        AllOk(await phone.Upload(ItemPut(id, tripId, new() { ["sort_order"] = 11 })));

        Assert.Equal(1, await InDb(db => db.Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM checklist_items WHERE trip_id = {tripId}").SingleAsync(Ct)));
        Assert.Equal(11, (await Row(id))["sort_order"]);
    }

    [Fact]
    public async Task A_deleted_item_stays_deleted()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTripAsync();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(ItemPut(id, tripId)));

        AllOk(await phone.Upload(Delete(id)));
        Assert.NotNull((await Row(id))["deleted_at"]);

        var again = Assert.Single(await phone.Upload(ItemPut(id, tripId)));
        Assert.Equal(SyncLimits.Rejected, again.Status);
        Assert.Contains("id", again.Problems!.Keys);
    }

    [Fact]
    public async Task Broken_items_are_rejected()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTripAsync();

        var results = await phone.Upload(
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["title"] = "  " }),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["category"] = "clothes" }),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["quantity"] = 2 }),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["rule_id"] = null }),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["source_url"] = "http://example.com" }),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["colour"] = "red" }),
            ItemPut(Guid.CreateVersion7(), Guid.CreateVersion7()),
            ItemPut(Guid.CreateVersion7(), tripId, new() { ["type"] = "packing", ["category"] = "clothes", ["quantity"] = 3, ["source"] = "user", ["reason"] = "user", ["rule_id"] = null, ["source_url"] = null }));

        Assert.Equal(["title", "category", "quantity", "rule_id", "source_url", "colour", "trip_id"],
            results.Take(7).Select(r => Assert.Single(r.Problems!.Keys)));
        Assert.Equal(SyncLimits.Ok, results[7].Status);
    }

    [Fact]
    public async Task Nobody_can_change_another_users_checklist()
    {
        using var ana = await Phone.SignedInAsync(factory);
        using var ben = await Phone.SignedInAsync(factory);
        var tripId = await ana.NewTripAsync();
        var id = Guid.CreateVersion7();
        AllOk(await ana.Upload(ItemPut(id, tripId)));

        var results = await ben.Upload(
            Patch(id, new() { ["done"] = true }),
            Delete(id),
            ItemPut(Guid.CreateVersion7(), tripId));

        Assert.All(results, r => Assert.Equal(SyncLimits.Rejected, r.Status));
        var row = await Row(id);
        Assert.Equal(false, row["done"]);
        Assert.Null(row["deleted_at"]);
    }
}
