using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.AppConfig;

internal sealed class AppConfigRowConfiguration : IEntityTypeConfiguration<AppConfigRow>
{
    public void Configure(EntityTypeBuilder<AppConfigRow> builder)
    {
        builder.ToTable("app_config", t => t.HasCheckConstraint("ck_app_config_singleton", "id = 1"));
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.MinAppVersion).HasMaxLength(20);
        builder.Property(c => c.Version).IsConcurrencyToken();
        Json(builder.Property(c => c.PhotoQualityByPlan));
        Json(builder.Property(c => c.FeatureFlags));
        builder.HasData(new AppConfigRow { UpdatedAt = new DateTimeOffset(2026, 11, 13, 0, 0, 0, TimeSpan.Zero) });
    }

    private static void Json<T>(PropertyBuilder<Dictionary<string, T>> property) => property
        .HasColumnType("jsonb")
        .HasConversion(
            v => JsonSerializer.Serialize(v, JsonSerializerOptions.Web),
            v => JsonSerializer.Deserialize<Dictionary<string, T>>(v, JsonSerializerOptions.Web) ?? new Dictionary<string, T>(),
            new ValueComparer<Dictionary<string, T>>(
                (a, b) => JsonSerializer.Serialize(a, JsonSerializerOptions.Web) == JsonSerializer.Serialize(b, JsonSerializerOptions.Web),
                v => JsonSerializer.Serialize(v, JsonSerializerOptions.Web).GetHashCode(StringComparison.Ordinal),
                v => new Dictionary<string, T>(v)));
}
