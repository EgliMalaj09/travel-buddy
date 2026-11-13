using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Expenses;
using TravelApp.Api.Features.Media;
using TravelApp.Api.Features.Places;
using TravelApp.Api.Features.Checklist;
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

internal sealed class PlaceLinks : IEntityTypeConfiguration<Place>
{
    // A place of a trip goes with the trip, and a user's places with the account (only when rows are really removed;
    // a normal delete is a soft delete, see ITripDeleteHook).
    public void Configure(EntityTypeBuilder<Place> builder)
    {
        builder.HasOne<Trip>().WithMany().HasForeignKey(p => p.TripId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ChecklistTripLink : IEntityTypeConfiguration<ChecklistItem>
{
    // A trip's checklist goes with it when the trip row is finally removed.
    public void Configure(EntityTypeBuilder<ChecklistItem> builder) =>
        builder.HasOne<Trip>().WithMany().HasForeignKey(i => i.TripId).OnDelete(DeleteBehavior.Cascade);
}

internal sealed class ExpenseLinks : IEntityTypeConfiguration<Expense>
{
    // An expense goes with its trip, and a user's expenses with the account (only when rows are really removed;
    // a normal delete is a soft delete, see ITripDeleteHook).
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.HasOne<Trip>().WithMany().HasForeignKey(e => e.TripId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MediaLinks : IEntityTypeConfiguration<MediaItem>
{
    // A trip's photo records go with the trip, and a user's with the account, only when rows are really removed.
    // A normal delete is a soft delete (ITripDeleteHook); the cleanup job removes the files and then the rows.
    // Account deletion (KAN-22) must delete the user's files in Blob Storage before the rows cascade away.
    public void Configure(EntityTypeBuilder<MediaItem> builder)
    {
        builder.HasOne<Trip>().WithMany().HasForeignKey(m => m.TripId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(m => m.OwnerUserId).OnDelete(DeleteBehavior.Cascade);
    }
}
