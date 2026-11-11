namespace TravelApp.Api.Shared;

/// <summary>
/// Base for every synced record (decisions/data-model.md, "Rules for every entity").
/// Ids are UUID v7 created on the phone (except User.id, created by the server).
/// </summary>
public abstract class SyncEntity
{
    public Guid Id { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Soft delete: set instead of removing the row, so the delete can sync.</summary>
    public DateTimeOffset? DeletedAt { get; set; }

    public long Version { get; set; }
}
