using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace TravelApp.Api.Features.Admin;

/// <summary>
/// Time-based one-time codes (RFC 6238: SHA-1, 6 digits, 30 seconds), the kind every authenticator app makes
/// (Google Authenticator, Microsoft Authenticator, 1Password, ...). Small enough to keep here instead of a library.
/// </summary>
internal static class Totp
{
    public const int StepSeconds = 30;
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static byte[] NewSecret() => RandomNumberGenerator.GetBytes(20);

    public static long StepAt(DateTimeOffset time) => time.ToUnixTimeSeconds() / StepSeconds;

    public static string Code(byte[] secret, long step)
    {
        Span<byte> counter = stackalloc byte[8];
        BinaryPrimitives.WriteInt64BigEndian(counter, step);
#pragma warning disable CA5350 // RFC 6238 and every authenticator app use HMAC-SHA1 here; it is safe for HMAC.
        var hash = HMACSHA1.HashData(secret, counter);
#pragma warning restore CA5350
        var offset = hash[^1] & 0x0F;
        var value = (BinaryPrimitives.ReadInt32BigEndian(hash.AsSpan(offset, 4)) & 0x7FFFFFFF) % 1_000_000;
        return value.ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// The time step the code belongs to (now, or one step before or after for clock drift), or null.
    /// Steps up to <paramref name="lastUsedStep"/> are refused, so a code cannot be used twice.
    /// </summary>
    public static long? Match(byte[] secret, string code, DateTimeOffset now, long lastUsedStep)
    {
        var current = StepAt(now);
        for (var step = current - 1; step <= current + 1; step++)
        {
            if (step <= lastUsedStep) continue;
            if (CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Code(secret, step)), Encoding.ASCII.GetBytes(code)))
            {
                return step;
            }
        }

        return null;
    }

    public static string ToBase32(byte[] data)
    {
        var sb = new StringBuilder((data.Length * 8 + 4) / 5);
        int buffer = 0, bits = 0;
        foreach (var b in data)
        {
            buffer = (buffer << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                sb.Append(Alphabet[(buffer >> (bits - 5)) & 31]);
                bits -= 5;
            }
        }

        if (bits > 0) sb.Append(Alphabet[(buffer << (5 - bits)) & 31]);
        return sb.ToString();
    }

    public static byte[] FromBase32(string text)
    {
        var output = new List<byte>(text.Length * 5 / 8);
        int buffer = 0, bits = 0;
        foreach (var c in text.TrimEnd('=').ToUpperInvariant())
        {
            var value = Alphabet.IndexOf(c, StringComparison.Ordinal);
            if (value < 0) throw new FormatException("Not Base32.");
            buffer = (buffer << 5) | value;
            bits += 5;
            if (bits >= 8)
            {
                output.Add((byte)((buffer >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }

        return [.. output];
    }

    /// <summary>The otpauth:// link authenticator apps read from a QR code.</summary>
    public static string OtpauthUri(string issuer, string account, string base32Secret) =>
        $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(account)}" +
        $"?secret={base32Secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits=6&period={StepSeconds}";

    /// <summary>Encrypts the secret for the database (AES-GCM; nonce + tag + cipher, Base64).</summary>
    public static string Protect(byte[] secret, byte[] key)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var cipher = new byte[secret.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(key, tag.Length);
        aes.Encrypt(nonce, secret, cipher, tag);
        return Convert.ToBase64String([.. nonce, .. tag, .. cipher]);
    }

    /// <summary>The secret, or null when it cannot be read (for example the signing key changed: set up the app again).</summary>
    public static byte[]? Unprotect(string stored, byte[] key)
    {
        try
        {
            var all = Convert.FromBase64String(stored);
            var secret = new byte[all.Length - 28];
            using var aes = new AesGcm(key, 16);
            aes.Decrypt(all.AsSpan(0, 12), all.AsSpan(28), all.AsSpan(12, 16), secret);
            return secret;
        }
        catch (Exception ex) when (ex is FormatException or CryptographicException or ArgumentException)
        {
            return null;
        }
    }
}
