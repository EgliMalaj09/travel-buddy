using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Media;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Media;

/// <summary>Photos and notes (KAN-40): records through POST /sync/upload, files through /media, cleanup after 30 days.</summary>
public sealed class MediaTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>A tiny JPEG: SOI, APP0 (JFIF), APP1 (Exif with a fake GPS text), COM, SOS with scan data, EOI.</summary>
    internal static byte[] JpegWithExif()
    {
        byte[] app0 = [0xFF, 0xE0, 0x00, 0x10, .."JFIF\0"u8, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
        var exifBody = "Exif\0\0GPS 41.3275 19.8187"u8.ToArray();
        byte[] app1 = [0xFF, 0xE1, (byte)((exifBody.Length + 2) >> 8), (byte)(exifBody.Length + 2), .. exifBody];
        var comment = "secret note"u8.ToArray();
        byte[] com = [0xFF, 0xFE, 0x00, (byte)(comment.Length + 2), .. comment];
        byte[] sos = [0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x12, 0xFF, 0x00, 0x34, 0xFF, 0xD0, 0x56];
        return [0xFF, 0xD8, .. app0, .. app1, .. com, .. sos, 0xFF, 0xD9];
    }

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

        public async Task<HttpResponseMessage> Send(HttpMethod method, string url, HttpContent? content = null)
        {
            using var request = new HttpRequestMessage(method, new Uri(url, UriKind.Relative)) { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
            return await _client.Http.SendAsync(request, Ct);
        }

        public async Task<IReadOnlyList<SyncChangeResult>> Upload(params object[] changes) =>
            (await AuthTestClient.Read<SyncUploadResponse>(await Send(HttpMethod.Post, "/sync/upload", JsonContent.Create(new { changes })))).Results;

        public Task<HttpResponseMessage> Put(Guid id, string part, byte[] body, string type = "image/jpeg")
        {
            var content = new ByteArrayContent(body);
            content.Headers.ContentType = new MediaTypeHeaderValue(type);
            return Send(HttpMethod.Put, $"/media/{id}/{part}", content);
        }

        public async Task<IReadOnlyList<MediaDto>> Photos(Guid tripId) =>
            (await AuthTestClient.Read<TripMediaResponse>(await Send(HttpMethod.Get, $"/media?tripId={tripId}"))).Media;

        public async Task<Guid> NewTrip()
        {
            var tripId = Guid.CreateVersion7();
            AllOk(await Upload(
                new
                {
                    op = "PUT", type = "trips", id = tripId,
                    data = new Dictionary<string, object?>
                    {
                        ["name"] = "Tirana", ["type"] = "solo", ["start_date"] = "2027-04-12", ["end_date"] = "2027-04-19",
                        ["activities"] = "[]", ["status"] = "planned", ["passport_country_snapshot"] = "AL",
                        ["home_currency_snapshot"] = "ALL", ["anniversary_enabled"] = 1,
                    },
                },
                new
                {
                    op = "PUT", type = "trip_stops", id = Guid.CreateVersion7(),
                    data = new Dictionary<string, object?>
                    {
                        ["trip_id"] = tripId.ToString(), ["order"] = 0, ["country_code"] = "AL", ["city_name"] = "Tirana", ["nights"] = 7,
                    },
                }));
            return tripId;
        }

        public void Dispose() => _client.Dispose();
    }

    private static string Hash() => Convert.ToHexStringLower(Guid.NewGuid().ToByteArray()) + Convert.ToHexStringLower(Guid.NewGuid().ToByteArray());

    private static object PhotoPut(Guid id, Guid tripId, Dictionary<string, object?>? extra = null)
    {
        var data = new Dictionary<string, object?>
        {
            ["trip_id"] = tripId.ToString(), ["place_id"] = null, ["media_type"] = "photo", ["purpose"] = "trip_photo",
            ["scope"] = "shared", ["source"] = "camera", ["is_suggested"] = 0, ["caption"] = "  Sunset at the castle ",
            ["taken_at"] = "2027-04-13T18:30:00.000Z", ["lat"] = null, ["lng"] = null, ["country_code"] = null,
            ["width"] = 2048, ["height"] = 1536, ["mime_type"] = "image/jpeg", ["duration_sec"] = null,
            ["content_hash"] = Hash(), ["quality_tier"] = "compressed", ["include_in_video"] = 1, ["sort_order"] = null,
            // Server-only: ignored.
            ["owner_user_id"] = Guid.NewGuid().ToString(), ["file_key"] = "someone-else/full.jpg", ["uploaded_at"] = "2020-01-01T00:00:00Z",
            ["version"] = 99,
        };
        foreach (var (k, v) in extra ?? []) data[k] = v;
        return new { op = "PUT", type = "media", id, data };
    }

    private static void AllOk(IReadOnlyList<SyncChangeResult> results) =>
        Assert.All(results, r => Assert.True(r.Status == SyncLimits.Ok, $"{r.Type} {r.Id}: {string.Join("; ", r.Problems?.Select(p => $"{p.Key}: {string.Join(", ", p.Value)}") ?? [])}"));

    private static IReadOnlyDictionary<string, string[]> Rejected(IReadOnlyList<SyncChangeResult> results)
    {
        var result = Assert.Single(results);
        Assert.Equal(SyncLimits.Rejected, result.Status);
        return result.Problems!;
    }

    [Fact]
    public async Task A_photo_record_is_saved_with_server_columns_set_by_the_server()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();

        AllOk(await phone.Upload(PhotoPut(id, tripId)));

        var photo = Assert.Single(await phone.Photos(tripId));
        Assert.Equal(id, photo.Id);
        Assert.Equal("Sunset at the castle", photo.Caption);
        Assert.NotEqual(Guid.Empty, photo.OwnerUserId);
        Assert.Null(photo.FileKey);
        Assert.Null(photo.UploadedAt);
        Assert.Equal(1, photo.Version);

        AllOk(await phone.Upload(new { op = "PATCH", type = "media", id, data = new Dictionary<string, object?> { ["caption"] = "Edited" } }));
        Assert.Equal("Edited", Assert.Single(await phone.Photos(tripId)).Caption);
    }

    [Fact]
    public async Task Wrong_values_the_same_photo_twice_and_other_peoples_trips_are_refused()
    {
        using var phone = await Phone.SignedInAsync(factory);
        using var other = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();

        Assert.Contains("media_type", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["media_type"] = "video" }))).Keys);
        Assert.Contains("content_hash", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["content_hash"] = "ABC" }))).Keys);
        Assert.Contains("lng", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["lat"] = 41.3 }))).Keys);
        Assert.Contains("caption", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["caption"] = new string('a', 2001) }))).Keys);
        Assert.Contains("place_id", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["place_id"] = Guid.NewGuid().ToString() }))).Keys);
        Assert.Contains("unknown", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["unknown"] = 1 }))).Keys);

        var hash = Hash();
        AllOk(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["content_hash"] = hash })));
        Assert.Contains("content_hash", Rejected(await phone.Upload(PhotoPut(Guid.CreateVersion7(), tripId, new() { ["content_hash"] = hash }))).Keys);

        Assert.Contains("trip_id", Rejected(await other.Upload(PhotoPut(Guid.CreateVersion7(), tripId))).Keys);
        var mine = (await phone.Photos(tripId))[0].Id;
        Assert.Contains("id", Rejected(await other.Upload(new { op = "DELETE", type = "media", id = mine })).Keys);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Send(HttpMethod.Get, $"/media?tripId={tripId}")).StatusCode);
    }

    [Fact]
    public async Task Files_are_stored_without_metadata_and_only_the_owner_can_read_them()
    {
        using var phone = await Phone.SignedInAsync(factory);
        using var other = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        var jpeg = JpegWithExif();

        // The record syncs first (D4): before that, the file is "not found" and the phone tries again later.
        Assert.Equal(HttpStatusCode.NotFound, (await phone.Put(id, "file", jpeg)).StatusCode);
        AllOk(await phone.Upload(PhotoPut(id, tripId)));

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await phone.Put(id, "file", jpeg, "image/png")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await phone.Put(id, "file", "not a jpeg"u8.ToArray())).StatusCode);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await phone.Put(id, "thumbnail", new byte[MediaValues.ThumbnailBytesMax + 1])).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Put(id, "file", jpeg)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await phone.Send(HttpMethod.Get, $"/media/{id}/file")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await phone.Put(id, "thumbnail", jpeg)).StatusCode);
        var afterThumb = Assert.Single(await phone.Photos(tripId));
        Assert.Equal(MediaValues.ThumbnailKey(id), afterThumb.ThumbnailKey);
        Assert.Null(afterThumb.UploadedAt);

        Assert.Equal(HttpStatusCode.NoContent, (await phone.Put(id, "file", jpeg)).StatusCode);
        var uploaded = Assert.Single(await phone.Photos(tripId));
        Assert.Equal(MediaValues.FileKey(id), uploaded.FileKey);
        Assert.NotNull(uploaded.UploadedAt);
        Assert.True(uploaded.Version > afterThumb.Version);

        var stored = factory.MediaFiles.Get(MediaValues.FileKey(id))!;
        Assert.Equal(stored.Length, uploaded.SizeBytes);
        Assert.Equal(JpegMetadata.Strip(jpeg), stored);
        Assert.DoesNotContain("GPS", System.Text.Encoding.ASCII.GetString(stored), StringComparison.Ordinal);

        var download = await phone.Send(HttpMethod.Get, $"/media/{id}/file");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/jpeg", download.Content.Headers.ContentType?.MediaType);
        Assert.Equal(stored, await download.Content.ReadAsByteArrayAsync(Ct));
        Assert.Equal(HttpStatusCode.NotFound, (await other.Send(HttpMethod.Get, $"/media/{id}/file")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.Send(HttpMethod.Get, $"/media/{id}/thumbnail")).StatusCode);

        // A deleted photo cannot be read any more.
        AllOk(await phone.Upload(new { op = "DELETE", type = "media", id }));
        Assert.Equal(HttpStatusCode.NotFound, (await phone.Send(HttpMethod.Get, $"/media/{id}/file")).StatusCode);
        Assert.Empty(await phone.Photos(tripId));
    }

    [Fact]
    public async Task A_deleted_trip_deletes_its_photos()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var id = Guid.CreateVersion7();
        AllOk(await phone.Upload(PhotoPut(id, tripId)));

        AllOk(await phone.Upload(new { op = "DELETE", type = "trips", id = tripId }));

        await using var scope = factory.Services.CreateAsyncScope();
        var row = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<MediaItem>().AsNoTracking().SingleAsync(m => m.Id == id, Ct);
        Assert.NotNull(row.DeletedAt);
    }

    [Fact]
    public async Task Cleanup_removes_files_and_rows_deleted_more_than_30_days_ago_and_keeps_newer_ones()
    {
        using var phone = await Phone.SignedInAsync(factory);
        var tripId = await phone.NewTrip();
        var old = Guid.CreateVersion7();
        var recent = Guid.CreateVersion7();
        AllOk(await phone.Upload(PhotoPut(old, tripId), PhotoPut(recent, tripId)));
        foreach (var id in (Guid[])[old, recent])
        {
            Assert.Equal(HttpStatusCode.NoContent, (await phone.Put(id, "thumbnail", JpegWithExif())).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await phone.Put(id, "file", JpegWithExif())).StatusCode);
        }
        AllOk(await phone.Upload(new { op = "DELETE", type = "media", id = old }, new { op = "DELETE", type = "media", id = recent }));

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var longAgo = DateTimeOffset.UtcNow.AddDays(-31);
        await db.Set<MediaItem>().Where(m => m.Id == old).ExecuteUpdateAsync(u => u.SetProperty(m => m.DeletedAt, longAgo), Ct);

        await scope.ServiceProvider.GetRequiredService<MediaService>().CleanupAsync(Ct);

        Assert.False(factory.MediaFiles.Has(MediaValues.FileKey(old)));
        Assert.False(factory.MediaFiles.Has(MediaValues.ThumbnailKey(old)));
        Assert.False(await db.Set<MediaItem>().AnyAsync(m => m.Id == old, Ct));
        Assert.True(factory.MediaFiles.Has(MediaValues.FileKey(recent)));
        Assert.True(await db.Set<MediaItem>().AnyAsync(m => m.Id == recent, Ct));
    }
}
