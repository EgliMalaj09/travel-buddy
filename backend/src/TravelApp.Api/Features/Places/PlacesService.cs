using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Places;

/// <summary>Places, backend side (KAN-35): the rules of data model section 11 and reading a trip's places.</summary>
internal sealed partial class PlacesService(AppDbContext db, ITripWriteRules trips) : ITripDeleteHook
{
    /// <summary>The checks for one place after the phone's columns were applied. Problems use column names.</summary>
    public static IReadOnlyDictionary<string, string[]> Check(Place place, string? oldStatus, Guid? oldTripId, bool isNew)
    {
        var problems = new Dictionary<string, List<string>>();
        void Add(string column, string message)
        {
            if (!problems.TryGetValue(column, out var list)) problems[column] = list = [];
            list.Add(message);
        }

        if (string.IsNullOrWhiteSpace(place.Title)) Add("title", "The place needs a name.");
        else if (place.Title.Length > PlaceValues.TitleMax) Add("title", $"The name can be up to {PlaceValues.TitleMax} characters.");
        if (place.Note?.Length > PlaceValues.NoteMax) Add("note", $"Up to {PlaceValues.NoteMax} characters.");
        if (place.CityName?.Length > PlaceValues.CityNameMax) Add("city_name", $"Up to {PlaceValues.CityNameMax} characters.");
        if (place.Address?.Length > PlaceValues.AddressMax) Add("address", $"Up to {PlaceValues.AddressMax} characters.");
        if (place.GeoProviderId?.Length > PlaceValues.GeoProviderIdMax) Add("geo_provider_id", $"Up to {PlaceValues.GeoProviderIdMax} characters.");
        if (!PlaceValues.Scopes.Contains(place.Scope)) Add("scope", "Scope must be shared or personal.");
        if (!PlaceValues.Statuses.Contains(place.Status)) Add("status", "Status must be bucket, planned or visited.");
        if (!PlaceValues.Categories.Contains(place.Category)) Add("category", "Category must be food, sight, stay, transport or other.");
        if (!PlaceValues.Sources.Contains(place.Source)) Add("source", "Source must be manual or autocapture.");
        if (!CountryCode().IsMatch(place.CountryCode)) Add("country_code", "Use a 2-letter ISO country code.");
        if (place.Lat is null != place.Lng is null) Add("lat", "Send both lat and lng, or neither.");
        else if (place.Lat is < -90 or > 90 || place.Lng is < -180 or > 180) Add("lat", "The map position is out of range.");

        // Bucket list = no trip; planned and visited places belong to a trip.
        if (place.Status == PlaceValues.Bucket && place.TripId is not null) Add("status", "A place on a trip is planned or visited, not bucket list.");
        if (place.Status != PlaceValues.Bucket && place.TripId is null) Add("trip_id", "A planned or visited place needs its trip.");
        if (place.Status == PlaceValues.Bucket && place.Scope != PlaceValues.Personal) Add("scope", "Bucket-list places are always personal.");
        if (!isNew && oldStatus == PlaceValues.Visited && place.Status == PlaceValues.Bucket)
            Add("status", "A visited place can go back to planned, not to the bucket list.");
        // A bucket item can be added to a trip; after that it stays with the trip (a repeat visit is a new place).
        if (!isNew && oldTripId is not null && place.TripId != oldTripId) Add("trip_id", "A place cannot move to another trip. Add it to the new trip as a new place.");

        return problems.ToDictionary(p => p.Key, p => p.Value.ToArray());
    }

    /// <summary>True when the user may change the place: the trip is theirs, or it is their own bucket-list place.</summary>
    public async Task<bool> CanWriteAsync(Guid userId, Place place, CancellationToken ct)
    {
        if (place.Scope == PlaceValues.Personal && place.OwnerUserId is { } owner && owner != userId) return false;
        return place.TripId is { } tripId
            ? await trips.OwnsTripAsync(userId, tripId, ct)
            : place.CreatedByUserId == userId;
    }

    /// <summary>The trip's places, or null when the trip is not the user's.</summary>
    public async Task<TripPlacesResponse?> ListForTripAsync(Guid userId, Guid tripId, CancellationToken ct)
    {
        if (!await trips.OwnsTripAsync(userId, tripId, ct)) return null;
        var places = await db.Set<Place>().AsNoTracking()
            .Where(p => p.TripId == tripId && p.DeletedAt == null && (p.Scope == PlaceValues.Shared || p.OwnerUserId == userId))
            .OrderBy(p => p.PlannedDate == null).ThenBy(p => p.PlannedDate).ThenBy(p => p.CreatedAt).ThenBy(p => p.Id)
            .ToListAsync(ct);
        return new TripPlacesResponse(places.Select(ToDto).ToList());
    }

    /// <summary>A deleted trip takes its places with it (soft delete, so phones see it).</summary>
    public Task TripDeletedAsync(Guid tripId, DateTimeOffset at, CancellationToken ct) =>
        db.Set<Place>().Where(p => p.TripId == tripId && p.DeletedAt == null)
            .ExecuteUpdateAsync(u => u.SetProperty(p => p.DeletedAt, at).SetProperty(p => p.UpdatedAt, at).SetProperty(p => p.Version, p => p.Version + 1), ct);

    public static PlaceDto ToDto(Place p) => new(p.Id, p.TripId, p.CreatedByUserId, p.OwnerUserId, p.Scope, p.Status, p.Title, p.Note,
        p.Lat, p.Lng, p.CountryCode, p.CityName, p.Address, p.GeoProviderId, p.Category, p.PlannedDate, p.VisitedAt, p.Source,
        p.IsSuggested, p.CoverMediaId, p.CopiedFromPlaceId, p.CreatedAt, p.UpdatedAt, p.DeletedAt, p.Version);

    [GeneratedRegex("^[A-Z]{2}$")]
    private static partial Regex CountryCode();
}
