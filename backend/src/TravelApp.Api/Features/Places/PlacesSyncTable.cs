using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Sync;

namespace TravelApp.Api.Features.Places;

/// <summary>
/// Writes of places that come through the sync write endpoint (POST /sync/upload). Only the columns the phone
/// sent are changed (S4: per field, last change wins). Server-only columns are never taken from the phone:
/// the server sets who created the place, and the owner of a personal place.
/// </summary>
internal sealed class PlacesSyncTable(AppDbContext db, PlacesService service, TimeProvider clock) : ISyncTable
{
    public const string PlacesTable = "places";

    /// <summary>Set by the server. The phone has them too (PowerSync sends whole rows), so they are ignored, not refused.</summary>
    private static readonly HashSet<string> ServerColumns =
        ["id", "created_by_user_id", "owner_user_id", "created_at", "updated_at", "deleted_at", "version"];

    private static readonly HashSet<string> PlaceColumns =
    [
        "trip_id", "scope", "status", "title", "note", "lat", "lng", "country_code", "city_name", "address", "geo_provider_id",
        "category", "planned_date", "visited_at", "source", "is_suggested", "cover_media_id", "copied_from_place_id",
    ];

    private static readonly string[] UnknownColumn = ["Unknown column."];

    private static readonly IReadOnlyDictionary<string, string[]> Fine = new Dictionary<string, string[]>();

    public IReadOnlyCollection<string> Types { get; } = [PlacesTable];

    public async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(SyncWrite write, CancellationToken ct)
    {
        var place = await db.Set<Place>().FirstOrDefaultAsync(p => p.Id == write.Id, ct);
        if (place is not null && !await service.CanWriteAsync(write.UserId, place, ct))
        {
            // A place of a deleted trip: deleting it again is fine, anything else is not found.
            return write.Op == SyncLimits.Delete && place.DeletedAt is not null ? Fine : Problem("id", "Not found.");
        }

        if (write.Op == SyncLimits.Delete)
        {
            if (place is null || place.DeletedAt is not null) return Fine;
            var at = clock.GetUtcNow();
            place.DeletedAt = at;
            place.UpdatedAt = at;
            place.Version += 1;
            await db.SaveChangesAsync(ct);
            return Fine;
        }

        if (place?.DeletedAt is not null) return Problem("id", "This was deleted.");
        if (place is null && write.Op == SyncLimits.Patch) return Problem("id", "Not found.");
        var unknown = write.Data.Columns.Where(c => !PlaceColumns.Contains(c) && !ServerColumns.Contains(c)).ToList();
        if (unknown.Count > 0) return unknown.ToDictionary(c => c, _ => UnknownColumn);

        var isNew = place is null;
        place ??= new Place { Id = write.Id, CreatedByUserId = write.UserId, CreatedAt = clock.GetUtcNow() };
        var oldStatus = place.Status;
        var oldTripId = place.TripId;

        var d = write.Data;
        d.Uuid("trip_id", v => place.TripId = v);
        d.Text("scope", v => place.Scope = v ?? "");
        d.Text("status", v => place.Status = v ?? "");
        d.Text("title", v => place.Title = v?.Trim() ?? "");
        d.Text("note", v => place.Note = string.IsNullOrWhiteSpace(v) ? null : v);
        d.Number("lat", v => place.Lat = v);
        d.Number("lng", v => place.Lng = v);
        d.Text("country_code", v => place.CountryCode = v ?? "");
        d.Text("city_name", v => place.CityName = Clean(v));
        d.Text("address", v => place.Address = Clean(v));
        d.Text("geo_provider_id", v => place.GeoProviderId = Clean(v));
        d.Text("category", v => place.Category = v ?? "");
        d.Date("planned_date", v => place.PlannedDate = v);
        d.Timestamp("visited_at", v => place.VisitedAt = v);
        d.Text("source", v => place.Source = v ?? "");
        d.Bool("is_suggested", v => place.IsSuggested = v ?? false);
        d.Uuid("cover_media_id", v => place.CoverMediaId = v);
        d.Uuid("copied_from_place_id", v => place.CopiedFromPlaceId = v);
        if (isNew && !d.Has("title")) d.AddProblem("title", "A new place needs its name.");
        if (isNew && !d.Has("country_code")) d.AddProblem("country_code", "A new place needs its country.");
        if (d.Problems.Count > 0) return d.Problems;

        place.OwnerUserId = place.Scope == PlaceValues.Personal ? place.OwnerUserId ?? write.UserId : null;
        var problems = PlacesService.Check(place, isNew ? null : oldStatus, isNew ? null : oldTripId, isNew);
        if (problems.Count > 0) return problems;
        if (!await service.CanWriteAsync(write.UserId, place, ct)) return Problem("trip_id", "Trip not found.");

        if (isNew)
        {
            place.Version = 0;
            db.Add(place);
        }

        place.UpdatedAt = clock.GetUtcNow();
        place.Version += 1;
        await db.SaveChangesAsync(ct);
        return Fine;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static Dictionary<string, string[]> Problem(string column, string message) =>
        new Dictionary<string, string[]> { [column] = [message] };
}
