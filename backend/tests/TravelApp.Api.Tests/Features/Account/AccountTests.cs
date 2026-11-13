using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Account;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Media;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Account;

/// <summary>Settings on the server, "Download my data", delete with 30 days to restore, and the final erase (KAN-22).</summary>
public sealed class AccountTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class Phone(ApiFactory factory) : IDisposable
    {
        public AuthTestClient Client { get; } = new(factory);

        public string Email { get; } = AuthTestClient.NewEmail();

        public string Device { get; } = AuthTestClient.NewDevice();

        public SessionResponse Session { get; set; } = null!;

        public Guid UserId => Session.User.Id;

        public static async Task<Phone> SignedInAsync(ApiFactory factory)
        {
            var phone = new Phone(factory);
            phone.Session = await phone.Client.SignUp(phone.Email, phone.Device);
            await AuthTestClient.Read<AuthUserResponse>(await phone.Client.SaveProfile(phone.Session.AccessToken,
                new ProfileRequest("Ana", "AL", "AL", "ALL")));
            return phone;
        }

        public async Task<HttpResponseMessage> Send(HttpMethod method, string url, object? body = null)
        {
            using var request = new HttpRequestMessage(method, new Uri(url, UriKind.Relative));
            if (body is not null) request.Content = JsonContent.Create(body);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Session.AccessToken);
            return await Client.Http.SendAsync(request, Ct);
        }

        public async Task<IReadOnlyList<SyncChangeResult>> Upload(params object[] changes) =>
            (await AuthTestClient.Read<SyncUploadResponse>(await Send(HttpMethod.Post, "/sync/upload", new { changes }))).Results;

        public void Dispose() => Client.Dispose();
    }

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    private static IReadOnlyDictionary<string, string[]> Rejected(IReadOnlyList<SyncChangeResult> results)
    {
        var result = Assert.Single(results);
        Assert.Equal(SyncLimits.Rejected, result.Status);
        return result.Problems!;
    }

    private static object SettingsPut(Guid id, Dictionary<string, object?>? extra = null)
    {
        var data = new Dictionary<string, object?>
        {
            ["reminders_enabled"] = 1, ["remind_checklist"] = 1, ["remind_pack_tonight"] = 0, ["remind_flight"] = 1,
            ["remind_anniversary"] = 1, ["reminder_time"] = "20:30", ["quiet_hours_start"] = "23:00", ["quiet_hours_end"] = "07:00",
            ["distance_unit"] = "mi", ["temperature_unit"] = "F", ["default_place_scope"] = "shared",
            // Server-only: ignored.
            ["version"] = 99,
        };
        foreach (var (k, v) in extra ?? []) data[k] = v;
        return new { op = "PUT", type = "user_settings", id, data };
    }

    /// <summary>A trip with a stop, a place, a checklist item, an expense and a photo with its files.</summary>
    private async Task<(Guid TripId, Guid PhotoId)> FillAsync(Phone phone)
    {
        var tripId = Guid.CreateVersion7();
        var photoId = Guid.CreateVersion7();
        AllOk(await phone.Upload(
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
                data = new Dictionary<string, object?> { ["trip_id"] = tripId.ToString(), ["order"] = 0, ["country_code"] = "IT", ["city_name"] = "Rome", ["nights"] = 7 },
            },
            new
            {
                op = "PUT", type = "places", id = Guid.CreateVersion7(),
                data = new Dictionary<string, object?>
                {
                    ["trip_id"] = tripId.ToString(), ["scope"] = "shared", ["status"] = "planned", ["title"] = "Colosseum",
                    ["country_code"] = "IT", ["city_name"] = "Rome", ["lat"] = 41.9, ["lng"] = 12.5, ["category"] = "sight",
                    ["planned_date"] = "2027-04-13", ["source"] = "manual", ["is_suggested"] = 0,
                },
            },
            new
            {
                op = "PUT", type = "places", id = Guid.CreateVersion7(),
                data = new Dictionary<string, object?>
                {
                    ["trip_id"] = null, ["scope"] = "personal", ["status"] = "bucket", ["title"] = "Kyoto",
                    ["country_code"] = "JP", ["category"] = "sight", ["source"] = "manual", ["is_suggested"] = 0,
                },
            },
            new
            {
                op = "PUT", type = "checklist_items", id = Guid.CreateVersion7(),
                data = new Dictionary<string, object?>
                {
                    ["trip_id"] = tripId.ToString(), ["type"] = "task", ["title"] = "Check your passport", ["category"] = "documents",
                    ["done"] = 0, ["reason"] = "user", ["source"] = "user", ["sort_order"] = 1,
                },
            },
            new
            {
                op = "PUT", type = "expenses", id = Guid.CreateVersion7(),
                data = new Dictionary<string, object?>
                {
                    ["trip_id"] = tripId.ToString(), ["scope"] = "shared", ["title"] = "Dinner", ["category"] = "food",
                    ["amount_minor"] = 2000, ["currency"] = "EUR", ["spent_at"] = "2027-04-13T19:30:00.000Z", ["fx_rate_date"] = "2027-04-13",
                },
            },
            new
            {
                op = "PUT", type = "media", id = photoId,
                data = new Dictionary<string, object?>
                {
                    ["trip_id"] = tripId.ToString(), ["media_type"] = "photo", ["purpose"] = "trip_photo", ["scope"] = "shared",
                    ["source"] = "camera", ["is_suggested"] = 0, ["caption"] = "Sunset", ["taken_at"] = "2027-04-13T18:30:00.000Z",
                    ["width"] = 2048, ["height"] = 1536, ["mime_type"] = "image/jpeg",
                    ["content_hash"] = Convert.ToHexStringLower(Guid.NewGuid().ToByteArray()) + Convert.ToHexStringLower(Guid.NewGuid().ToByteArray()),
                    ["quality_tier"] = "compressed", ["include_in_video"] = 1,
                },
            },
            SettingsPut(phone.UserId)));
        await factory.MediaFiles.PutAsync(MediaValues.FileKey(photoId), new MemoryStream([1, 2, 3]), Ct);
        await factory.MediaFiles.PutAsync(MediaValues.ThumbnailKey(photoId), new MemoryStream([4, 5]), Ct);
        return (tripId, photoId);
    }

    [Fact]
    public async Task Settings_are_saved_on_the_server_only_in_the_users_own_row()
    {
        using var phone = await Phone.SignedInAsync(factory);
        AllOk(await phone.Upload(SettingsPut(phone.UserId)));
        AllOk(await phone.Upload(new { op = "PATCH", type = "user_settings", id = phone.UserId, data = new Dictionary<string, object?> { ["reminder_time"] = "18:00" } }));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Set<UserSettings>().AsNoTracking().SingleAsync(s => s.Id == phone.UserId, Ct);
        Assert.Equal("18:00", row.ReminderTime);
        Assert.Equal("23:00", row.QuietHoursStart);
        Assert.False(row.RemindPackTonight);
        Assert.Equal("mi", row.DistanceUnit);
        Assert.Equal(2, row.Version);

        Assert.Contains("id", Rejected(await phone.Upload(SettingsPut(Guid.CreateVersion7()))).Keys);
        Assert.Contains("id", Rejected(await phone.Upload(new { op = "DELETE", type = "user_settings", id = phone.UserId })).Keys);
        Assert.Contains("reminder_time", Rejected(await phone.Upload(SettingsPut(phone.UserId, new() { ["reminder_time"] = "25:00" }))).Keys);
        Assert.Contains("distance_unit", Rejected(await phone.Upload(SettingsPut(phone.UserId, new() { ["distance_unit"] = "yards" }))).Keys);
        Assert.Contains("remind_flight", Rejected(await phone.Upload(SettingsPut(phone.UserId, new() { ["remind_flight"] = "yes" }))).Keys);
        Assert.Contains("colour", Rejected(await phone.Upload(SettingsPut(phone.UserId, new() { ["colour"] = "red" }))).Keys);
    }

    [Fact]
    public async Task A_patch_before_any_put_makes_the_row_with_defaults()
    {
        using var phone = await Phone.SignedInAsync(factory);
        AllOk(await phone.Upload(new { op = "PATCH", type = "user_settings", id = phone.UserId, data = new Dictionary<string, object?> { ["temperature_unit"] = "F" } }));

        await using var scope = factory.Services.CreateAsyncScope();
        var row = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<UserSettings>().AsNoTracking().SingleAsync(s => s.Id == phone.UserId, Ct);
        Assert.Equal("F", row.TemperatureUnit);
        Assert.Equal("19:00", row.ReminderTime);
    }

    [Fact]
    public async Task Download_my_data_has_every_kind_of_record_and_no_secrets()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var (tripId, photoId) = await FillAsync(phone);
        using var other = await Phone.SignedInAsync(factory);
        await FillAsync(other);

        var response = await phone.Send(HttpMethod.Get, "/me/export");
        var body = await response.Content.ReadAsStringAsync(Ct);
        Assert.True(response.IsSuccessStatusCode, body);
        Assert.True(response.Headers.CacheControl?.NoStore);
        using var json = JsonDocument.Parse(body);
        var data = json.RootElement.GetProperty("data");
        foreach (var name in new[] { "account", "settings", "devices", "trips", "tripStops", "flights", "places", "checklistItems", "expenses", "photos" })
        {
            Assert.True(data.TryGetProperty(name, out _), $"missing {name}");
        }
        Assert.Equal(phone.Email, data.GetProperty("account").GetProperty("email").GetString());
        Assert.Equal("Ana", data.GetProperty("account").GetProperty("firstName").GetString());
        Assert.Equal(tripId, Assert.Single(data.GetProperty("trips").EnumerateArray()).GetProperty("id").GetGuid());
        Assert.Equal(2, data.GetProperty("places").GetArrayLength());
        Assert.Equal(1, data.GetProperty("checklistItems").GetArrayLength());
        Assert.Equal(1, data.GetProperty("expenses").GetArrayLength());
        var photo = Assert.Single(data.GetProperty("photos").EnumerateArray());
        Assert.Equal(photoId, photo.GetProperty("id").GetGuid());
        Assert.Equal("Sunset", photo.GetProperty("caption").GetString());
        Assert.Equal("20:30", data.GetProperty("settings").GetProperty("reminderTime").GetString());
        Assert.Equal("Test phone", Assert.Single(data.GetProperty("devices").EnumerateArray()).GetProperty("name").GetString());

        // Never secrets or the other user's data.
        foreach (var secret in new[] { "passwordHash", "securityStamp", "concurrencyStamp", "tokenHash", "fileKey", other.Email })
        {
            Assert.DoesNotContain(secret, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Export_needs_a_login()
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(new Uri("/me/export", UriKind.Relative), Ct)).StatusCode);
    }

    [Fact]
    public async Task Delete_needs_the_word_DELETE()
    {
        using var phone = await Phone.SignedInAsync(factory);
        Assert.Equal(HttpStatusCode.BadRequest, (await phone.Send(HttpMethod.Post, "/me/delete", new { confirm = "delete" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await phone.Send(HttpMethod.Post, "/me/delete", new { })).StatusCode);
        var me = await AuthTestClient.Read<AuthUserResponse>(await phone.Client.GetMe(phone.Session.AccessToken));
        Assert.Null(me.Deletion);
    }

    [Fact]
    public async Task Delete_ends_every_session_and_login_offers_restore_for_30_days()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var secondPhone = AuthTestClient.NewDevice();
        var login2 = await AuthTestClient.Read<LoginResponse>(await phone.Client.Post("/auth/login", new LoginRequest(phone.Email, AuthTestClient.Password, secondPhone)));
        Assert.Equal("codeRequired", login2.Kind);
        var second = await AuthTestClient.Read<SessionResponse>(await phone.Client.Post("/auth/login/verify",
            new VerifyCodeRequest(phone.Email, phone.Client.Code(phone.Email, CodePurpose.Login), secondPhone)));

        var deleted = await AuthTestClient.Read<AuthUserResponse>(await phone.Send(HttpMethod.Post, "/me/delete", new DeleteAccountRequest("DELETE")));
        var deletion = Assert.IsType<AccountDeletionDto>(deleted.Deletion);
        Assert.InRange((deletion.DeleteAfter - deletion.RequestedAt).TotalDays, 29.99, 30.01);

        // Both phones: the refresh says why, so they wipe this account's data.
        await AuthTestClient.AssertError(await phone.Client.Post("/auth/refresh", new RefreshRequest(phone.Session.RefreshToken)), HttpStatusCode.Unauthorized, AuthErrorCodes.AccountDeleted);
        await AuthTestClient.AssertError(await phone.Client.Post("/auth/refresh", new RefreshRequest(second.RefreshToken)), HttpStatusCode.Unauthorized, AuthErrorCodes.AccountDeleted);

        // Asking again does not move the date.
        var again = await AuthTestClient.Read<AuthUserResponse>(await phone.Send(HttpMethod.Post, "/me/delete", new DeleteAccountRequest("DELETE")));
        Assert.True(Math.Abs((deletion.DeleteAfter - again.Deletion!.DeleteAfter).TotalMilliseconds) < 1);

        // Logging in again works, and tells the app the account is waiting to be deleted.
        var login = await AuthTestClient.Read<LoginResponse>(await phone.Client.Post("/auth/login", new LoginRequest(phone.Email, AuthTestClient.Password, phone.Device)));
        Assert.Equal("session", login.Kind);
        Assert.NotNull(login.Session!.User.Deletion);
        phone.Session = login.Session;
        // This new session can be refreshed (the app may stay on the Restore screen a while), and still says "waiting".
        phone.Session = await AuthTestClient.Read<SessionResponse>(await phone.Client.Post("/auth/refresh", new RefreshRequest(phone.Session.RefreshToken)));
        Assert.NotNull(phone.Session.User.Deletion);

        var restored = await AuthTestClient.Read<AuthUserResponse>(await phone.Send(HttpMethod.Post, "/me/restore"));
        Assert.Null(restored.Deletion);
        await AuthTestClient.Read<SessionResponse>(await phone.Client.Post("/auth/refresh", new RefreshRequest(phone.Session.RefreshToken)));
        await AuthTestClient.AssertError(await phone.Send(HttpMethod.Post, "/me/restore"), HttpStatusCode.Conflict, AuthErrorCodes.NotDeleted);
    }

    [Fact]
    public async Task After_30_days_everything_is_erased_files_first_and_restore_is_too_late()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var (tripId, photoId) = await FillAsync(phone);
        using var other = await Phone.SignedInAsync(factory);
        var (otherTrip, otherPhoto) = await FillAsync(other);
        await AuthTestClient.Read<AuthUserResponse>(await phone.Send(HttpMethod.Post, "/me/delete", new DeleteAccountRequest("DELETE")));
        // A code waiting for this email (a forgotten-password request) goes too.
        await phone.Client.Post("/auth/password/forgot", new ForgotPasswordRequest(phone.Email));

        // Not yet: nothing is erased before the 30 days are over.
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<AccountService>().PurgeDueAsync(Ct);
            Assert.True(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<User>().AnyAsync(u => u.Id == phone.UserId, Ct));
        }

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Set<User>().Where(u => u.Id == phone.UserId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.DeleteAfter, DateTimeOffset.UtcNow.AddMinutes(-1)), Ct);
        }

        // Too late to restore once the days are over.
        var login = await AuthTestClient.Read<LoginResponse>(await phone.Client.Post("/auth/login", new LoginRequest(phone.Email, AuthTestClient.Password, phone.Device)));
        phone.Session = login.Session!;
        await AuthTestClient.AssertError(await phone.Send(HttpMethod.Post, "/me/restore"), HttpStatusCode.Gone, AuthErrorCodes.AccountDeleted);

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            Assert.True(await scope.ServiceProvider.GetRequiredService<AccountService>().PurgeDueAsync(Ct) >= 1);
        }

        Assert.False(factory.MediaFiles.Has(MediaValues.FileKey(photoId)));
        Assert.False(factory.MediaFiles.Has(MediaValues.ThumbnailKey(photoId)));
        Assert.True(factory.MediaFiles.Has(MediaValues.FileKey(otherPhoto)));

        // Every table, counted in SQL: nothing of this user is left, the other user's data is untouched.
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            async Task<long> Count(string sql, Guid id) =>
                await db.Database.SqlQueryRaw<long>(sql, id).SingleAsync(Ct);
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM users WHERE id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM user_settings WHERE id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM user_logins WHERE user_id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM refresh_tokens WHERE user_id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM trusted_devices WHERE user_id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM trips WHERE id = {0}", tripId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM trip_stops WHERE trip_id = {0}", tripId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM places WHERE created_by_user_id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM checklist_items WHERE trip_id = {0}", tripId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM expenses WHERE created_by_user_id = {0}", phone.UserId));
            Assert.Equal(0, await Count("SELECT count(*) AS \"Value\" FROM media WHERE owner_user_id = {0}", phone.UserId));
            var normalized = phone.Email.ToUpperInvariant();
            Assert.Equal(0, await db.Database.SqlQueryRaw<long>("SELECT count(*) AS \"Value\" FROM auth_codes WHERE email = {0}", normalized).SingleAsync(Ct));

            Assert.Equal(1, await Count("SELECT count(*) AS \"Value\" FROM trips WHERE id = {0}", otherTrip));
            Assert.Equal(1, await Count("SELECT count(*) AS \"Value\" FROM user_settings WHERE id = {0}", other.UserId));
        }

        // The phone hears the account is gone and must log in again; the email can sign up afresh.
        await AuthTestClient.AssertError(await phone.Client.Post("/auth/refresh", new RefreshRequest(phone.Session.RefreshToken)), HttpStatusCode.Unauthorized, AuthErrorCodes.SessionExpired);
        await AuthTestClient.AssertError(await phone.Client.Post("/auth/login", new LoginRequest(phone.Email, AuthTestClient.Password, phone.Device)), HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidCredentials);
    }

    [Fact]
    public async Task Erase_waits_when_photo_storage_is_down()
    {
        using var phone = await Phone.SignedInAsync(factory);
        await FillAsync(phone);
        await AuthTestClient.Read<AuthUserResponse>(await phone.Send(HttpMethod.Post, "/me/delete", new DeleteAccountRequest("DELETE")));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var media = new MediaUserData(db, scope.ServiceProvider.GetRequiredService<TravelApp.Api.Features.Trips.ITripWriteRules>(), new DownStorage());
        await Assert.ThrowsAsync<MediaStorageUnavailableException>(() => media.PurgeAsync(phone.UserId, Ct));
        // Nothing was removed from the database, so the job can try again with every record still there.
        Assert.True(await db.Set<User>().AnyAsync(u => u.Id == phone.UserId, Ct));
    }

    private sealed class DownStorage : IMediaStorage
    {
        public Task PutAsync(string key, Stream content, CancellationToken ct) => throw new MediaStorageUnavailableException("down");

        public Task<Stream?> OpenReadAsync(string key, CancellationToken ct) => throw new MediaStorageUnavailableException("down");

        public Task DeleteAsync(string key, CancellationToken ct) => throw new MediaStorageUnavailableException("down");
    }
}
