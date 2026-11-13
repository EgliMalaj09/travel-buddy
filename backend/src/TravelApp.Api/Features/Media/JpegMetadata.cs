namespace TravelApp.Api.Features.Media;

/// <summary>
/// Removes metadata from a JPEG before it is stored (GDPR): EXIF and XMP (APP1), all other APPn segments
/// APP1..APP15 (Photoshop/IPTC, Adobe, MPF, ...) except the colour profile (APP2 ICC_PROFILE, no personal data) and comments (COM), and anything after the end-of-image
/// marker (some phones append extra data there). APP0 (JFIF) and the image data are kept byte for byte.
/// A small own parser on purpose: no image library, the pixels are never decoded.
/// </summary>
internal static class JpegMetadata
{
    private const byte Soi = 0xD8;
    private const byte Eoi = 0xD9;
    private const byte Sos = 0xDA;
    private const byte App1 = 0xE1;
    private const byte App15 = 0xEF;
    private const byte Com = 0xFE;

    private static ReadOnlySpan<byte> IccTag => "ICC_PROFILE\0"u8;

    private static bool IsIccProfile(byte marker, ReadOnlySpan<byte> segment) =>
        marker == 0xE2 && segment.Length >= 2 + IccTag.Length && segment.Slice(2, IccTag.Length).SequenceEqual(IccTag);

    /// <summary>True when the data starts like a JPEG (FF D8 FF).</summary>
    public static bool LooksLikeJpeg(ReadOnlySpan<byte> data) => data.Length >= 3 && data[0] == 0xFF && data[1] == Soi && data[2] == 0xFF;

    /// <summary>The JPEG without metadata, or null when the file is not a well-formed JPEG.</summary>
    public static byte[]? Strip(ReadOnlySpan<byte> data)
    {
        if (!LooksLikeJpeg(data)) return null;
        var output = new MemoryStream(data.Length);
        output.Write(data[..2]);
        var pos = 2;
        while (true)
        {
            if (pos >= data.Length || data[pos] != 0xFF) return null;
            while (pos < data.Length && data[pos] == 0xFF) pos++; // fill bytes
            if (pos >= data.Length) return null;
            var marker = data[pos++];
            if (marker == Eoi)
            {
                output.Write([0xFF, Eoi]);
                return output.ToArray();
            }
            if (marker is 0x01 or (>= 0xD0 and <= 0xD7))
            {
                output.Write([0xFF, marker]);
                continue;
            }
            if (pos + 2 > data.Length) return null;
            var length = (data[pos] << 8) | data[pos + 1];
            if (length < 2 || pos + length > data.Length) return null;
            var segment = data.Slice(pos, length);
            pos += length;
            // The colour profile (APP2 "ICC_PROFILE") is kept: without it photos from newer phones look washed out.
            var drop = (marker is (>= App1 and <= App15) or Com) && !IsIccProfile(marker, segment);
            if (!drop)
            {
                output.Write([0xFF, marker]);
                output.Write(segment);
            }
            if (marker != Sos) continue;

            // Scan data runs until the next marker that is not a stuffed byte (FF 00) or a restart marker (FF D0..D7).
            var start = pos;
            while (true)
            {
                if (pos + 1 >= data.Length) return null;
                if (data[pos] == 0xFF)
                {
                    var next = data[pos + 1];
                    if (next == 0x00 || next is >= 0xD0 and <= 0xD7)
                    {
                        pos += 2;
                        continue;
                    }
                    if (next == 0xFF)
                    {
                        pos++;
                        continue;
                    }
                    break;
                }
                pos++;
            }
            output.Write(data[start..pos]);
        }
    }
}
