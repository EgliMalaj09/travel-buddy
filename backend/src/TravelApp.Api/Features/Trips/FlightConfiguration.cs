using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Trips;

/// <summary>Table "flights".</summary>
internal sealed class FlightConfiguration : IEntityTypeConfiguration<Flight>
{
    public void Configure(EntityTypeBuilder<Flight> builder)
    {
        builder.ToTable("flights", t =>
        {
            t.HasCheckConstraint("ck_flights_direction", "direction IN ('outbound', 'return', 'other')");
            t.HasCheckConstraint("ck_flights_order", "\"order\" >= 0");
        });
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).ValueGeneratedNever();
        builder.Property(f => f.Direction).HasMaxLength(10);
        builder.Property(f => f.Airline).HasMaxLength(TripValues.AirlineMax);
        builder.Property(f => f.FlightNumber).HasMaxLength(TripValues.FlightNumberMax);
        builder.Property(f => f.DepartureAirport).HasMaxLength(TripValues.AirportMax);
        builder.Property(f => f.ArrivalAirport).HasMaxLength(TripValues.AirportMax);
        // Local airport time without offset: PostgreSQL "timestamp without time zone".
        builder.Property(f => f.DepartureLocalTime).HasColumnType("timestamp without time zone");
        builder.Property(f => f.ArrivalLocalTime).HasColumnType("timestamp without time zone");
        builder.Property(f => f.DepartureTimeZone).HasMaxLength(TripValues.TimeZoneMax);
        builder.Property(f => f.ArrivalTimeZone).HasMaxLength(TripValues.TimeZoneMax);
        builder.Property(f => f.BookingCode).HasMaxLength(TripValues.BookingCodeMax);
        builder.Property(f => f.Seat).HasMaxLength(TripValues.SeatMax);
        builder.Property(f => f.Terminal).HasMaxLength(TripValues.TerminalMax);
        builder.Property(f => f.Version).IsConcurrencyToken();
        builder.HasOne<Trip>().WithMany().HasForeignKey(f => f.TripId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(f => new { f.TripId, f.Order });
    }
}
