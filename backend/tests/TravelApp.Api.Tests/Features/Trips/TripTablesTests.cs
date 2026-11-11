using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Trips;
using TravelApp.Api.Shared;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Trips;

/// <summary>The trips, trip_stops and flights tables in a real PostgreSQL (migration applied).</summary>
public sealed class TripTablesTests(ApiFactory factory)
{
    private static readonly DateTimeOffset Now = new(2026, 11, 11, 12, 0, 0, TimeSpan.Zero);

    private static Trip NewTrip(Guid ownerId) => new()
    {
        Id = Ids.New(),
        OwnerId = ownerId,
        Name = "Rome & Florence",
        StartDate = new DateOnly(2027, 4, 12),
        EndDate = new DateOnly(2027, 4, 19),
        Activities = ["city", "food"],
        PassportCountrySnapshot = "AL",
        HomeCurrencySnapshot = "ALL",
        CreatedAt = Now,
        UpdatedAt = Now,
        Version = 1,
    };

    /// <summary>trips.owner_id must point at a real user.</summary>
    private static async Task<Guid> NewOwnerAsync(AppDbContext db, CancellationToken ct)
    {
        var email = $"owner-{Guid.NewGuid():N}@example.com";
        var user = new User
        {
            Id = Ids.New(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            UserName = email,
            NormalizedUserName = email.ToUpperInvariant(),
            CreatedAt = Now,
            UpdatedAt = Now,
            Version = 1,
        };
        db.Add(user);
        await db.SaveChangesAsync(ct);
        return user.Id;
    }

    private static TripStop NewStop(Guid tripId, int order, string city, int nights) => new()
    {
        Id = Ids.New(),
        TripId = tripId,
        Order = order,
        CountryCode = "IT",
        CityName = city,
        Lat = 41.9,
        Lng = 12.5,
        Nights = nights,
        CreatedAt = Now,
        UpdatedAt = Now,
        Version = 1,
    };

    [Fact]
    public async Task A_trip_with_stops_and_flights_is_saved_and_read_back()
    {
        var ct = TestContext.Current.CancellationToken;
        Trip trip;
        Guid owner;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            owner = await NewOwnerAsync(db, ct);
            trip = NewTrip(owner);
            db.Add(trip);
            db.Add(NewStop(trip.Id, 0, "Rome", 4));
            var florence = NewStop(trip.Id, 1, "Florence", 3);
            florence.Lat = null;
            florence.Lng = null;
            db.Add(florence);
            db.Add(new Flight
            {
                Id = Ids.New(),
                TripId = trip.Id,
                Direction = TripValues.Outbound,
                FlightNumber = "W6 4567",
                DepartureLocalTime = new DateTime(2027, 4, 12, 9, 40, 0, DateTimeKind.Unspecified),
                DepartureTimeZone = "Europe/Tirane",
                CreatedAt = Now,
                UpdatedAt = Now,
                Version = 1,
            });
            await db.SaveChangesAsync(ct);
        }

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saved = await db.Set<Trip>().SingleAsync(t => t.Id == trip.Id, ct);
            Assert.Equal(["city", "food"], saved.Activities);
            var stops = await db.Set<TripStop>().Where(s => s.TripId == trip.Id).OrderBy(s => s.Order).ToListAsync(ct);
            Assert.Equal(["Rome", "Florence"], stops.Select(s => s.CityName));
            Assert.Null(stops[1].Lat);
            var flight = await db.Set<Flight>().SingleAsync(f => f.TripId == trip.Id, ct);
            Assert.Equal(new DateTime(2027, 4, 12, 9, 40, 0), flight.DepartureLocalTime);

            var rules = scope.ServiceProvider.GetRequiredService<ITripWriteRules>();
            Assert.True(await rules.OwnsTripAsync(owner, trip.Id, ct));
            Assert.False(await rules.OwnsTripAsync(Guid.NewGuid(), trip.Id, ct));
            Assert.Equal(2, await rules.CountStopsAsync(trip.Id, ct));
        }
    }

    [Fact]
    public async Task The_database_refuses_impossible_rows()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var owner = await NewOwnerAsync(db, ct);
        var trip = NewTrip(owner);
        trip.EndDate = new DateOnly(2027, 4, 1);
        db.Add(trip);
        var badDates = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(ct));
        Assert.Equal("ck_trips_dates", ((PostgresException)badDates.InnerException!).ConstraintName);
        db.ChangeTracker.Clear();

        var good = NewTrip(owner);
        db.Add(good);
        await db.SaveChangesAsync(ct);
        db.Add(NewStop(good.Id, 0, "Rome", -1));
        var badNights = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(ct));
        Assert.Equal("ck_trip_stops_nights", ((PostgresException)badNights.InnerException!).ConstraintName);
        db.ChangeTracker.Clear();

        db.Add(NewTrip(Guid.NewGuid()));
        var noOwner = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(ct));
        Assert.Equal("fk_trips_users_owner_id", ((PostgresException)noOwner.InnerException!).ConstraintName);
    }
}
