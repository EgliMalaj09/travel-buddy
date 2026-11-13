using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Checklist;

/// <summary>Table "checklist_items". The database also refuses impossible rows, whatever writes them.</summary>
internal sealed class ChecklistItemConfiguration : IEntityTypeConfiguration<ChecklistItem>
{
    public void Configure(EntityTypeBuilder<ChecklistItem> builder)
    {
        builder.ToTable("checklist_items", t =>
        {
            t.HasCheckConstraint("ck_checklist_items_type", "type IN ('task', 'packing')");
            t.HasCheckConstraint("ck_checklist_items_category",
                "(type = 'task' AND category IN ('documents', 'money', 'health', 'phone', 'transport', 'stay', 'other'))"
                + " OR (type = 'packing' AND category IN ('clothes', 'toiletries', 'tech', 'documents', 'other'))");
            t.HasCheckConstraint("ck_checklist_items_reason", "reason IN ('rule', 'weather', 'activity', 'user')");
            t.HasCheckConstraint("ck_checklist_items_source", "source IN ('auto', 'user')");
            t.HasCheckConstraint("ck_checklist_items_quantity", "quantity IS NULL OR (type = 'packing' AND quantity BETWEEN 1 AND 99)");
        });
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).ValueGeneratedNever();
        builder.Property(i => i.Type).HasMaxLength(10);
        builder.Property(i => i.Title).HasMaxLength(ChecklistValues.TitleMax);
        builder.Property(i => i.Notes).HasMaxLength(ChecklistValues.NotesMax);
        builder.Property(i => i.Category).HasMaxLength(20);
        builder.Property(i => i.Reason).HasMaxLength(10);
        builder.Property(i => i.Source).HasMaxLength(10);
        builder.Property(i => i.RuleId).HasMaxLength(ChecklistValues.RuleIdMax);
        builder.Property(i => i.SourceUrl).HasMaxLength(ChecklistValues.SourceUrlMax);
        builder.Property(i => i.Version).IsConcurrencyToken();
        // Foreign key trip_id → trips.id: see Data/FeatureLinks.cs.
        builder.HasIndex(i => new { i.TripId, i.SortOrder });
    }
}
