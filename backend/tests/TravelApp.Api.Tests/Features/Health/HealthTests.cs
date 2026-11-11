using System.Net;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Health;

public sealed class HealthTests(ApiFactory factory)
{
    [Fact]
    public async Task Health_is_healthy_when_the_database_is_reachable()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/health", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
