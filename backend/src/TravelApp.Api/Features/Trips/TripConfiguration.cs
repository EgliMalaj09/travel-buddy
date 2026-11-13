using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Trips;

/// <summary>Table "trips". The database also refuses impossible rows, whatever writes them.</summary>
internal sealed class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.ToTable("trips", t =>
        {
            t.HasCheckConstraint("ck_trips_type", "type IN ('solo', 'shared')");
            t.HasCheckConstraint("ck_trips_status", "status IN ('planned', 'finished')");
            t.HasCheckConstraint("ck_trips_rating", "rating IS NULL OR rating BETWEEN 1 AND 5");
            t.HasCheckConstraint("ck_trips_dates", "(start_date IS NULL) = (end_date IS NULL) AND (end_date IS NULL OR end_date >= start_date)");
        });
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.Name).HasMaxLength(TripValues.NameMax);
        builder.Property(t => t.Type).HasMaxLength(10);
        builder.Property(t => t.Status).HasMaxLength(10);
        builder.Property(t => t.PassportCountrySnapshot).HasMaxLength(2).IsFixedLength();
        builder.Property(t => t.HomeCurrencySnapshot).HasMaxLength(3).IsFixedLength();
        builder.Property(t => t.ChecklistRulesVersion).HasMaxLength(20);
        builder.Property(t => t.FinishNote).HasMaxLength(TripValues.FinishNoteMax);
        builder.Property(t => t.Version).IsConcurrencyToken();
        // Foreign key owner_id → users.id: see Data/FeatureLinks.cs.
        builder.HasIndex(t => t.OwnerId);
        builder.HasIndex(t => t.UpdatedAt);
    }
}
