using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Auth;

/// <summary>Table "auth_codes". Old rows are harmless (expired); a cleanup job can remove them later.</summary>
internal sealed class AuthCodeConfiguration : IEntityTypeConfiguration<AuthCode>
{
    public void Configure(EntityTypeBuilder<AuthCode> builder)
    {
        builder.ToTable("auth_codes", t =>
            t.HasCheckConstraint("ck_auth_codes_purpose", "purpose IN ('signup', 'login', 'reset')"));
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever();
        builder.Property(c => c.Email).HasMaxLength(AuthLimits.EmailMax);
        builder.Property(c => c.Purpose).HasMaxLength(10);
        builder.Property(c => c.CodeHash).HasMaxLength(64).IsFixedLength();
        builder.HasIndex(c => new { c.Email, c.CreatedAt });
    }
}
