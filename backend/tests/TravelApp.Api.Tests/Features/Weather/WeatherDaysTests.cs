using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Web;
using Microsoft.Extensions.DependencyInjection;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Weather;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Weather;

/// <summary>
/// GET /weather/days (KAN-29) against the fake Open-Meteo. Each test uses its own position, so cached rows
/// of one test never answer another.
/// </summary>
public sealed class WeatherDaysTests(ApiFactory factory) : IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly AuthTestClient _client = new(factory);
    private string _token = "";

    public async ValueTask InitializeAsync() =>
        _token = (await _client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice())).AccessToken;

    public ValueTask DisposeAsync()
    {
        factory.Weather.Fail = false;
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private async Task<HttpResponseMessage> Get(string lat, string lng, DateOnly from, DateOnly to, bool signedIn = true)
    {
        var url = string.Create(CultureInfo.InvariantCulture, $"/weather/days?lat={lat}&lng={lng}&from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}");
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(url, UriKind.Relative));
        if (signedIn) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        return await _client.Http.SendAsync(request, Ct);
    }

    private async Task<WeatherDaysResponse> Days(string lat, string lng, DateOnly from, DateOnly to) =>
        await AuthTestClient.Read<WeatherDaysResponse>(await Get(lat, lng, from, to));

    [Fact]
    public async Task Without_a_token_it_answers_401()
    {
        var response = await Get("41.9", "12.5", Today, Today, signedIn: false);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("91", "12.5", 0, 1)]
    [InlineData("41.9", "-181", 0, 1)]
    [InlineData("41.9", "12.5", 5, 4)]
    [InlineData("41.9", "12.5", 0, 31)]
    [InlineData("41.9", "12.5", 380, 401)]
    [InlineData("41.9", "12.5", -3, 0)]
    public async Task Bad_input_answers_400(string lat, string lng, int fromDays, int toDays)
    {
        var response = await Get(lat, lng, Today.AddDays(fromDays), Today.AddDays(toDays));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Forecast_days_are_mapped_in_date_order()
    {
        var days = await Days("10.1", "20.1", Today.AddDays(-2), Today.AddDays(15));

        Assert.Equal(18, days.Days.Count);
        Assert.Equal(Enumerable.Range(-2, 18).Select(Today.AddDays), days.Days.Select(d => d.Date));
        var first = days.Days[0];
        Assert.Equal(WeatherValues.Forecast, first.Kind);
        Assert.Equal(10, first.MinC);
        Assert.Equal(20, first.MaxC);
        Assert.Equal(2.5, first.PrecipitationMm);
        Assert.Equal(40, first.PrecipitationChance);
        Assert.Equal(0, first.SnowCm);
        Assert.Equal("Weather data by Open-Meteo.com", days.Attribution);
        Assert.Equal("https://open-meteo.com/", days.AttributionUrl);
    }

    [Fact]
    public async Task Typical_days_average_the_last_3_years()
    {
        var from = Today.AddDays(100);
        var days = await Days("10.2", "20.2", from, from.AddDays(2));

        Assert.Equal(3, days.Days.Count);
        var day = days.Days[0];
        Assert.Equal(from, day.Date);
        Assert.Equal(WeatherValues.Typical, day.Kind);
        Assert.Equal(6, day.MinC);
        Assert.Equal(16, day.MaxC);
        Assert.Equal(1.5, day.PrecipitationMm);
        Assert.Equal(67, day.PrecipitationChance); // 2 of 3 years had 1 mm or more
        Assert.Equal(1, day.SnowCm);

        var archive = factory.Weather.Requests.Where(u => u.Query.Contains("latitude=10.2&", StringComparison.Ordinal)).ToList();
        Assert.Equal(3, archive.Count);
        Assert.All(archive, u => Assert.StartsWith("archive", u.Host, StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_range_over_the_forecast_edge_mixes_forecast_and_typical()
    {
        var days = await Days("10.3", "20.3", Today.AddDays(14), Today.AddDays(17));

        Assert.Equal(
            [WeatherValues.Forecast, WeatherValues.Forecast, WeatherValues.Typical, WeatherValues.Typical],
            days.Days.Select(d => d.Kind));
    }

    [Fact]
    public async Task Cached_days_do_not_call_the_provider_again()
    {
        await Days("10.4", "20.4", Today, Today.AddDays(3));
        await Days("10.4", "20.4", Today.AddDays(150), Today.AddDays(152));
        var calls = factory.Weather.CountFor("10.4");

        var again = await Days("10.4", "20.4", Today, Today.AddDays(3));
        var typical = await Days("10.4", "20.4", Today.AddDays(150), Today.AddDays(152));

        Assert.Equal(4, calls); // 1 forecast + 3 archive years
        Assert.Equal(calls, factory.Weather.CountFor("10.4"));
        Assert.Equal(4, again.Days.Count);
        Assert.Equal(3, typical.Days.Count);
    }

    [Fact]
    public async Task Stale_cache_is_served_when_the_provider_fails()
    {
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Add(new WeatherCacheEntry
            {
                Id = Guid.CreateVersion7(), Kind = WeatherValues.Forecast, Lat10 = 105, Lng10 = 205, Date = Today.AddDays(1),
                MinC = 1, MaxC = 2, PrecipitationMm = 3, PrecipitationChance = 4, SnowCm = 5,
                FetchedAt = DateTimeOffset.UtcNow.AddDays(-1),
            });
            await db.SaveChangesAsync(Ct);
        }

        factory.Weather.Fail = true;
        var days = await Days("10.5", "20.5", Today, Today.AddDays(2));

        Assert.Equal(1, factory.Weather.CountFor("10.5")); // it tried to refresh
        var day = Assert.Single(days.Days);
        Assert.Equal(Today.AddDays(1), day.Date);
        Assert.Equal(1, day.MinC);
        Assert.Equal(5, day.SnowCm);
    }

    [Fact]
    public async Task Provider_failing_with_nothing_cached_answers_503()
    {
        factory.Weather.Fail = true;

        var response = await Get("10.6", "20.6", Today, Today.AddDays(2));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Weather is not available right now", await response.Content.ReadAsStringAsync(Ct), StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_provider_only_gets_rounded_coordinates()
    {
        await Days("-33.8688", "151.2093", Today, Today);

        var request = Assert.Single(factory.Weather.Requests, u => u.Query.Contains("latitude=-33.9&", StringComparison.Ordinal));
        var query = HttpUtility.ParseQueryString(request.Query);
        Assert.Equal("-33.9", query["latitude"]);
        Assert.Equal("151.2", query["longitude"]);
        Assert.DoesNotContain(factory.Weather.Requests, u => u.Query.Contains("33.86", StringComparison.Ordinal));
    }
}
