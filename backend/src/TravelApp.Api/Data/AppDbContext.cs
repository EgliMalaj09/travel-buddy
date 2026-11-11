using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Data;

/// <summary>
/// The one database context. Each feature configures its own tables with
/// IEntityTypeConfiguration&lt;T&gt; inside its folder (structure rule 7); they are applied here automatically.
/// It is also ASP.NET Core Identity's store, with our User as the Identity user (A3).
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityUserContext<User, Guid>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
