using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Auth;

/// <summary>Table "refresh_tokens".</summary>
internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();
        builder.Property(t => t.DeviceId).HasMaxLength(AuthLimits.DeviceIdMax);
        builder.Property(t => t.TokenHash).HasMaxLength(64).IsFixedLength();
        builder.HasIndex(t => t.TokenHash).IsUnique();
        // Two refreshes with the same token at the same moment: only one wins.
        builder.Property(t => t.ReplacedByTokenId).IsConcurrencyToken();
        builder.HasIndex(t => new { t.UserId, t.DeviceId });
        builder.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
