using System.Net;
using System.Net.Http.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Auth;

/// <summary>Tokens, refresh, logout, Google/Apple, forgot password and profile setup.</summary>
public sealed class SessionAndProfileTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly ProfileRequest Profile = new("Egli", "AL", "IT", "EUR", Language: "en", TimeZone: "Europe/Rome");

    [Fact]
    public async Task Access_token_is_ES256_for_the_api_and_powersync_and_matches_the_published_key()
    {
        using var client = new AuthTestClient(factory);
        var session = await client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        var token = new JsonWebToken(session.AccessToken);
        var jwks = await client.Http.GetFromJsonAsync<JwksResponse>(new Uri("/.well-known/jwks.json", UriKind.Relative), Ct);

        Assert.Equal("ES256", token.Alg);
        Assert.Contains("travel-app-api", token.Audiences);
        Assert.Contains("travel-app-powersync", token.Audiences);
        Assert.Equal(session.User.Id.ToString(), token.Subject);
        Assert.InRange(token.ValidTo - token.ValidFrom, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(16));
        var key = Assert.Single(jwks!.Keys);
        Assert.Equal(token.Kid, key.Kid);
        Assert.Equal("EC", key.Kty);
    }

    [Fact]
    public async Task Me_needs_a_valid_token()
    {
        using var client = new AuthTestClient(factory);

        var none = await client.Http.GetAsync(new Uri("/me", UriKind.Relative), Ct);
        var bad = await client.GetMe("not-a-token");

        Assert.Equal(HttpStatusCode.Unauthorized, none.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
    }

    [Fact]
    public async Task Refresh_replaces_the_token_and_reusing_an_old_one_ends_all_sessions()
    {
        using var client = new AuthTestClient(factory);
        var first = await client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        var second = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/refresh", new RefreshRequest(first.RefreshToken)));
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);

        var reuse = await client.Post("/auth/refresh", new RefreshRequest(first.RefreshToken));
        await AuthTestClient.AssertError(reuse, HttpStatusCode.Unauthorized, AuthErrorCodes.SessionExpired);
        var newestToo = await client.Post("/auth/refresh", new RefreshRequest(second.RefreshToken));
        await AuthTestClient.AssertError(newestToo, HttpStatusCode.Unauthorized, AuthErrorCodes.SessionExpired);
    }

    [Fact]
    public async Task Logout_ends_this_phones_session_only()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var phoneA = await client.SignUp(email, AuthTestClient.NewDevice());
        var phoneB = await SocialOrLoginOnNewPhone(client, email);

        var logout = await client.Post("/auth/logout", new LogoutRequest(phoneA.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        await AuthTestClient.AssertError(await client.Post("/auth/refresh", new RefreshRequest(phoneA.RefreshToken)), HttpStatusCode.Unauthorized, AuthErrorCodes.SessionExpired);
        await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/refresh", new RefreshRequest(phoneB.RefreshToken)));
    }

    [Fact]
    public async Task Forgot_password_sets_a_new_password_and_ends_all_sessions()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        var session = await client.SignUp(email, device);

        Assert.Equal(HttpStatusCode.NoContent, (await client.Post("/auth/password/forgot", new ForgotPasswordRequest(email))).StatusCode);
        var reset = await client.Post("/auth/password/reset", new ResetPasswordRequest(email, client.Code(email, CodePurpose.Reset), "a brand new password"));
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        await AuthTestClient.AssertError(await client.Post("/auth/refresh", new RefreshRequest(session.RefreshToken)), HttpStatusCode.Unauthorized, AuthErrorCodes.SessionExpired);
        await AuthTestClient.AssertError(await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device)), HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidCredentials);
        var login = await AuthTestClient.Read<LoginResponse>(await client.Post("/auth/login", new LoginRequest(email, "a brand new password", device)));
        Assert.Equal("session", login.Kind);
    }

    [Fact]
    public async Task Forgot_password_for_an_unknown_email_answers_the_same_but_sends_nothing()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();

        var response = await client.Post("/auth/password/forgot", new ForgotPasswordRequest(email));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, factory.Emails.Count(email));
    }

    [Fact]
    public async Task Google_sign_in_creates_an_account_with_the_suggested_name()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();

        var session = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/google",
            new SocialLoginRequest($"google|{Guid.NewGuid()}|{email}|Alex", AuthTestClient.NewDevice())));

        Assert.Equal(["google"], session.User.AuthProviders);
        Assert.Equal("Alex", session.User.SuggestedFirstName);
        Assert.Null(session.User.Consents);
        Assert.Null(session.User.Profile);
    }

    [Fact]
    public async Task Google_with_the_same_email_links_to_the_email_account()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var emailSession = await client.SignUp(email, AuthTestClient.NewDevice());
        var subject = Guid.NewGuid().ToString();

        var google = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/google",
            new SocialLoginRequest($"google|{subject}|{email.ToUpperInvariant()}|", AuthTestClient.NewDevice())));
        var again = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/google",
            new SocialLoginRequest($"google|{subject}|{email}|", AuthTestClient.NewDevice())));

        Assert.Equal(emailSession.User.Id, google.User.Id);
        Assert.Equal(emailSession.User.Id, again.User.Id);
        Assert.Equal(["email", "google"], again.User.AuthProviders);
    }

    [Fact]
    public async Task Email_sign_up_adds_a_password_to_an_existing_apple_account()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var apple = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/apple",
            new SocialLoginRequest($"apple|{Guid.NewGuid()}|{email}|", AuthTestClient.NewDevice(), "Sam")));

        var emailSession = await client.SignUp(email, AuthTestClient.NewDevice());

        Assert.Equal(apple.User.Id, emailSession.User.Id);
        Assert.Equal(["apple", "email"], emailSession.User.AuthProviders);
        Assert.Equal("Sam", emailSession.User.SuggestedFirstName);
    }

    [Fact]
    public async Task An_invalid_google_token_is_refused()
    {
        using var client = new AuthTestClient(factory);

        var response = await client.Post("/auth/google", new SocialLoginRequest("apple|x|a@example.com|", AuthTestClient.NewDevice()));

        await AuthTestClient.AssertError(response, HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidToken);
    }

    [Fact]
    public async Task Profile_setup_saves_the_profile()
    {
        using var client = new AuthTestClient(factory);
        var session = await client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        var user = await AuthTestClient.Read<AuthUserResponse>(await client.SaveProfile(session.AccessToken, Profile));

        Assert.Equal(new ProfileDto("Egli", "AL", "IT", "EUR"), user.Profile);
        var me = await AuthTestClient.Read<AuthUserResponse>(await client.GetMe(session.AccessToken));
        Assert.Equal(user.Profile, me.Profile);
    }

    [Fact]
    public async Task Google_users_accept_the_consents_in_profile_setup()
    {
        using var client = new AuthTestClient(factory);
        var session = await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/google",
            new SocialLoginRequest($"google|{Guid.NewGuid()}|{AuthTestClient.NewEmail()}|", AuthTestClient.NewDevice())));

        var without = await client.SaveProfile(session.AccessToken, Profile);
        await AuthTestClient.AssertError(without, HttpStatusCode.BadRequest, AuthErrorCodes.ConsentRequired);

        var user = await AuthTestClient.Read<AuthUserResponse>(await client.SaveProfile(session.AccessToken, Profile with { Consents = new ConsentsDto(true, true, true) }));
        Assert.Equal(new ConsentsDto(true, true, true), user.Consents);
        Assert.NotNull(user.Profile);
    }

    [Fact]
    public async Task Profile_setup_checks_country_and_currency_codes()
    {
        using var client = new AuthTestClient(factory);
        var session = await client.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        var response = await client.SaveProfile(session.AccessToken, Profile with { PassportCountry = "Albania", HomeCurrency = "eur" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Second phone for the same email account: login, then the new-phone code.</summary>
    private static async Task<SessionResponse> SocialOrLoginOnNewPhone(AuthTestClient client, string email)
    {
        var phone = AuthTestClient.NewDevice();
        await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, phone));
        return await AuthTestClient.Read<SessionResponse>(await client.Post("/auth/login/verify",
            new VerifyCodeRequest(email, client.Code(email, CodePurpose.Login), phone)));
    }
}
