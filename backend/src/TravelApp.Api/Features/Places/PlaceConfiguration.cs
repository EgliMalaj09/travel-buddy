using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Places;

/// <summary>Table "places". Links to trips and users are in Data/FeatureLinks.cs (structure rule 2).</summary>
internal sealed class PlaceConfiguration : IEntityTypeConfiguration<Place>
{
    public void Configure(EntityTypeBuilder<Place> builder)
    {
        builder.ToTable("places", t =>
        {
            t.HasCheckConstraint("ck_places_scope", "scope IN ('shared', 'personal')");
            t.HasCheckConstraint("ck_places_status", "status IN ('bucket', 'planned', 'visited')");
            t.HasCheckConstraint("ck_places_category", "category IN ('food', 'sight', 'stay', 'transport', 'other')");
            t.HasCheckConstraint("ck_places_source", "source IN ('manual', 'autocapture')");
            // Bucket list = no trip; planned or visited = on a trip.
            t.HasCheckConstraint("ck_places_bucket_trip", "(status = 'bucket') = (trip_id IS NULL)");
            t.HasCheckConstraint("ck_places_position", "(lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))");
        });
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();
        builder.Property(p => p.Scope).HasMaxLength(10);
        builder.Property(p => p.Status).HasMaxLength(10);
        builder.Property(p => p.Title).HasMaxLength(PlaceValues.TitleMax);
        builder.Property(p => p.Note).HasMaxLength(PlaceValues.NoteMax);
        builder.Property(p => p.CountryCode).HasMaxLength(2).IsFixedLength();
        builder.Property(p => p.CityName).HasMaxLength(PlaceValues.CityNameMax);
        builder.Property(p => p.Address).HasMaxLength(PlaceValues.AddressMax);
        builder.Property(p => p.GeoProviderId).HasMaxLength(PlaceValues.GeoProviderIdMax);
        builder.Property(p => p.Category).HasMaxLength(10);
        builder.Property(p => p.Source).HasMaxLength(12);
        builder.Property(p => p.Version).IsConcurrencyToken();
        builder.HasIndex(p => new { p.TripId, p.PlannedDate });
        builder.HasIndex(p => p.CreatedByUserId);
    }
}
