using System.Net;
using System.Net.Http.Json;
using TravelApp.Api.Features.AppInfo;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.AppInfo;

public sealed class AppInfoTests(ApiFactory factory)
{
    [Fact]
    public async Task App_info_returns_the_working_name_and_environment()
    {
        using var client = factory.CreateClient();

        var info = await client.GetFromJsonAsync<AppInfoResponse>(
            new Uri("/app-info", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.NotNull(info);
        Assert.Equal("Travel App", info.Name);
        Assert.Equal("Development", info.Environment);
    }

    [Fact]
    public async Task Openapi_document_is_served_in_development()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            new Uri("/openapi/v1.json", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Travel App API", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Unknown_routes_return_problem_details()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/does-not-exist", UriKind.Relative), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
