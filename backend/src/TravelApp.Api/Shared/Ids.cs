namespace TravelApp.Api.Shared;

/// <summary>Server-created ids (e.g. User.id). Same format as phone-created ids: UUID v7.</summary>
public static class Ids
{
    public static Guid New() => Guid.CreateVersion7();
}
