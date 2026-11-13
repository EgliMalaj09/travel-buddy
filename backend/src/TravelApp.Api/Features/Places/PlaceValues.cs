namespace TravelApp.Api.Features.Places;

/// <summary>Allowed values and limits, exactly as in decisions/data-model.md section 11 (the phone sends these strings).</summary>
public static class PlaceValues
{
    public const string Shared = "shared";
    public const string Personal = "personal";
    public const string Bucket = "bucket";
    public const string Planned = "planned";
    public const string Visited = "visited";
    public const string Other = "other";
    public const string Manual = "manual";
    public const string Autocapture = "autocapture";

    public static readonly IReadOnlyList<string> Scopes = [Shared, Personal];
    public static readonly IReadOnlyList<string> Statuses = [Bucket, Planned, Visited];
    public static readonly IReadOnlyList<string> Categories = ["food", "sight", "stay", "transport", Other];
    public static readonly IReadOnlyList<string> Sources = [Manual, Autocapture];

    public const int TitleMax = 120;
    public const int NoteMax = 2000;
    public const int CityNameMax = 120;
    public const int AddressMax = 300;
    public const int GeoProviderIdMax = 200;
}
