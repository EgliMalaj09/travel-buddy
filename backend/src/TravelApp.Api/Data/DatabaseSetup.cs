using Microsoft.EntityFrameworkCore;

namespace TravelApp.Api.Data;

public static class DatabaseSetup
{
    /// <summary>
    /// PostgreSQL with snake_case names: data-model field "tripId" becomes column "trip_id".
    /// Connection string "Database" comes from configuration (appsettings.Development.json locally,
    /// environment settings in Azure; never real secrets in the repository).
    /// </summary>
    public static IServiceCollection AddTravelAppDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options => options
            .UseNpgsql(configuration.GetConnectionString("Database"))
            .UseSnakeCaseNamingConvention());

        // Beta (KAN-61): with "Database:MigrateOnStart" true the API brings the tables up to date when it starts,
        // so nobody has to run "dotnet ef database update" against the server. Off by default (local development
        // uses the start script). Runs after the beta settings check, before the first request is served.
        // The beta runs one copy of the API, so two copies never migrate at once.
        if (configuration.GetValue<bool>("Database:MigrateOnStart")) services.AddHostedService<MigrateOnStart>();
        return services;
    }
}

internal sealed class MigrateOnStart(IServiceProvider services) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
