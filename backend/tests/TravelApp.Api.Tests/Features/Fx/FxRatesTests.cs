using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using TravelApp.Api.Features.Fx;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Fx;

/// <summary>
/// GET /fx/rates (KAN-43) against the fake Currency API. Each test uses its own days, so cached rows of one test
/// never answer another.
/// </summary>
public sealed class FxRatesTests(ApiFactory factory) : IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly AuthTestClient _client = new(factory);
    private string _token = "";

    public async ValueTask InitializeAsync() =>
        _token = (await _client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice())).AccessToken;

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private static string Day(DateOnly d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private async Task<HttpResponseMessage> Get(string dates, string currencies, bool signedIn = true)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"/fx/rates?dates={dates}&currencies={currencies}", UriKind.Relative));
        if (signedIn) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        return await _client.Http.SendAsync(request, Ct);
    }

    private async Task<IReadOnlyList<FxDayDto>> Days(string dates, string currencies) =>
        (await AuthTestClient.Read<FxRatesResponse>(await Get(dates, currencies))).Days;

    [Fact]
    public async Task A_past_day_is_fetched_once_and_then_answered_from_the_database()
    {
        var day = new DateOnly(2025, 1, 10);

        var first = Assert.Single(await Days(Day(day), "MAD,ALL"));
        Assert.Equal(day, first.Date);
        Assert.Equal(day, first.RateDate);
        Assert.True(first.Final);
        Assert.Equal(10.5m, first.RatesToEur["MAD"]);
        Assert.Equal(97.25m, first.RatesToEur["ALL"]);
        // EUR is always there (the base); currencies that were not asked for are left out.
        Assert.Equal(1m, first.RatesToEur["EUR"]);
        Assert.False(first.RatesToEur.ContainsKey("JPY"));

        var again = Assert.Single(await Days(Day(day), "JPY"));
        Assert.Equal(160m, again.RatesToEur["JPY"]);
        Assert.Equal(1, factory.Fx.CountFor(Day(day)));
    }

    [Fact]
    public async Task Junk_from_the_provider_is_not_stored()
    {
        var day = new DateOnly(2025, 1, 11);
        var result = Assert.Single(await Days(Day(day), "BAD,HUG,MAD"));
        Assert.Equal(["EUR", "MAD"], result.RatesToEur.Keys.Order());
    }

    [Fact]
    public async Task Before_todays_rates_are_out_the_latest_day_is_used_and_marked_not_final()
    {
        var result = Assert.Single(await Days(Day(Today), "MAD"));
        Assert.Equal(Today, result.Date);
        Assert.Equal(Today.AddDays(-1), result.RateDate);
        Assert.False(result.Final);
        Assert.Equal(10.5m, result.RatesToEur["MAD"]);
    }

    [Fact]
    public async Task A_future_day_uses_the_latest_rates_until_it_comes()
    {
        var later = Today.AddDays(30);
        var result = Assert.Single(await Days(Day(later), "MAD"));
        Assert.Equal(later, result.Date);
        Assert.NotNull(result.RateDate);
        Assert.True(result.RateDate < later);
        Assert.False(result.Final);
    }

    [Fact]
    public async Task When_the_provider_fails_the_day_has_no_rates_and_is_not_asked_again_right_away()
    {
        var day = new DateOnly(2025, 2, 20);
        factory.Fx.FailFor(day);

        var result = Assert.Single(await Days(Day(day), "MAD"));
        Assert.Null(result.RateDate);
        Assert.False(result.Final);
        Assert.Empty(result.RatesToEur);
        var asked = factory.Fx.CountFor(Day(day));
        Assert.Equal(2, asked); // main address and fallback

        await Days(Day(day), "MAD");
        Assert.Equal(asked, factory.Fx.CountFor(Day(day)));
    }

    [Fact]
    public async Task A_missed_day_gets_the_closest_earlier_day_not_final()
    {
        var before = new DateOnly(2025, 3, 3);
        var missed = new DateOnly(2025, 3, 4);
        await Days(Day(before), "MAD");
        factory.Fx.FailFor(missed);

        var result = Assert.Single(await Days(Day(missed), "MAD"));
        Assert.Equal(before, result.RateDate);
        Assert.False(result.Final);
    }

    [Fact]
    public async Task Several_days_come_back_in_the_asked_order()
    {
        var days = await Days("2025-04-02,2025-04-01", "MAD");
        Assert.Equal([new DateOnly(2025, 4, 2), new DateOnly(2025, 4, 1)], days.Select(d => d.Date));
        Assert.All(days, d => Assert.True(d.Final));
    }

    [Fact]
    public async Task One_request_fetches_only_a_few_new_days_from_the_provider()
    {
        var first = new DateOnly(2025, 6, 1);
        var many = Enumerable.Range(0, FxValues.MaxProviderDaysPerRequest + 3).Select(first.AddDays).ToList();

        var days = await Days(string.Join(',', many.Select(Day)), "MAD");
        Assert.Equal(FxValues.MaxProviderDaysPerRequest, days.Count(d => d.Final));
        // The others come back empty (not with a nearby day's rates), so the app asks again.
        Assert.All(days.Where(d => !d.Final), d => Assert.Null(d.RateDate));
        Assert.Equal(many.Count, days.Count);

        // The next call fetches the rest.
        days = await Days(string.Join(',', many.Select(Day)), "MAD");
        Assert.All(days, d => Assert.True(d.Final));
    }

    [Theory]
    [InlineData("2025-13-01", "MAD", "dates")]
    [InlineData("", "MAD", "dates")]
    [InlineData("2020-01-01", "MAD", "dates")]
    [InlineData("2025-01-01", "mad", "currencies")]
    [InlineData("2025-01-01", "", "currencies")]
    [InlineData("2025-01-01", "EURO", "currencies")]
    public async Task Bad_requests_are_refused(string dates, string currencies, string field)
    {
        var response = await Get(dates, currencies);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains($"\"{field}\"", await response.Content.ReadAsStringAsync(Ct), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Too_many_days_or_too_far_ahead_are_refused()
    {
        var many = string.Join(',', Enumerable.Range(0, FxValues.MaxDates + 1).Select(i => Day(new DateOnly(2025, 1, 1).AddDays(i))));
        Assert.Equal(HttpStatusCode.BadRequest, (await Get(many, "MAD")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Get(Day(Today.AddDays(FxValues.AheadDays + 1)), "MAD")).StatusCode);
    }

    [Fact]
    public async Task Rates_need_a_login()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Get("2025-01-01", "MAD", signedIn: false)).StatusCode);
    }
}
