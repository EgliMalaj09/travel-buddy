using System.Threading.RateLimiting;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Media;

/// <summary>
/// Photos and notes (KAN-40, configuration section "Media"). Records sync through POST /sync/upload
/// (<see cref="MediaSyncTable"/>) and PowerSync (stream "my_media"); files go through /media to Blob Storage.
/// </summary>
public static class MediaSetup
{
    public const string RateLimitPolicy = "media";

    public static IServiceCollection AddMediaFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<MediaOptions>().Bind(configuration.GetSection(MediaOptions.Section));
        services.AddScoped<MediaService>();
        services.AddScoped<ITripDeleteHook>(sp => sp.GetRequiredService<MediaService>());
        services.AddScoped<ISyncTable, MediaSyncTable>();
        services.AddSingleton<IMediaStorage, AzureBlobMediaStorage>();
        services.AddHostedService<MediaCleanup>();

        // GDPR core rule: Azure SDK logs can contain request addresses. Its own logging is off in AzureBlobMediaStorage;
        // this keeps anything that still reaches the log at warnings only.
        services.AddLogging(l => l.AddFilter("Azure", LogLevel.Warning));

        var perMinute = configuration.GetValue<int?>($"{MediaOptions.Section}:{nameof(MediaOptions.RequestsPerMinutePerUser)}") ?? 120;
        services.AddRateLimiter(o => o.AddPolicy(RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1) })));
        return services;
    }
}
