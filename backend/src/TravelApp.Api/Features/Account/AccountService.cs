using System.Diagnostics;
using System.Text.Json;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// "Download my data" and the final erase (KAN-22). Both ask every feature through <see cref="IUserData"/>, so a new
/// feature with user data only has to register one more <see cref="IUserData"/> to be exported and erased.
/// </summary>
internal sealed partial class AccountService(IEnumerable<IUserData> parts, IAccountsToPurge accounts, TimeProvider clock, ILogger<AccountService> logger)
    : IAccountAdmin
{
    public const int ExportFormatVersion = 1;

    public async Task<AccountExportResponse> ExportAsync(Guid userId, CancellationToken ct)
    {
        var data = new SortedDictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var part in parts)
        {
            foreach (var (name, value) in await part.ExportAsync(userId, ct))
            {
                data.Add(name, JsonSerializer.SerializeToElement(value, value.GetType(), JsonSerializerOptions.Web));
            }
        }
        return new AccountExportResponse(clock.GetUtcNow(), ExportFormatVersion, data);
    }

    /// <summary>Erases one account for good: each feature in <see cref="IUserData.PurgeOrder"/>, the user row last.</summary>
    public async Task PurgeAsync(Guid userId, CancellationToken ct)
    {
        foreach (var part in parts.OrderBy(p => p.PurgeOrder))
        {
            await part.PurgeAsync(userId, ct);
        }
    }

    public async Task EraseNowAsync(Guid userId, CancellationToken ct)
    {
        var watch = Stopwatch.StartNew();
        await PurgeAsync(userId, ct);
        LogPurged(userId, watch.ElapsedMilliseconds);
    }

    /// <summary>Erases every account whose waiting time is over. Returns how many were erased.</summary>
    public async Task<int> PurgeDueAsync(CancellationToken ct)
    {
        var done = 0;
        foreach (var userId in await accounts.DueAsync(clock.GetUtcNow(), 50, ct))
        {
            var watch = Stopwatch.StartNew();
            try
            {
                await PurgeAsync(userId, ct);
                done++;
                LogPurged(userId, watch.ElapsedMilliseconds);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Only the error type: messages can contain data. The account stays locked and is tried again next run.
                LogPurgeFailed(userId, ex.GetType().Name);
            }
        }
        return done;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Account {UserId} erased in {ElapsedMs} ms")]
    private partial void LogPurged(Guid userId, long elapsedMs);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Erasing account {UserId} failed ({ErrorType}); it is tried again later")]
    private partial void LogPurgeFailed(Guid userId, string errorType);
}
