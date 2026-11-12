using TravelApp.Api.Data;

namespace TravelApp.Api.Features.Sync;

/// <summary>
/// Applies the phone's waiting changes in order. Each change is saved on its own, so one rejected change
/// (it breaks a rule) does not stop the others. The feature that owns the table does the real work (<see cref="ISyncTable"/>).
/// </summary>
internal sealed class SyncService(IEnumerable<ISyncTable> tables, AppDbContext db)
{
    private readonly Dictionary<string, ISyncTable> _byType = tables
        .SelectMany(t => t.Types.Select(type => (type, t)))
        .ToDictionary(x => x.type, x => x.t, StringComparer.Ordinal);

    public async Task<SyncUploadResponse> UploadAsync(Guid userId, SyncUploadRequest request, CancellationToken ct)
    {
        var results = new List<SyncChangeResult>(request.Changes.Count);
        foreach (var change in request.Changes)
        {
            var problems = await ApplyAsync(userId, change, ct);
            results.Add(problems.Count == 0
                ? new SyncChangeResult(change.Id, change.Type, SyncLimits.Ok)
                : new SyncChangeResult(change.Id, change.Type, SyncLimits.Rejected, problems));
            // A rejected change may leave half-made rows in memory: start the next one clean.
            db.ChangeTracker.Clear();
        }
        return new SyncUploadResponse(results);
    }

    private async Task<IReadOnlyDictionary<string, string[]>> ApplyAsync(Guid userId, SyncChange change, CancellationToken ct)
    {
        if (!_byType.TryGetValue(change.Type, out var table))
            return new Dictionary<string, string[]> { ["type"] = [$"Unknown table \"{change.Type}\"."] };
        if (change.Op != SyncLimits.Delete && (change.Data is null || change.Data.Count == 0))
            return new Dictionary<string, string[]> { ["data"] = ["PUT and PATCH need the columns to write."] };
        var data = new SyncData(change.Data ?? []);
        return await table.ApplyAsync(new SyncWrite(userId, change.Op, change.Type, change.Id, data), ct);
    }
}
