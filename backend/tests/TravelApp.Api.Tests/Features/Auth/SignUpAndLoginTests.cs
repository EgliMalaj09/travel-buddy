using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Auth;

/// <summary>Email sign-up, login, new-phone code, lockout and code limits (01-login-onboarding.md).</summary>
public sealed class SignUpAndLoginTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Sign_up_with_code_creates_the_account_and_a_session()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();

        var session = await client.SignUp(email, AuthTestClient.NewDevice());

        Assert.False(string.IsNullOrEmpty(session.AccessToken));
        Assert.False(string.IsNullOrEmpty(session.RefreshToken));
        Assert.Equal(email, session.User.Email);
        Assert.Equal(["email"], session.User.AuthProviders);
        Assert.Null(session.User.Profile);
        Assert.Equal(new ConsentsDto(true, true, false), session.User.Consents);

        var me = await AuthTestClient.Read<AuthUserResponse>(await client.GetMe(session.AccessToken));
        Assert.Equal(session.User.Id, me.Id);
    }

    [Fact]
    public async Task No_account_exists_before_the_code_is_entered()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();

        await client.Post("/auth/signup", new SignUpRequest(email, AuthTestClient.Password, AuthTestClient.Consents));

        var login = await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, AuthTestClient.NewDevice()));
        await AuthTestClient.AssertError(login, HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidCredentials);
    }

    [Fact]
    public async Task Sign_up_with_a_taken_email_is_refused()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await client.SignUp(email, AuthTestClient.NewDevice());

        var again = await client.Post("/auth/signup", new SignUpRequest(email.ToUpperInvariant(), AuthTestClient.Password, AuthTestClient.Consents));

        await AuthTestClient.AssertError(again, HttpStatusCode.Conflict, AuthErrorCodes.EmailTaken);
    }

    [Fact]
    public async Task Sign_up_needs_age_and_terms()
    {
        using var client = new AuthTestClient(factory);

        var response = await client.Post("/auth/signup", new SignUpRequest(AuthTestClient.NewEmail(), AuthTestClient.Password, new ConsentsDto(true, false, false)));

        await AuthTestClient.AssertError(response, HttpStatusCode.BadRequest, AuthErrorCodes.ConsentRequired);
    }

    [Fact]
    public async Task Short_passwords_and_bad_emails_fail_validation()
    {
        using var client = new AuthTestClient(factory);

        var shortPassword = await client.Post("/auth/signup", new SignUpRequest(AuthTestClient.NewEmail(), "short", AuthTestClient.Consents));
        var badEmail = await client.Post("/auth/signup", new SignUpRequest("not-an-email", AuthTestClient.Password, AuthTestClient.Consents));

        Assert.Equal(HttpStatusCode.BadRequest, shortPassword.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badEmail.StatusCode);
    }

    [Fact]
    public async Task Leaked_passwords_are_refused()
    {
        using var client = new AuthTestClient(factory);

        var response = await client.Post("/auth/signup", new SignUpRequest(AuthTestClient.NewEmail(), FakeLeakedPasswordCheck.Leaked, AuthTestClient.Consents));

        await AuthTestClient.AssertError(response, HttpStatusCode.BadRequest, AuthErrorCodes.PasswordLeaked);
    }

    [Fact]
    public async Task A_code_dies_after_5_wrong_tries()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        await client.Post("/auth/signup", new SignUpRequest(email, AuthTestClient.Password, AuthTestClient.Consents));
        var right = client.Code(email, CodePurpose.SignUp);
        var wrong = right == "000000" ? "111111" : "000000";

        for (var i = 1; i <= 4; i++)
        {
            var attempt = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, wrong, device));
            await AuthTestClient.AssertError(attempt, HttpStatusCode.BadRequest, AuthErrorCodes.InvalidCode);
        }

        var fifth = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, wrong, device));
        await AuthTestClient.AssertError(fifth, HttpStatusCode.TooManyRequests, AuthErrorCodes.TooManyAttempts);
        var rightButTooLate = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, right, device));
        await AuthTestClient.AssertError(rightButTooLate, HttpStatusCode.TooManyRequests, AuthErrorCodes.TooManyAttempts);
    }

    [Fact]
    public async Task An_expired_code_does_not_work()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await client.Post("/auth/signup", new SignUpRequest(email, AuthTestClient.Password, AuthTestClient.Consents));
        var normalized = email.ToUpperInvariant();
        await Database(db => db.Set<AuthCode>().Where(c => c.Email == normalized)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)), Ct));

        var verify = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, client.Code(email, CodePurpose.SignUp), AuthTestClient.NewDevice()));

        await AuthTestClient.AssertError(verify, HttpStatusCode.BadRequest, AuthErrorCodes.InvalidCode);
    }

    [Fact]
    public async Task Only_one_code_per_minute_per_email()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await client.Post("/auth/signup", new SignUpRequest(email, AuthTestClient.Password, AuthTestClient.Consents));

        var resend = await client.Post("/auth/code/resend", new ResendCodeRequest(email, CodePurpose.SignUp));

        await AuthTestClient.AssertError(resend, HttpStatusCode.TooManyRequests, AuthErrorCodes.TooManyAttempts);
    }

    [Fact]
    public async Task A_resent_code_replaces_the_old_one_and_keeps_the_sign_up()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await client.Post("/auth/signup", new SignUpRequest(email, AuthTestClient.Password, AuthTestClient.Consents));
        var first = client.Code(email, CodePurpose.SignUp);
        await MoveCodesBack(email, TimeSpan.FromMinutes(2));

        var resend = await client.Post("/auth/code/resend", new ResendCodeRequest(email, CodePurpose.SignUp));
        Assert.Equal(HttpStatusCode.NoContent, resend.StatusCode);
        var second = client.Code(email, CodePurpose.SignUp);

        var device = AuthTestClient.NewDevice();
        if (first != second)
        {
            var old = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, first, device));
            await AuthTestClient.AssertError(old, HttpStatusCode.BadRequest, AuthErrorCodes.InvalidCode);
        }

        var verify = await client.Post("/auth/signup/verify", new VerifyCodeRequest(email, second, device));
        var session = await AuthTestClient.Read<SessionResponse>(verify);
        Assert.Equal(email, session.User.Email);
    }

    [Fact]
    public async Task Login_on_the_sign_up_phone_needs_only_the_password()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        await client.SignUp(email, device);

        var login = await AuthTestClient.Read<LoginResponse>(await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device)));

        Assert.Equal("session", login.Kind);
        Assert.NotNull(login.Session);
    }

    [Fact]
    public async Task Login_on_a_new_phone_needs_a_code_then_trusts_the_phone()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await client.SignUp(email, AuthTestClient.NewDevice());
        var newPhone = AuthTestClient.NewDevice();

        var login = await AuthTestClient.Read<LoginResponse>(await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, newPhone)));
        Assert.Equal("codeRequired", login.Kind);
        Assert.Null(login.Session);

        var verify = await client.Post("/auth/login/verify", new VerifyCodeRequest(email, client.Code(email, CodePurpose.Login), newPhone));
        await AuthTestClient.Read<SessionResponse>(verify);

        var again = await AuthTestClient.Read<LoginResponse>(await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, newPhone)));
        Assert.Equal("session", again.Kind);
    }

    [Fact]
    public async Task A_phone_not_used_for_a_year_needs_a_code_again()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        await client.SignUp(email, device);
        await Database(db => db.Set<TrustedDevice>().Where(d => d.DeviceId == device)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.ExpiresAt, DateTimeOffset.UtcNow.AddDays(-1)), Ct));

        var login = await AuthTestClient.Read<LoginResponse>(await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device)));

        Assert.Equal("codeRequired", login.Kind);
    }

    [Fact]
    public async Task Wrong_password_is_refused_and_5_in_a_row_lock_the_account()
    {
        using var client = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        await client.SignUp(email, device);

        for (var i = 1; i <= 4; i++)
        {
            var wrong = await client.Post("/auth/login", new LoginRequest(email, "wrong password!", device));
            await AuthTestClient.AssertError(wrong, HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidCredentials);
        }

        var fifth = await client.Post("/auth/login", new LoginRequest(email, "wrong password!", device));
        await AuthTestClient.AssertError(fifth, HttpStatusCode.TooManyRequests, AuthErrorCodes.TooManyAttempts);
        var right = await client.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device));
        await AuthTestClient.AssertError(right, HttpStatusCode.TooManyRequests, AuthErrorCodes.TooManyAttempts);
    }

    [Fact]
    public async Task Unknown_email_gets_the_same_answer_as_a_wrong_password()
    {
        using var client = new AuthTestClient(factory);

        var login = await client.Post("/auth/login", new LoginRequest(AuthTestClient.NewEmail(), AuthTestClient.Password, AuthTestClient.NewDevice()));

        await AuthTestClient.AssertError(login, HttpStatusCode.Unauthorized, AuthErrorCodes.InvalidCredentials);
    }

    private async Task Database(Func<AppDbContext, Task> action)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private Task MoveCodesBack(string email, TimeSpan by)
    {
        var normalized = email.ToUpperInvariant();
        return Database(db => db.Set<AuthCode>().Where(c => c.Email == normalized)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, c => c.CreatedAt - by), Ct));
    }
}
