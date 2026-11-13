using System.Text;
using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Tests.Features.Admin;

/// <summary>The authenticator codes match RFC 6238 (what every authenticator app makes).</summary>
public sealed class TotpTests
{
    private static readonly byte[] RfcSecret = Encoding.ASCII.GetBytes("12345678901234567890");

    [Theory]
    [InlineData(59, "287082")]
    [InlineData(1111111109, "081804")]
    [InlineData(1234567890, "005924")]
    public void Codes_match_the_rfc_test_values(long unixSeconds, string expected) =>
        Assert.Equal(expected, Totp.Code(RfcSecret, unixSeconds / Totp.StepSeconds));

    [Fact]
    public void Base32_round_trips()
    {
        var secret = Totp.NewSecret();
        Assert.Equal(secret, Totp.FromBase32(Totp.ToBase32(secret)));
        Assert.Equal("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", Totp.ToBase32(RfcSecret));
    }

    [Fact]
    public void A_code_is_accepted_once_and_one_step_of_drift_is_fine()
    {
        var secret = Totp.NewSecret();
        var now = DateTimeOffset.UtcNow;
        var step = Totp.StepAt(now);

        Assert.Equal(step - 1, Totp.Match(secret, Totp.Code(secret, step - 1), now, 0));
        Assert.Null(Totp.Match(secret, Totp.Code(secret, step), now, lastUsedStep: step));
        Assert.Null(Totp.Match(secret, Totp.Code(secret, step + 2), now, 0));
    }

    [Fact]
    public void The_stored_secret_needs_the_right_key()
    {
        var secret = Totp.NewSecret();
        var key = new byte[32];
        var stored = Totp.Protect(secret, key);
        Assert.Equal(secret, Totp.Unprotect(stored, key));
        Assert.Null(Totp.Unprotect(stored, Enumerable.Repeat((byte)1, 32).ToArray()));
    }

    [Theory]
    [InlineData("jane.doe@gmail.com", "j***@gmail.com")]
    [InlineData("a@b.co", "a***@b.co")]
    [InlineData("", "")]
    public void Emails_are_masked_in_lists(string email, string masked) => Assert.Equal(masked, AdminText.MaskEmail(email));
}
