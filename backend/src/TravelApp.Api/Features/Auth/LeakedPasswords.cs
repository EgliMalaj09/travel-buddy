using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Auth;

/// <summary>Is this password in the list of known leaked passwords?</summary>
public interface ILeakedPasswordCheck
{
    Task<bool> IsLeakedAsync(string password, CancellationToken ct);
}

/// <summary>
/// Free Pwned Passwords service (tech-stack.md). Only the first 5 characters of the password's
/// SHA-1 hash are sent, never the password. If the service cannot be reached, the password is allowed.
/// </summary>
internal sealed partial class PwnedPasswordsCheck(HttpClient http, IOptions<AuthOptions> options, ILogger<PwnedPasswordsCheck> logger)
    : ILeakedPasswordCheck
{
    public async Task<bool> IsLeakedAsync(string password, CancellationToken ct)
    {
        if (!options.Value.CheckLeakedPasswords)
        {
            return false;
        }

#pragma warning disable CA5350 // SHA-1 is what the Pwned Passwords range API uses; it is not used for security here.
        var hash = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(password)));
#pragma warning restore CA5350
        var prefix = hash[..5];
        var suffix = hash[5..];
        try
        {
            var body = await http.GetStringAsync(new Uri($"range/{prefix}", UriKind.Relative), ct);
            foreach (var line in body.Split('\n'))
            {
                var parts = line.Trim().Split(':');
                if (parts.Length == 2 && parts[0].Equals(suffix, StringComparison.OrdinalIgnoreCase) && parts[1] != "0")
                {
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            LogUnavailable(ex);
            return false;
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Pwned Passwords could not be reached; password allowed")]
    private partial void LogUnavailable(Exception ex);
}
