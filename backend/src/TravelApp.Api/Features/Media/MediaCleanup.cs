using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// GDPR: every <see cref="MediaOptions.CleanupIntervalMinutes"/> minutes, removes the files and rows of photos deleted
/// more than <see cref="MediaOptions.CleanupAfterDays"/> days ago (also photos of deleted trips, which the trip
/// delete hook marks deleted). Logs only counts and timings.
/// </summary>
internal sealed partial class MediaCleanup(IServiceScopeFactory scopes, IOptions<MediaOptions> options, ILogger<MediaCleanup> logger)
    : BackgroundService
{
    /// <summary>Lets the API start up before the first run.</summary>
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(FirstRunDelay, stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, options.Value.CleanupIntervalMinutes)));
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
            var removed = await scope.ServiceProvider.GetRequiredService<MediaService>().CleanupAsync(ct);
            LogDone(removed, watch.ElapsedMilliseconds);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Only the error type: messages can contain data.
            LogFailed(ex.GetType().Name, watch.ElapsedMilliseconds);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Media cleanup removed {Count} deleted photos in {ElapsedMs} ms")]
    private partial void LogDone(int count, long elapsedMs);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Media cleanup failed ({ErrorType}) after {ElapsedMs} ms; it runs again later")]
    private partial void LogFailed(string errorType, long elapsedMs);
}
