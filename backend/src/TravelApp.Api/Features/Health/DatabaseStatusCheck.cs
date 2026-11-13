using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Health;

/// <summary>The database for the status page (KAN-55).</summary>
internal sealed class DatabaseStatusCheck(AppDbContext db, IHostEnvironment environment) : IServiceStatusCheck
{
    public async Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var watch = Stopwatch.StartNew();
        var ok = await db.Database.CanConnectAsync(ct);
        return new("database", "PostgreSQL", "All records", ok ? ServiceStates.Ok : ServiceStates.Down, (int)watch.ElapsedMilliseconds,
            environment.IsDevelopment() ? "PostgreSQL 17 in Docker on this computer" : "Azure Database for PostgreSQL, EU",
            "Beta: Azure Database for PostgreSQL (EU), backups on", ok ? null : "Not reachable");
    }
}
