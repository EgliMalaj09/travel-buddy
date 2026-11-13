using Microsoft.Extensions.Configuration;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Tests.Shared;

/// <summary>Outside Development the API will not start without the beta settings (KAN-61, switch list).</summary>
public sealed class HostingTests
{
    private static readonly Dictionary<string, string?> Complete = new()
    {
        ["ConnectionStrings:Database"] = "Host=db;Database=travelapp",
        ["Auth:SigningKeyPem"] = "-----BEGIN PRIVATE KEY-----",
        ["Email:Host"] = "smtp.example.com",
        ["Email:From"] = "no-reply@example.com",
        ["Media:BlobConnectionString"] = "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y",
    };

    private static List<string> Check(Dictionary<string, string?> values) =>
        Hosting.MissingBetaSettings(new ConfigurationBuilder().AddInMemoryCollection(values).Build());

    [Fact]
    public void Complete_settings_pass() => Assert.Empty(Check(Complete));

    [Fact]
    public void Empty_settings_name_every_missing_one()
    {
        var problems = Check([]);
        Assert.Contains(problems, p => p.Contains("ConnectionStrings:Database"));
        Assert.Contains(problems, p => p.Contains("Auth:SigningKeyPem"));
        Assert.Contains(problems, p => p.Contains("Email:Host"));
        Assert.Contains(problems, p => p.Contains("Media:BlobConnectionString"));
    }

    [Theory]
    [InlineData("Media:BlobConnectionString", "UseDevelopmentStorage=true")]
    [InlineData("Auth:DeletionGraceDays", "0")]
    [InlineData("Auth:CheckLeakedPasswords", "false")]
    public void Local_only_values_are_refused(string key, string value)
    {
        var values = new Dictionary<string, string?>(Complete) { [key] = value };
        Assert.Contains(Check(values), p => p.Contains(key));
    }

    [Fact]
    public void Problems_never_contain_the_values()
    {
        var values = new Dictionary<string, string?>(Complete) { ["Media:BlobConnectionString"] = "UseDevelopmentStorage=true;secret-ish" };
        Assert.DoesNotContain(Check(values), p => p.Contains("secret-ish"));
    }
}
