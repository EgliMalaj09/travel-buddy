using Microsoft.EntityFrameworkCore;

namespace TravelApp.Api.Data;

/// <summary>
/// The one database context. Each feature configures its own tables with
/// IEntityTypeConfiguration&lt;T&gt; inside its folder (structure rule 7); they are applied here automatically.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
