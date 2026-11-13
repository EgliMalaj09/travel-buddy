using System.Net;
using System.Net.Http.Headers;
using System.Web;
using TravelApp.Api.Features.Geo;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Geo;

/// <summary>GET /geo/search and /geo/reverse (KAN-37) against the fake Photon.</summary>
public sealed class GeoSearchTests(ApiFactory factory) : IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly AuthTestClient _client = new(factory);
    private string _token = "";

    public async ValueTask InitializeAsync() =>
        _token = (await _client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice())).AccessToken;

    public ValueTask DisposeAsync()
    {
        factory.Geo.Fail = false;
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private async Task<HttpResponseMessage> Get(string url, bool signedIn = true)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(url, UriKind.Relative));
        if (signedIn) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        return await _client.Http.SendAsync(request, Ct);
    }

    [Fact]
    public async Task Without_a_token_it_answers_401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Get("/geo/search?q=colosseum", signedIn: false)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Get("/geo/reverse?lat=41.9&lng=12.5", signedIn: false)).StatusCode);
    }

    [Theory]
    [InlineData("/geo/search")]
    [InlineData("/geo/search?q=a")]
    [InlineData("/geo/search?q=%20%20%20")]
    [InlineData("/geo/search?q=rome&lat=41.9")]
    [InlineData("/geo/search?q=rome&lat=91&lng=12")]
    [InlineData("/geo/reverse?lat=41.9&lng=181")]
    [InlineData("/geo/reverse?lat=41,8902&lng=12.4922")]
    public async Task Bad_input_answers_400(string url)
    {
        var response = await Get(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task A_value_that_cannot_be_read_is_not_repeated_in_the_answer()
    {
        var response = await Get("/geo/reverse?lat=41,8902&lng=12.4922");
        var body = await response.Content.ReadAsStringAsync(Ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain("41,8902", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_query_longer_than_100_characters_answers_400()
    {
        var response = await Get("/geo/search?q=" + new string('a', 101));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Search_maps_results_drops_duplicates_and_results_without_a_country()
    {
        var result = await AuthTestClient.Read<GeoSearchResponse>(await Get("/geo/search?q=colosseum"));

        Assert.Equal(["Colosseum", "Trattoria da Enzo", "Via Roma 12"], result.Places.Select(p => p.Name));
        var colosseum = result.Places[0];
        Assert.Equal("Piazza del Colosseo 1, Rome", colosseum.Address);
        Assert.Equal("Rome", colosseum.CityName);
        Assert.Equal("IT", colosseum.CountryCode);
        Assert.Equal(41.89021, colosseum.Lat, 6);
        Assert.Equal(12.492231, colosseum.Lng, 6);
        Assert.Equal("osm:W:27000000", colosseum.GeoProviderId);
        Assert.Equal("sight", colosseum.Category);
        Assert.Equal("food", result.Places[1].Category);
        Assert.Equal("IT", result.Places[1].CountryCode);
        Assert.Null(result.Places[2].Category);
        Assert.Equal("Via Roma 12, Rome", result.Places[2].Address);
        Assert.Contains("OpenStreetMap", result.Attribution);
    }

    [Fact]
    public async Task The_near_position_is_rounded_to_one_decimal_before_it_reaches_the_provider()
    {
        await Get("/geo/search?q=near-test-xyz&lat=41.8902&lng=12.4922");

        var sent = factory.Geo.Requests.Last(u => HttpUtility.ParseQueryString(u.Query)["q"] == "near-test-xyz");
        var query = HttpUtility.ParseQueryString(sent.Query);
        Assert.Equal("41.9", query["lat"]);
        Assert.Equal("12.5", query["lon"]);
    }

    [Fact]
    public async Task Reverse_gives_what_is_at_the_point_or_nothing()
    {
        var found = await AuthTestClient.Read<GeoReverseResponse>(await Get("/geo/reverse?lat=41.9&lng=12.48"));
        Assert.Equal("Via Roma 12", found.Place?.Name);

        var sea = await AuthTestClient.Read<GeoReverseResponse>(await Get("/geo/reverse?lat=-70&lng=0"));
        Assert.Null(sea.Place);
    }

    [Fact]
    public async Task When_the_provider_fails_it_answers_503()
    {
        factory.Geo.Fail = true;

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Get("/geo/search?q=rome")).StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Get("/geo/reverse?lat=41.9&lng=12.5")).StatusCode);
    }

    [Fact]
    public async Task More_than_30_calls_a_minute_from_one_user_answers_429()
    {
        HttpStatusCode last = HttpStatusCode.OK;
        for (var i = 0; i < 31; i++) last = (await Get("/geo/search?q=limit")).StatusCode;
        Assert.Equal(HttpStatusCode.TooManyRequests, last);
    }
}
