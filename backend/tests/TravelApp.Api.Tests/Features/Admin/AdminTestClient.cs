using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TravelApp.Api.Features.Admin;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Admin;

/// <summary>A logged-in back office member for tests.</summary>
internal sealed record AdminSession(Guid UserId, string Email, string Token, byte[] Secret);

/// <summary>Back office login and calls. The owner logs in once per test run (a code can be used once only).</summary>
internal static class AdminTestClient
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static AdminSession? _owner;

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public static async Task<AdminSession> OwnerAsync(ApiFactory factory)
    {
        await Gate.WaitAsync(Ct);
        try
        {
            if (_owner is not null) return _owner;
            using var auth = new AuthTestClient(factory);
            var session = await auth.SignUp(ApiFactory.AdminOwnerEmail, AuthTestClient.NewDevice());
            _owner = await LoginWithSetupAsync(factory, ApiFactory.AdminOwnerEmail, session.User.Id);
            return _owner;
        }
        finally
        {
            Gate.Release();
        }
    }

    /// <summary>A new account, added to the team by the owner with this role, logged in.</summary>
    public static async Task<AdminSession> MemberAsync(ApiFactory factory, string role)
    {
        var owner = await OwnerAsync(factory);
        var email = AuthTestClient.NewEmail();
        using var auth = new AuthTestClient(factory);
        var session = await auth.SignUp(email, AuthTestClient.NewDevice());
        using var add = await Send(factory, owner, HttpMethod.Post, "/admin/members", new AddAdminMemberRequest(email, role));
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);
        return await LoginWithSetupAsync(factory, email, session.User.Id);
    }

    public static async Task<AdminSession> LoginWithSetupAsync(ApiFactory factory, string email, Guid userId)
    {
        using var http = factory.CreateClient();
        var login = await AuthTestClient.Read<AdminLoginResponse>(
            await http.PostAsJsonAsync(new Uri("/admin/auth/login", UriKind.Relative), new AdminLoginRequest(email, AuthTestClient.Password), Ct));
        Assert.Equal("setupRequired", login.Kind);
        var secret = Totp.FromBase32(login.Secret!);
        var verified = await AuthTestClient.Read<AdminSessionResponse>(await http.PostAsJsonAsync(
            new Uri("/admin/auth/verify", UriKind.Relative), new AdminVerifyRequest(login.Challenge, CodeNow(secret)), Ct));
        Assert.Equal(userId, verified.Me.UserId);
        return new AdminSession(userId, email, verified.AccessToken, secret);
    }

    public static string CodeNow(byte[] secret, int stepOffset = 0) =>
        Totp.Code(secret, Totp.StepAt(DateTimeOffset.UtcNow) + stepOffset);

    public static Task<HttpResponseMessage> Send(ApiFactory factory, AdminSession admin, HttpMethod method, string url, object? body = null) =>
        SendWithToken(factory, admin.Token, method, url, body);

    public static async Task<HttpResponseMessage> SendWithToken(ApiFactory factory, string token, HttpMethod method, string url, object? body = null)
    {
        using var http = factory.CreateClient();
        using var request = new HttpRequestMessage(method, new Uri(url, UriKind.Relative));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null) request.Content = JsonContent.Create(body, body.GetType());
        return await http.SendAsync(request, Ct);
    }
}
