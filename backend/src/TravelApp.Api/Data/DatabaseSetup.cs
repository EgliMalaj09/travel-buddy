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
        return services;
    }
}
