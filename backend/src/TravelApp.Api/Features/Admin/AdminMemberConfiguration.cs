using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Admin;

internal sealed class AdminMemberConfiguration : IEntityTypeConfiguration<AdminMember>
{
    public void Configure(EntityTypeBuilder<AdminMember> builder)
    {
        builder.ToTable("admin_members");
        builder.HasKey(m => m.UserId);
        builder.Property(m => m.Role).HasMaxLength(10);
        builder.Property(m => m.TotpSecret).HasMaxLength(200);
    }
}

internal sealed class AdminAuditEntryConfiguration : IEntityTypeConfiguration<AdminAuditEntry>
{
    public void Configure(EntityTypeBuilder<AdminAuditEntry> builder)
    {
        builder.ToTable("admin_audit");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Action).HasMaxLength(40);
        builder.Property(e => e.TargetType).HasMaxLength(20);
        builder.Property(e => e.TargetId).HasMaxLength(64);
        builder.Property(e => e.Details).HasMaxLength(500);
        builder.HasIndex(e => e.At);
    }
}
