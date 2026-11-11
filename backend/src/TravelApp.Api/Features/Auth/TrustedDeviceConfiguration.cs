using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Auth;

/// <summary>Table "trusted_devices": one row per user and phone.</summary>
internal sealed class TrustedDeviceConfiguration : IEntityTypeConfiguration<TrustedDevice>
{
    public void Configure(EntityTypeBuilder<TrustedDevice> builder)
    {
        builder.ToTable("trusted_devices");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).ValueGeneratedNever();
        builder.Property(d => d.DeviceId).HasMaxLength(AuthLimits.DeviceIdMax);
        builder.Property(d => d.Name).HasMaxLength(AuthLimits.DeviceNameMax);
        builder.HasIndex(d => new { d.UserId, d.DeviceId }).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
