using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Cors;

/// <summary>The web build of the app (localhost:8081) may call the API in development.</summary>
public sealed class CorsTests(ApiFactory factory)
{
    private static HttpRequestMessage Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, new Uri("/auth/login", UriKind.Relative));
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        return request;
    }

    [Fact]
    public async Task Preflight_from_localhost_is_allowed()
    {
        using var client = factory.CreateClient();
        using var response = await client.SendAsync(Preflight("http://localhost:8081"), TestContext.Current.CancellationToken);

        Assert.True(response.IsSuccessStatusCode);
        Assert.Equal("http://localhost:8081", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }

    [Fact]
    public async Task Preflight_from_another_site_gets_no_cors_headers()
    {
        using var client = factory.CreateClient();
        using var response = await client.SendAsync(Preflight("https://evil.example"), TestContext.Current.CancellationToken);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
