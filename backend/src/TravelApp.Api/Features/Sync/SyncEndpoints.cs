using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Sync;

/// <summary>
/// The sync write endpoint (KAN-16). The phone reads through PowerSync (Sync Streams in backend/docker/powersync)
/// and sends every write here, so business rules and conflict handling stay in our backend (S1).
/// </summary>
public static class SyncEndpoints
{
    public static IEndpointRouteBuilder MapSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/sync").WithTags("Sync").RequireAuthorization()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/upload", Upload).WithName("SyncUpload")
            .WithSummary("Saves the phone's waiting changes (create, change, delete), one result per change")
            .WithDescription("Each change is applied column by column; the change that reaches the server last wins (S4). "
                + "A rejected change comes back with status \"rejected\" and the reasons; the others are still saved. "
                + "The answer is 200 whenever the request itself is valid, so the phone never retries a rejected change forever.");

        return app;
    }

    internal static async Task<Ok<SyncUploadResponse>> Upload(SyncUploadRequest request, ClaimsPrincipal user, SyncService service, CancellationToken ct) =>
        TypedResults.Ok(await service.UploadAsync(user.UserId(), request, ct));
}
