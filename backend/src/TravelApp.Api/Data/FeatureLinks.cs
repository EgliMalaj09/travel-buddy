using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Data;

/// <summary>
/// Foreign keys between tables of different features. They live here, in the database wiring,
/// so features never reach into each other's entities (structure rule 2).
/// </summary>
internal sealed class TripOwnerLink : IEntityTypeConfiguration<Trip>
{
    // A user's trips go when the account is finally removed (account deletion, KAN-22).
    public void Configure(EntityTypeBuilder<Trip> builder) =>
        builder.HasOne<User>().WithMany().HasForeignKey(t => t.OwnerId).OnDelete(DeleteBehavior.Cascade);
}
