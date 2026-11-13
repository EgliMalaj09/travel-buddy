using TravelApp.Api.Features.Weather;

namespace TravelApp.Api.Tests.Features.Weather;

/// <summary>The date and averaging rules of the "typical" weather, without the database.</summary>
public sealed class WeatherRulesTests
{
    [Fact]
    public void February_29_becomes_February_28_in_years_that_are_not_leap_years()
    {
        Assert.Equal(new DateOnly(2027, 2, 28), WeatherService.ShiftYears(new DateOnly(2028, 2, 29), 1));
        Assert.Equal(new DateOnly(2024, 2, 29), WeatherService.ShiftYears(new DateOnly(2028, 2, 29), 4));
        Assert.Equal(new DateOnly(2025, 4, 12), WeatherService.ShiftYears(new DateOnly(2027, 4, 12), 2));
    }

    [Fact]
    public void Typical_years_are_the_last_3_full_years()
    {
        var today = new DateOnly(2026, 11, 13);

        Assert.Equal([2, 3, 4], WeatherService.TypicalYearsBack(new DateOnly(2027, 4, 12), new DateOnly(2027, 4, 15), today)); // 2025, 2024, 2023
        Assert.Equal([1, 2, 3], WeatherService.TypicalYearsBack(new DateOnly(2026, 12, 20), new DateOnly(2027, 1, 5), today)); // over new year
    }

    [Fact]
    public void Typical_years_move_back_when_the_archive_would_not_have_the_days_yet()
    {
        // Early January: 20 Dec 2027 to 10 Jan 2028 one year back would end on 10 Jan 2027, not in the archive yet.
        var years = WeatherService.TypicalYearsBack(new DateOnly(2027, 12, 20), new DateOnly(2028, 1, 10), new DateOnly(2027, 1, 2));

        Assert.Equal([2, 3, 4], years);
    }

    [Fact]
    public void Typical_averages_and_counts_rainy_years_and_handles_february_29()
    {
        var dates = new[] { new DateOnly(2028, 2, 28), new DateOnly(2028, 2, 29) };
        int[] yearsBack = [1, 2, 3, 4];
        IReadOnlyList<ProviderDay>[] history =
        [
            [new(new DateOnly(2027, 2, 28), 0, 10, 0.5, null, 0)],
            [new(new DateOnly(2026, 2, 28), 2, 12, 1, null, 1)],
            [new(new DateOnly(2025, 2, 28), 4, 14, 4, null, 3)],
            [new(new DateOnly(2024, 2, 28), 6, 16, 0, null, 0), new(new DateOnly(2024, 2, 29), -2, 8, 10, null, 4)],
        ];

        var days = WeatherService.Typical(dates, yearsBack, history);

        Assert.Equal(2, days.Count);
        Assert.Equal(new ProviderDay(dates[0], 3, 13, 1.4, 50, 1), days[0]); // rain 0.5+1+4+0 = 5.5 / 4 = 1.375
        // 29 Feb: three years use their 28 Feb, 2024 has its own 29 Feb.
        Assert.Equal(new ProviderDay(dates[1], 1, 11, 3.9, 75, 2), days[1]); // rain 0.5+1+4+10 = 15.5 / 4 = 3.875
    }

    [Fact]
    public void A_day_no_year_has_is_left_out()
    {
        var days = WeatherService.Typical(
            [new DateOnly(2027, 5, 1), new DateOnly(2027, 5, 2)],
            [1],
            [[new ProviderDay(new DateOnly(2026, 5, 1), 1, 2, 0, null, 0), new ProviderDay(new DateOnly(2026, 5, 2), null, null, null, null, null)]]);

        Assert.Equal(new DateOnly(2027, 5, 1), Assert.Single(days).Date);
    }

    [Theory]
    [InlineData(41.8967, 419)]
    [InlineData(-33.8688, -339)]
    [InlineData(12.46, 125)]
    [InlineData(-90, -900)]
    public void Positions_are_rounded_to_tenths(double value, int tenths) =>
        Assert.Equal(tenths, WeatherService.ToTenths(value));
}
