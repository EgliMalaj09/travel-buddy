using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Account;

/// <summary>Table "user_settings". The foreign key to the user (cascade on erase) is in Data/FeatureLinks.cs.</summary>
internal sealed class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.ToTable(UserSettingsValues.Table, t =>
        {
            t.HasCheckConstraint("ck_user_settings_distance_unit", "distance_unit IN ('km', 'mi')");
            t.HasCheckConstraint("ck_user_settings_temperature_unit", "temperature_unit IN ('C', 'F')");
            t.HasCheckConstraint("ck_user_settings_default_place_scope", "default_place_scope IN ('shared', 'personal')");
            t.HasCheckConstraint("ck_user_settings_times",
                "reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'");
        });
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.ReminderTime).HasMaxLength(5);
        builder.Property(s => s.QuietHoursStart).HasMaxLength(5);
        builder.Property(s => s.QuietHoursEnd).HasMaxLength(5);
        builder.Property(s => s.DistanceUnit).HasMaxLength(2);
        builder.Property(s => s.TemperatureUnit).HasMaxLength(1);
        builder.Property(s => s.DefaultPlaceScope).HasMaxLength(10);
        builder.Property(s => s.Version).IsConcurrencyToken();
    }
}
