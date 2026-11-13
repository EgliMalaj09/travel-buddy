using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Net.Http.Headers;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// Photo files (KAN-40). The record is written through POST /sync/upload (type "media") and read through PowerSync
/// (stream "my_media"); the image bytes go through here. Only the API talks to Blob Storage; the phone never does.
/// </summary>
public static class MediaEndpoints
{
    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/media").WithTags("Photos").RequireAuthorization()
            .RequireRateLimiting(MediaSetup.RateLimitPolicy)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", ListForTrip).WithName("ListTripMedia")
            .WithSummary("The photos of one of your trips (deleted ones left out), newest first by taken time, else by added time");

        group.MapPut("/{id:guid}/file", PutFile).WithName("UploadMediaFile")
            .WithSummary("Upload the full photo (image/jpeg, up to 15 MB) of a record that is already synced. Metadata (EXIF, GPS) is removed before storing")
            .Accepts<Stream>(MediaValues.Jpeg).WithUploadProblems();
        group.MapPut("/{id:guid}/thumbnail", PutThumbnail).WithName("UploadMediaThumbnail")
            .WithSummary("Upload the thumbnail (image/jpeg, up to 1 MB) of a record that is already synced. Metadata is removed before storing")
            .Accepts<Stream>(MediaValues.Jpeg).WithUploadProblems();

        group.MapGet("/{id:guid}/file", GetFile).WithName("GetMediaFile")
            .WithSummary("The full photo as image/jpeg").Produces(StatusCodes.Status200OK, contentType: MediaValues.Jpeg)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);
        group.MapGet("/{id:guid}/thumbnail", GetThumbnail).WithName("GetMediaThumbnail")
            .WithSummary("The thumbnail as image/jpeg").Produces(StatusCodes.Status200OK, contentType: MediaValues.Jpeg)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        return app;
    }

    internal static async Task<Results<Ok<TripMediaResponse>, NotFound>> ListForTrip(
        ClaimsPrincipal user, MediaService service, Guid tripId, CancellationToken ct) =>
        await service.ListForTripAsync(user.UserId(), tripId, ct) is { } media ? TypedResults.Ok(media) : TypedResults.NotFound();

    internal static Task<Results<NoContent, NotFound, ProblemHttpResult>> PutFile(
        Guid id, HttpRequest request, ClaimsPrincipal user, MediaService service, CancellationToken ct) =>
        Upload(id, thumbnail: false, request, user, service, ct);

    internal static Task<Results<NoContent, NotFound, ProblemHttpResult>> PutThumbnail(
        Guid id, HttpRequest request, ClaimsPrincipal user, MediaService service, CancellationToken ct) =>
        Upload(id, thumbnail: true, request, user, service, ct);

    internal static Task<Results<FileStreamHttpResult, NotFound, ProblemHttpResult>> GetFile(
        Guid id, HttpContext http, MediaService service, CancellationToken ct) => Download(id, thumbnail: false, http, service, ct);

    internal static Task<Results<FileStreamHttpResult, NotFound, ProblemHttpResult>> GetThumbnail(
        Guid id, HttpContext http, MediaService service, CancellationToken ct) => Download(id, thumbnail: true, http, service, ct);

    private static async Task<Results<NoContent, NotFound, ProblemHttpResult>> Upload(
        Guid id, bool thumbnail, HttpRequest request, ClaimsPrincipal user, MediaService service, CancellationToken ct)
    {
        if (!MediaTypeHeaderValue.TryParse(request.ContentType, out var type) || !type.MediaType.Equals(MediaValues.Jpeg, StringComparison.OrdinalIgnoreCase))
            return Problem(StatusCodes.Status415UnsupportedMediaType, "Send the photo as image/jpeg.");
        var max = thumbnail ? MediaValues.ThumbnailBytesMax : MediaValues.FileBytesMax;
        if (request.ContentLength > max) return TooLarge(max);

        return await service.StoreAsync(user.UserId(), id, thumbnail, request.Body, ct) switch
        {
            UploadOutcome.Stored => TypedResults.NoContent(),
            UploadOutcome.NotFound => TypedResults.NotFound(),
            UploadOutcome.TooLarge => TooLarge(max),
            UploadOutcome.NotJpeg => Problem(StatusCodes.Status400BadRequest, "This is not a valid JPEG image."),
            _ => Unavailable(),
        };
    }

    private static async Task<Results<FileStreamHttpResult, NotFound, ProblemHttpResult>> Download(
        Guid id, bool thumbnail, HttpContext http, MediaService service, CancellationToken ct)
    {
        try
        {
            if (await service.OpenAsync(http.User.UserId(), id, thumbnail, ct) is not { } stream) return TypedResults.NotFound();
            http.Response.Headers.CacheControl = "private, max-age=86400";
            return TypedResults.Stream(stream, MediaValues.Jpeg);
        }
        catch (MediaStorageUnavailableException)
        {
            return Unavailable();
        }
    }

    private static RouteHandlerBuilder WithUploadProblems(this RouteHandlerBuilder builder) => builder
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
        .ProducesProblem(StatusCodes.Status415UnsupportedMediaType)
        .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

    private static ProblemHttpResult TooLarge(long max) =>
        Problem(StatusCodes.Status413PayloadTooLarge, $"The image can be up to {max / (1024 * 1024)} MB.");

    private static ProblemHttpResult Unavailable() =>
        Problem(StatusCodes.Status503ServiceUnavailable, "Photo storage is not available right now. Try again later.");

    private static ProblemHttpResult Problem(int status, string title) => TypedResults.Problem(statusCode: status, title: title);
}
