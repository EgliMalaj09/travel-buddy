using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Weather;

/// <summary>Table "weather_cache": one row per kind, rounded position and day.</summary>
internal sealed class WeatherCacheEntryConfiguration : IEntityTypeConfiguration<WeatherCacheEntry>
{
    public void Configure(EntityTypeBuilder<WeatherCacheEntry> builder)
    {
        builder.ToTable("weather_cache", t =>
        {
            t.HasCheckConstraint("ck_weather_cache_kind", "kind IN ('forecast', 'typical')");
            t.HasCheckConstraint("ck_weather_cache_position", "lat10 BETWEEN -900 AND 900 AND lng10 BETWEEN -1800 AND 1800");
            t.HasCheckConstraint("ck_weather_cache_chance", "precipitation_chance IS NULL OR precipitation_chance BETWEEN 0 AND 100");
        });
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).ValueGeneratedNever();
        builder.Property(w => w.Kind).HasMaxLength(10);
        builder.HasIndex(w => new { w.Kind, w.Lat10, w.Lng10, w.Date }).IsUnique();
        builder.HasIndex(w => w.FetchedAt);
    }
}
