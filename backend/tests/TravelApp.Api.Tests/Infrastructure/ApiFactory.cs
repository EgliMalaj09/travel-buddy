using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Auth;

[assembly: AssemblyFixture(typeof(TravelApp.Api.Tests.Infrastructure.ApiFactory))]

namespace TravelApp.Api.Tests.Infrastructure;

/// <summary>
/// Starts a real PostgreSQL 17 in Docker (Testcontainers) and the API against it, once for all tests.
/// Applies the EF Core migrations, so tests see the real tables. Needs Docker running.
/// Emails, Google/Apple and the leaked-password service are replaced by fakes.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public CapturingEmailSender Emails { get; } = new();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Database", _postgres.GetConnectionString());
        builder.UseSetting("Auth:SigningKeyPem", SigningKeys.NewKeyPem());
        builder.UseSetting("Auth:RequestsPerMinutePerIp", "100000");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IAuthEmailSender>();
            services.AddSingleton<IAuthEmailSender>(Emails);
            services.RemoveAll<IExternalTokenValidator>();
            services.AddSingleton<IExternalTokenValidator, FakeExternalTokenValidator>();
            services.RemoveAll<ILeakedPasswordCheck>();
            services.AddSingleton<ILeakedPasswordCheck, FakeLeakedPasswordCheck>();
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}

/// <summary>Keeps the last code sent to each email, so tests can "read the email".</summary>
public sealed class CapturingEmailSender : IAuthEmailSender
{
    private readonly ConcurrentDictionary<string, string> _last = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, int> _count = new(StringComparer.OrdinalIgnoreCase);

    public Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct)
    {
        _last[$"{email}|{purpose}"] = code;
        _count.AddOrUpdate(email, 1, (_, n) => n + 1);
        return Task.CompletedTask;
    }

    public string? LastCode(string email, string purpose) => _last.GetValueOrDefault($"{email}|{purpose}");

    public int Count(string email) => _count.GetValueOrDefault(email);
}

/// <summary>ID tokens look like "google|subject|email|FirstName"; anything else is refused.</summary>
internal sealed class FakeExternalTokenValidator : IExternalTokenValidator
{
    public Task<ExternalIdentity?> ValidateAsync(string provider, string idToken, CancellationToken ct)
    {
        var parts = idToken.Split('|');
        return Task.FromResult(parts.Length == 4 && parts[0] == provider
            ? new ExternalIdentity(parts[1], parts[2], parts[3].Length == 0 ? null : parts[3])
            : null);
    }
}

/// <summary>Only "password123456" counts as leaked.</summary>
internal sealed class FakeLeakedPasswordCheck : ILeakedPasswordCheck
{
    public const string Leaked = "password123456";

    public Task<bool> IsLeakedAsync(string password, CancellationToken ct) => Task.FromResult(password == Leaked);
}
