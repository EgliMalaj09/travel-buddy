using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Table "users" (our User is the Identity user) and Identity's own tables, renamed from
/// "AspNet…" to plain snake_case names.
/// </summary>
internal sealed class UserConfiguration :
    IEntityTypeConfiguration<User>,
    IEntityTypeConfiguration<IdentityUserLogin<Guid>>,
    IEntityTypeConfiguration<IdentityUserClaim<Guid>>,
    IEntityTypeConfiguration<IdentityUserToken<Guid>>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", t =>
            t.HasCheckConstraint("ck_users_status", "status IN ('active', 'deletion_requested')"));
        builder.Property(u => u.Id).ValueGeneratedNever();
        builder.Property(u => u.FirstName).HasMaxLength(AuthLimits.FirstNameMax);
        builder.Property(u => u.LastName).HasMaxLength(AuthLimits.FirstNameMax);
        builder.Property(u => u.DisplayName).HasMaxLength(AuthLimits.FirstNameMax);
        builder.Property(u => u.SuggestedFirstName).HasMaxLength(AuthLimits.FirstNameMax);
        builder.Property(u => u.PassportCountry).HasMaxLength(2).IsFixedLength();
        builder.Property(u => u.ResidenceCountry).HasMaxLength(2).IsFixedLength();
        builder.Property(u => u.HomeCurrency).HasMaxLength(3).IsFixedLength();
        builder.Property(u => u.Language).HasMaxLength(10);
        builder.Property(u => u.TimeZone).HasMaxLength(64);
        builder.Property(u => u.TermsVersion).HasMaxLength(20);
        builder.Property(u => u.SuspensionReason).HasMaxLength(20);
        builder.Property(u => u.PrivacyVersion).HasMaxLength(20);
        builder.Property(u => u.Status).HasMaxLength(20);
        builder.Property(u => u.Version).IsConcurrencyToken();
        // Same email = one account (L3). Identity's default email index is not unique.
        builder.HasIndex(u => u.NormalizedEmail).HasDatabaseName("ix_users_normalized_email").IsUnique();
        builder.HasIndex(u => u.UpdatedAt);
        // The purge job looks for accounts whose 30 days are over.
        builder.HasIndex(u => u.DeleteAfter).HasFilter("delete_after IS NOT NULL");
    }

    public void Configure(EntityTypeBuilder<IdentityUserLogin<Guid>> builder) => builder.ToTable("user_logins");

    public void Configure(EntityTypeBuilder<IdentityUserClaim<Guid>> builder) => builder.ToTable("user_claims");

    public void Configure(EntityTypeBuilder<IdentityUserToken<Guid>> builder) => builder.ToTable("user_tokens");
}
