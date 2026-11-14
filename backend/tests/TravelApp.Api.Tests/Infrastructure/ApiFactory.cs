using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Admin;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Fx;
using TravelApp.Api.Features.Geo;
using TravelApp.Api.Features.Media;
using TravelApp.Api.Features.Weather;
using TravelApp.Api.Tests.Features.Fx;
using TravelApp.Api.Tests.Features.Geo;
using TravelApp.Api.Tests.Features.Media;
using TravelApp.Api.Tests.Features.Weather;

[assembly: AssemblyFixture(typeof(TravelApp.Api.Tests.Infrastructure.ApiFactory))]

namespace TravelApp.Api.Tests.Infrastructure;

/// <summary>
/// Starts a real PostgreSQL 17 in Docker (Testcontainers) and the API against it, once for all tests.
/// Applies the EF Core migrations, so tests see the real tables. Needs Docker running.
/// Emails, Google/Apple, the leaked-password service, Open-Meteo, the Currency API, Photon and Blob Storage are replaced by fakes.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();

    /// <summary>Becomes the first back office owner on its first admin login (Admin:OwnerEmails).</summary>
    public const string AdminOwnerEmail = "owner-admin@example.com";

    public CapturingEmailSender Emails { get; } = new();

    public FakeOpenMeteo Weather { get; } = new();

    public FakeCurrencyApi Fx { get; } = new();

    public FakePhoton Geo { get; } = new();

    internal FakeMediaStorage MediaFiles { get; } = new();

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
        builder.UseSetting("Admin:OwnerEmails:0", AdminOwnerEmail);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IAuthEmailSender>();
            services.AddSingleton<IAuthEmailSender>(Emails);
            services.RemoveAll<IExternalTokenValidator>();
            services.AddSingleton<IExternalTokenValidator, FakeExternalTokenValidator>();
            services.RemoveAll<ILeakedPasswordCheck>();
            services.AddSingleton<ILeakedPasswordCheck, FakeLeakedPasswordCheck>();
            services.AddHttpClient<IWeatherProvider, OpenMeteoProvider>().ConfigurePrimaryHttpMessageHandler(() => Weather);
            services.AddHttpClient<IFxProvider, FreeCurrencyApiProvider>().ConfigurePrimaryHttpMessageHandler(() => Fx);
            services.AddHttpClient<IGeoProvider, PhotonProvider>().ConfigurePrimaryHttpMessageHandler(() => Geo);
            services.AddHttpClient(AdminStatusService.HttpClientName).ConfigurePrimaryHttpMessageHandler(() => new StatusStub());
            services.RemoveAll<IMediaStorage>();
            services.AddSingleton<IMediaStorage>(MediaFiles);
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

/// <summary>
/// ID tokens look like "google|subject|email|FirstName", with an optional "|nonceClaim" at the end
/// (the hashed nonce the real token would carry); anything else is refused. The token "unreachable"
/// acts as if the provider's key server is down.
/// </summary>
internal sealed class FakeExternalTokenValidator : IExternalTokenValidator
{
    public Task<ExternalIdentity?> ValidateAsync(string provider, string idToken, CancellationToken ct)
    {
        if (idToken == "unreachable")
        {
            throw new ExternalProviderUnavailableException(provider, new HttpRequestException("down"));
        }

        var parts = idToken.Split('|');
        return Task.FromResult(parts.Length is 4 or 5 && parts[0] == provider
            ? new ExternalIdentity(parts[1], parts[2], parts[3].Length == 0 ? null : parts[3], parts.Length == 5 ? parts[4] : null)
            : null);
    }
}

/// <summary>Only "password123456" counts as leaked.</summary>
internal sealed class FakeLeakedPasswordCheck : ILeakedPasswordCheck
{
    public const string Leaked = "password123456";

    public Task<bool> IsLeakedAsync(string password, CancellationToken ct) => Task.FromResult(password == Leaked);
}

/// <summary>Every outside service on the status page answers 200 (no real calls from tests).</summary>
internal sealed class StatusStub : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
}
