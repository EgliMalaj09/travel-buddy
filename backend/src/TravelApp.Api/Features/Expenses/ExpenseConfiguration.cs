using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Expenses;

/// <summary>Table "expenses". Links to trips and users are in Data/FeatureLinks.cs (structure rule 2).</summary>
internal sealed class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("expenses", t =>
        {
            t.HasCheckConstraint("ck_expenses_scope", "scope IN ('shared', 'personal')");
            t.HasCheckConstraint("ck_expenses_category", "category IN ('food', 'transport', 'stay', 'activities', 'shopping', 'other')");
            t.HasCheckConstraint("ck_expenses_amount", $"amount_minor > 0 AND amount_minor <= {ExpenseValues.AmountMinorMax}");
            t.HasCheckConstraint("ck_expenses_currency", "currency ~ '^[A-Z]{3}$'");
            t.HasCheckConstraint("ck_expenses_owner", "(scope = 'personal') = (owner_user_id IS NOT NULL)");
        });
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Scope).HasMaxLength(10);
        builder.Property(e => e.Title).HasMaxLength(ExpenseValues.TitleMax);
        builder.Property(e => e.Category).HasMaxLength(12);
        builder.Property(e => e.Currency).HasMaxLength(3).IsFixedLength();
        builder.Property(e => e.Note).HasMaxLength(ExpenseValues.NoteMax);
        builder.Property(e => e.Version).IsConcurrencyToken();
        builder.HasIndex(e => new { e.TripId, e.SpentAt });
        builder.HasIndex(e => e.CreatedByUserId);
    }
}
