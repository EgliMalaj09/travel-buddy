using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Media;

/// <summary>Table "media". Links to trips and users are in Data/FeatureLinks.cs (structure rule 2).</summary>
internal sealed class MediaItemConfiguration : IEntityTypeConfiguration<MediaItem>
{
    public void Configure(EntityTypeBuilder<MediaItem> builder)
    {
        builder.ToTable("media", t =>
        {
            t.HasCheckConstraint("ck_media_media_type", "media_type IN ('photo', 'video')");
            t.HasCheckConstraint("ck_media_purpose", "purpose IN ('trip_photo', 'avatar')");
            t.HasCheckConstraint("ck_media_trip", "purpose <> 'trip_photo' OR trip_id IS NOT NULL");
            t.HasCheckConstraint("ck_media_scope", "scope IN ('shared', 'personal')");
            t.HasCheckConstraint("ck_media_source", "source IN ('camera', 'library', 'autocapture')");
            t.HasCheckConstraint("ck_media_quality_tier", "quality_tier IN ('compressed', 'full')");
            t.HasCheckConstraint("ck_media_size", $"width BETWEEN 1 AND {MediaValues.SideMax} AND height BETWEEN 1 AND {MediaValues.SideMax}");
            t.HasCheckConstraint("ck_media_content_hash", "content_hash ~ '^[0-9a-f]{64}$'");
            t.HasCheckConstraint("ck_media_country_code", "country_code IS NULL OR country_code ~ '^[A-Z]{2}$'");
            t.HasCheckConstraint("ck_media_position", "(lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))");
        });
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).ValueGeneratedNever();
        builder.Property(m => m.MediaType).HasMaxLength(10);
        builder.Property(m => m.Purpose).HasMaxLength(12);
        builder.Property(m => m.Scope).HasMaxLength(10);
        builder.Property(m => m.Source).HasMaxLength(12);
        builder.Property(m => m.Caption).HasMaxLength(MediaValues.CaptionMax);
        builder.Property(m => m.CountryCode).HasMaxLength(2).IsFixedLength();
        builder.Property(m => m.MimeType).HasMaxLength(40);
        builder.Property(m => m.ContentHash).HasMaxLength(64);
        builder.Property(m => m.QualityTier).HasMaxLength(10);
        builder.Property(m => m.FileKey).HasMaxLength(100);
        builder.Property(m => m.ThumbnailKey).HasMaxLength(100);
        builder.Property(m => m.IncludeInVideo).HasDefaultValue(true);
        builder.Property(m => m.Version).IsConcurrencyToken();
        // The same photo only once per trip and person (deleted ones do not count).
        builder.HasIndex(m => new { m.TripId, m.OwnerUserId, m.ContentHash }).IsUnique().HasFilter("deleted_at IS NULL");
        builder.HasIndex(m => m.OwnerUserId);
        // For the cleanup job (deleted more than 30 days ago).
        builder.HasIndex(m => m.DeletedAt).HasFilter("deleted_at IS NOT NULL");
    }
}
