using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using TravelApp.Api.Shared;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Sign-up, login and profile setup (decisions/features/01-login-onboarding.md).
/// Everything under /auth and /.well-known is public on purpose (no token yet); /me needs a token.
/// </summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Errors are ProblemDetails with a "code" field (AuthErrorCodes); 400 also covers input validation.
        var auth = app.MapGroup("/auth").WithTags("Auth").AllowAnonymous().RequireRateLimiting(AuthSetup.RateLimitPolicy)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status410Gone)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        auth.MapPost("/signup", SignUp).WithName("SignUp")
            .WithSummary("Email sign-up, step 1: checks the password and sends a 6-digit code to the email");
        auth.MapPost("/signup/verify", VerifySignUp).WithName("VerifySignUp")
            .WithSummary("Email sign-up, step 2: code from the email; creates the account and trusts this phone");
        auth.MapPost("/login", Login).WithName("Login")
            .WithSummary("Email + password. Returns a session, or codeRequired on a phone that is not trusted yet");
        auth.MapPost("/login/verify", VerifyLogin).WithName("VerifyLogin")
            .WithSummary("Code from the new-phone email; logs in and trusts this phone for 1 year");
        auth.MapPost("/google", (SocialLoginRequest r, AuthService s, CancellationToken ct) => Social(AuthProvider.Google, r, s, ct))
            .WithName("LoginWithGoogle").WithSummary("Google ID token; logs in or creates the account");
        auth.MapPost("/apple", (SocialLoginRequest r, AuthService s, CancellationToken ct) => Social(AuthProvider.Apple, r, s, ct))
            .WithName("LoginWithApple").WithSummary("Apple ID token; logs in or creates the account");
        auth.MapPost("/code/resend", ResendCode).WithName("ResendCode")
            .WithSummary("Sends a new code for a sign-up or new-phone login (1 per minute, 5 per hour)");
        auth.MapPost("/password/forgot", ForgotPassword).WithName("ForgotPassword")
            .WithSummary("Sends a reset code when the account exists (same answer when it does not)");
        auth.MapPost("/password/reset", ResetPassword).WithName("ResetPassword")
            .WithSummary("Code + new password. Ends all sessions; log in again afterwards");
        auth.MapPost("/refresh", Refresh).WithName("RefreshSession")
            .WithSummary("Exchanges the refresh token for a new access and refresh token");
        auth.MapPost("/logout", Logout).WithName("Logout").WithSummary("Ends this phone's session");

        app.MapGet("/.well-known/jwks.json", (SigningKeys keys) => TypedResults.Ok(new JwksResponse([keys.PublicJwk()])))
            .WithTags("Auth").WithName("GetJwks").WithSummary("Public keys of our access tokens (for PowerSync)")
            .AllowAnonymous();

        var me = app.MapGroup("/me").WithTags("Me").RequireAuthorization()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);
        me.MapGet("/", GetMe).WithName("GetMe").WithSummary("The logged-in user");
        me.MapPost("/profile", SaveProfile).WithName("SaveProfile")
            .WithSummary("Profile setup: first name, countries, home currency (and consents for Google/Apple users). Also used to edit the profile");
        me.MapPost("/delete", RequestDeletion).WithName("DeleteAccount")
            .WithSummary("Delete my account: body {confirm: \"DELETE\"}. Ends every session now; everything is erased after 30 days unless restored");
        me.MapPost("/restore", Restore).WithName("RestoreAccount")
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status410Gone)
            .WithSummary("Undo \"Delete my account\" during the 30 days (log in first)");

        return app;
    }

    internal static async Task<Results<NoContent, ProblemHttpResult>> SignUp(SignUpRequest request, AuthService service, CancellationToken ct) =>
        NoContentOr(await service.SignUpAsync(request, ct));

    internal static async Task<Results<Ok<SessionResponse>, ProblemHttpResult>> VerifySignUp(VerifyCodeRequest request, AuthService service, CancellationToken ct) =>
        OkOr(await service.VerifySignUpAsync(request, ct));

    internal static async Task<Results<Ok<LoginResponse>, ProblemHttpResult>> Login(LoginRequest request, AuthService service, CancellationToken ct) =>
        OkOr(await service.LoginAsync(request, ct));

    internal static async Task<Results<Ok<SessionResponse>, ProblemHttpResult>> VerifyLogin(VerifyCodeRequest request, AuthService service, CancellationToken ct) =>
        OkOr(await service.VerifyLoginAsync(request, ct));

    internal static async Task<Results<Ok<SessionResponse>, ProblemHttpResult>> Social(string provider, SocialLoginRequest request, AuthService service, CancellationToken ct) =>
        OkOr(await service.SocialLoginAsync(provider, request, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> ResendCode(ResendCodeRequest request, AuthService service, CancellationToken ct) =>
        NoContentOr(await service.ResendCodeAsync(request, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> ForgotPassword(ForgotPasswordRequest request, AuthService service, CancellationToken ct) =>
        NoContentOr(await service.ForgotPasswordAsync(request, ct));

    internal static async Task<Results<NoContent, ProblemHttpResult>> ResetPassword(ResetPasswordRequest request, AuthService service, CancellationToken ct) =>
        NoContentOr(await service.ResetPasswordAsync(request, ct));

    internal static async Task<Results<Ok<SessionResponse>, ProblemHttpResult>> Refresh(RefreshRequest request, SessionService sessions, CancellationToken ct) =>
        await sessions.RefreshAsync(request.RefreshToken, ct) switch
        {
            { Session: { } session } => TypedResults.Ok(session),
            { AccountDeleted: true } => Problem(AuthService.AccountDeleted),
            _ => Problem(AuthService.SessionExpired),
        };

    internal static async Task<NoContent> Logout(LogoutRequest request, SessionService sessions, CancellationToken ct)
    {
        await sessions.LogoutAsync(request.RefreshToken, ct);
        return TypedResults.NoContent();
    }

    internal static async Task<Results<Ok<AuthUserResponse>, ProblemHttpResult>> GetMe(ClaimsPrincipal user, AuthService service, CancellationToken ct) =>
        OkOr(await service.GetMeAsync(user.UserId(), ct));

    internal static async Task<Results<Ok<AuthUserResponse>, ProblemHttpResult>> SaveProfile(ProfileRequest request, ClaimsPrincipal user, AuthService service, CancellationToken ct) =>
        OkOr(await service.SaveProfileAsync(user.UserId(), request, ct));

    internal static async Task<Results<Ok<AuthUserResponse>, ProblemHttpResult>> RequestDeletion(DeleteAccountRequest request, ClaimsPrincipal user, AccountDeletionService service, CancellationToken ct) =>
        OkOr(await service.RequestAsync(user.UserId(), ct));

    internal static async Task<Results<Ok<AuthUserResponse>, ProblemHttpResult>> Restore(ClaimsPrincipal user, AccountDeletionService service, CancellationToken ct) =>
        OkOr(await service.RestoreAsync(user.UserId(), ct));

    private static Results<Ok<T>, ProblemHttpResult> OkOr<T>(AuthResult<T> result) =>
        result.Error is { } error ? Problem(error) : TypedResults.Ok(result.Value!);

    private static Results<NoContent, ProblemHttpResult> NoContentOr<T>(AuthResult<T> result) =>
        result.Error is { } error ? Problem(error) : TypedResults.NoContent();

    private static ProblemHttpResult Problem(AuthFailure error) =>
        TypedResults.Problem(title: error.Title, statusCode: error.Status, extensions: new Dictionary<string, object?> { ["code"] = error.Code });
}
