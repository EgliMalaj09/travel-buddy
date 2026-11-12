using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace TravelApp.Api.Features.Trips;

/// <summary>
/// Where a page of GET /trips ended: the sort values of its last trip. The app treats it as opaque text
/// (base64url of "startDate|createdAtTicks|id", startDate empty for Someday trips).
/// </summary>
internal sealed record TripsCursor(DateOnly? StartDate, DateTimeOffset CreatedAt, Guid Id)
{
    public static string Write(Trip t)
    {
        var start = t.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "";
        var text = string.Join('|', start, t.CreatedAt.UtcTicks.ToString(CultureInfo.InvariantCulture), t.Id.ToString("N"));
        return WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(text));
    }

    public static TripsCursor? Read(string cursor)
    {
        string text;
        try
        {
            text = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(cursor));
        }
        catch (FormatException)
        {
            return null;
        }

        var parts = text.Split('|');
        if (parts.Length != 3
            || !long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
            || ticks < DateTimeOffset.MinValue.UtcTicks || ticks > DateTimeOffset.MaxValue.UtcTicks
            || !Guid.TryParseExact(parts[2], "N", out var id))
        {
            return null;
        }

        DateOnly? start = null;
        if (parts[0].Length > 0)
        {
            if (!DateOnly.TryParseExact(parts[0], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
            {
                return null;
            }

            start = d;
        }

        return new TripsCursor(start, new DateTimeOffset(ticks, TimeSpan.Zero), id);
    }
}
