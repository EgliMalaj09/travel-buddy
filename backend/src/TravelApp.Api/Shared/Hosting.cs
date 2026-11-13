using Microsoft.AspNetCore.HttpOverrides;

namespace TravelApp.Api.Shared;

/// <summary>
/// Running on a real server (KAN-61): the address of the caller behind the hosting platform's front door, and a
/// check at start-up that the beta settings are there. Nothing here changes local development.
/// </summary>
public static class Hosting
{
    public const string Section = "Hosting";

    /// <summary>
    /// Azure Container Apps ends HTTPS in front of the API and passes the caller's address in X-Forwarded-For.
    /// With "Hosting:BehindProxy" true we read it (only the last hop, the one the platform added), so the
    /// per-address rate limits count real callers and not the platform.
    /// </summary>
    public static WebApplicationBuilder AddTravelAppHosting(this WebApplicationBuilder builder)
    {
        if (BehindProxy(builder.Configuration))
        {
            builder.Services.Configure<ForwardedHeadersOptions>(o =>
            {
                o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                o.ForwardLimit = 1;
                // The platform's own addresses are not known in advance; only its front door can reach the app.
                o.KnownIPNetworks.Clear();
                o.KnownProxies.Clear();
            });
        }

        // Checked when the server starts. Skipped while the build makes the OpenAPI file (GetDocument.Insider runs
        // the app outside Development with no settings).
        var makingOpenApiFile = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";
        if (!builder.Environment.IsDevelopment() && !makingOpenApiFile) builder.Services.AddHostedService<BetaSettingsCheck>();
        return builder;
    }

    public static WebApplication UseTravelAppHosting(this WebApplication app)
    {
        if (BehindProxy(app.Configuration)) app.UseForwardedHeaders();
        return app;
    }

    /// <summary>
    /// Settings that must be set outside Development (switch list in decisions/releases.md). Returns what is
    /// wrong, by setting name. The signing key is checked by the Auth feature itself.
    /// </summary>
    public static List<string> MissingBetaSettings(IConfiguration c)
    {
        var problems = new List<string>();
        if (string.IsNullOrWhiteSpace(c.GetConnectionString("Database"))) problems.Add("ConnectionStrings:Database is empty");
        if (string.IsNullOrWhiteSpace(c["Auth:SigningKeyPem"])) problems.Add("Auth:SigningKeyPem is empty");
        if (string.IsNullOrWhiteSpace(c["Email:Host"]) || string.IsNullOrWhiteSpace(c["Email:From"]))
        {
            problems.Add("Email:Host and Email:From are needed (codes would only go to the log)");
        }

        var blob = c["Media:BlobConnectionString"];
        if (string.IsNullOrWhiteSpace(blob) || blob.Contains("UseDevelopmentStorage", StringComparison.OrdinalIgnoreCase))
        {
            problems.Add("Media:BlobConnectionString must point to a real storage account");
        }

        if ((c.GetValue<int?>("Auth:DeletionGraceDays") ?? 30) < 30) problems.Add("Auth:DeletionGraceDays must be 30 (privacy policy)");
        if (string.Equals(c["Auth:CheckLeakedPasswords"], "false", StringComparison.OrdinalIgnoreCase))
        {
            problems.Add("Auth:CheckLeakedPasswords must stay on");
        }

        return problems;
    }

    private static bool BehindProxy(IConfiguration c) => c.GetValue<bool>($"{Section}:BehindProxy");
}

/// <summary>Outside Development the API refuses to start when a beta setting is missing (only names are reported, never values).</summary>
internal sealed class BetaSettingsCheck(IConfiguration configuration) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        var problems = Hosting.MissingBetaSettings(configuration);
        return problems.Count == 0
            ? Task.CompletedTask
            : throw new InvalidOperationException("Beta settings missing or unsafe: " + string.Join("; ", problems));
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
