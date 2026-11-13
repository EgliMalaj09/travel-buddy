using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace TravelApp.Api.Features.Fx;

/// <summary>Table "fx_rates": one row per day and currency.</summary>
internal sealed class FxRateConfiguration : IEntityTypeConfiguration<FxRate>
{
    public void Configure(EntityTypeBuilder<FxRate> builder)
    {
        builder.ToTable("fx_rates", t =>
        {
            t.HasCheckConstraint("ck_fx_rates_currency", "currency ~ '^[A-Z]{3}$'");
            t.HasCheckConstraint("ck_fx_rates_rate", "rate_to_eur > 0");
        });
        builder.HasKey(r => new { r.Date, r.Currency });
        builder.Property(r => r.Currency).HasMaxLength(3).IsFixedLength();
        builder.Property(r => r.RateToEur).HasPrecision(28, 12);
    }
}
