using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// GDPR: every <see cref="AccountOptions.PurgeIntervalMinutes"/> minutes, erases the accounts whose 30 days after
/// "Delete my account" are over (files first, then every row). Logs only ids, counts and timings.
/// </summary>
internal sealed partial class AccountPurgeJob(IServiceScopeFactory scopes, IOptions<AccountOptions> options, ILogger<AccountPurgeJob> logger)
    : BackgroundService
{
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(FirstRunDelay, stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, options.Value.PurgeIntervalMinutes)));
            do
            {
                await RunOnceAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The API is stopping.
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        var watch = Stopwatch.StartNew();
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var erased = await scope.ServiceProvider.GetRequiredService<AccountService>().PurgeDueAsync(ct);
            if (erased > 0) LogDone(erased, watch.ElapsedMilliseconds);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            LogFailed(ex.GetType().Name, watch.ElapsedMilliseconds);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Account purge erased {Count} accounts in {ElapsedMs} ms")]
    private partial void LogDone(int count, long elapsedMs);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Account purge failed ({ErrorType}) after {ElapsedMs} ms; it runs again later")]
    private partial void LogFailed(string errorType, long elapsedMs);
}
