using TravelApp.Api.Features.Media;

namespace TravelApp.Api.Tests.Features.Media;

public sealed class JpegMetadataTests
{
    [Fact]
    public void Exif_and_comments_are_removed_and_the_image_data_is_kept_byte_for_byte()
    {
        var jpeg = MediaTests.JpegWithExif();
        var clean = JpegMetadata.Strip(jpeg)!;

        var text = System.Text.Encoding.ASCII.GetString(clean);
        Assert.DoesNotContain("Exif", text, StringComparison.Ordinal);
        Assert.DoesNotContain("secret", text, StringComparison.Ordinal);
        Assert.Contains("JFIF", text, StringComparison.Ordinal);
        byte[] scan = [0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x12, 0xFF, 0x00, 0x34, 0xFF, 0xD0, 0x56, 0xFF, 0xD9];
        Assert.True(clean.AsSpan().EndsWith(scan));
        Assert.True(JpegMetadata.LooksLikeJpeg(clean));
    }

    [Fact]
    public void The_colour_profile_is_kept_and_data_after_the_end_is_dropped()
    {
        var icc = "ICC_PROFILE\0\x01\x01profile"u8.ToArray();
        byte[] app2 = [0xFF, 0xE2, 0x00, (byte)(icc.Length + 2), .. icc];
        byte[] sos = [0xFF, 0xDA, 0x00, 0x02, 0x11, 0xFF, 0xD9];
        byte[] jpeg = [0xFF, 0xD8, .. app2, .. sos, .. "trailing MPF data"u8];

        var clean = JpegMetadata.Strip(jpeg)!;

        Assert.Equal([0xFF, 0xD8, .. app2, .. sos], clean);
    }

    [Fact]
    public void Broken_files_are_refused()
    {
        Assert.Null(JpegMetadata.Strip("hello"u8));
        Assert.Null(JpegMetadata.Strip([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x40, 0x01]));
        Assert.Null(JpegMetadata.Strip([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02, 0x11]));
    }
}
