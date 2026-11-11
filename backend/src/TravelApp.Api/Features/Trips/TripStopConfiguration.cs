using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Trips;

/// <summary>Table "trip_stops".</summary>
internal sealed class TripStopConfiguration : IEntityTypeConfiguration<TripStop>
{
    public void Configure(EntityTypeBuilder<TripStop> builder)
    {
        builder.ToTable("trip_stops", t =>
        {
            t.HasCheckConstraint("ck_trip_stops_nights", "nights >= 0");
            t.HasCheckConstraint("ck_trip_stops_order", "\"order\" >= 0");
            t.HasCheckConstraint("ck_trip_stops_position", "(lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))");
        });
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.CountryCode).HasMaxLength(2).IsFixedLength();
        builder.Property(s => s.CityName).HasMaxLength(TripValues.CityNameMax);
        builder.Property(s => s.GeoProviderId).HasMaxLength(200);
        builder.Property(s => s.Version).IsConcurrencyToken();
        builder.HasOne<Trip>().WithMany().HasForeignKey(s => s.TripId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(s => new { s.TripId, s.Order });
    }
}
