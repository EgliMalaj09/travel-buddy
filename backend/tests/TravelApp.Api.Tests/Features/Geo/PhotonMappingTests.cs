using TravelApp.Api.Features.Geo;

namespace TravelApp.Api.Tests.Features.Geo;

public sealed class PhotonMappingTests
{
    private static PhotonFeature F(double lng, double lat, PhotonProperties p) => new(new PhotonGeometry([lng, lat]), p);

    private static PhotonProperties P(string? name = null, string? street = null, string? number = null, string? city = null,
        string? country = "FR", string? type = "house", string? key = null, string? value = null) =>
        new(name, number, street, city, country, "N", 1, key, value, type);

    [Fact]
    public void A_city_result_uses_its_name_as_the_city_and_has_no_address()
    {
        var place = PhotonMapping.ToPlace(F(2.35, 48.85, P(name: "Paris", type: "city")))!;
        Assert.Equal("Paris", place.Name);
        Assert.Equal("Paris", place.CityName);
        Assert.Null(place.Address);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("F")]
    [InlineData("F1")]
    public void A_result_without_a_valid_country_is_left_out(string? country) =>
        Assert.Null(PhotonMapping.ToPlace(F(2.35, 48.85, P(name: "X", country: country))));

    [Fact]
    public void A_result_without_any_name_street_or_city_is_left_out() =>
        Assert.Null(PhotonMapping.ToPlace(F(2.35, 48.85, P())));

    [Fact]
    public void Out_of_range_positions_are_left_out() =>
        Assert.Null(PhotonMapping.ToPlace(F(200, 48.85, P(name: "X"))));

    [Fact]
    public void Long_names_are_cut_to_120_characters() =>
        Assert.Equal(120, PhotonMapping.ToPlace(F(2.35, 48.85, P(name: new string('n', 200))))!.Name.Length);

    [Theory]
    [InlineData("amenity", "cafe", "food")]
    [InlineData("tourism", "hostel", "stay")]
    [InlineData("tourism", "museum", "sight")]
    [InlineData("historic", "castle", "sight")]
    [InlineData("railway", "station", "transport")]
    [InlineData("aeroway", "aerodrome", "transport")]
    [InlineData("shop", "bakery", null)]
    public void Categories_are_suggested_from_the_map_tags(string key, string value, string? expected) =>
        Assert.Equal(expected, PhotonMapping.Category(key, value));
}
