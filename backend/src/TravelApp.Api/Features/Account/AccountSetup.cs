using System.Threading.RateLimiting;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Account;

/// <summary>
/// Profile, settings, data export and account deletion (KAN-22, configuration section "Account").
/// Settings sync like other records (<see cref="UserSettingsSyncTable"/>); the purge job erases accounts after 30 days.
/// </summary>
public static class AccountSetup
{
    public const string ExportRateLimitPolicy = "account-export";

    public static IServiceCollection AddAccountFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<AccountOptions>().Bind(configuration.GetSection(AccountOptions.Section));
        services.AddScoped<AccountService>();
        services.AddScoped<IAccountAdmin>(sp => sp.GetRequiredService<AccountService>());
        services.AddScoped<ISyncTable, UserSettingsSyncTable>();
        services.AddScoped<IUserData, SettingsUserData>();
        services.AddHostedService<AccountPurgeJob>();

        var perHour = configuration.GetValue<int?>($"{AccountOptions.Section}:{nameof(AccountOptions.ExportsPerHourPerUser)}") ?? 5;
        services.AddRateLimiter(o => o.AddPolicy(ExportRateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
            http.User.Identity?.IsAuthenticated == true ? http.User.UserId().ToString() : "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = perHour, Window = TimeSpan.FromHours(1) })));
        return services;
    }
}
