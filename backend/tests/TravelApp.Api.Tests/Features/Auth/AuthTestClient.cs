using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;

namespace TravelApp.Api.Tests.Features.Auth;

/// <summary>Small helper around the /auth endpoints so each test reads like the app's flow.</summary>
internal sealed class AuthTestClient(ApiFactory factory) : IDisposable
{
    public const string Password = "correct horse battery";

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public HttpClient Http { get; } = factory.CreateClient();

    public static string NewEmail() => $"user-{Guid.NewGuid():N}@example.com";

    public static string NewDevice() => $"device-{Guid.NewGuid():N}";

    public static ConsentsDto Consents => new(true, true, false);

    public Task<HttpResponseMessage> Post(string url, object body) =>
        Http.PostAsJsonAsync(new Uri(url, UriKind.Relative), body, Ct);

    public string Code(string email, string purpose) =>
        factory.Emails.LastCode(email, purpose) ?? throw new InvalidOperationException($"No {purpose} code for {email}");

    /// <summary>Sign-up with email, code and this phone.</summary>
    public async Task<SessionResponse> SignUp(string email, string device, string password = Password)
    {
        var start = await Post("/auth/signup", new SignUpRequest(email, password, Consents));
        Assert.Equal(HttpStatusCode.NoContent, start.StatusCode);
        var verify = await Post("/auth/signup/verify", new VerifyCodeRequest(email, Code(email, CodePurpose.SignUp), device, "Test phone"));
        return await Read<SessionResponse>(verify);
    }

    public async Task<HttpResponseMessage> GetMe(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/me", UriKind.Relative));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await Http.SendAsync(request, Ct);
    }

    public async Task<HttpResponseMessage> SaveProfile(string accessToken, ProfileRequest profile)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/me/profile", UriKind.Relative))
        {
            Content = JsonContent.Create(profile),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await Http.SendAsync(request, Ct);
    }

    public static async Task<T> Read<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync(Ct)}");
        return (await response.Content.ReadFromJsonAsync<T>(Ct))!;
    }

    /// <summary>Checks an error response: status and the "code" field of the ProblemDetails.</summary>
    public static async Task AssertError(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        var body = await response.Content.ReadAsStringAsync(Ct);
        Assert.True(status == response.StatusCode, $"Expected {status}, got {(int)response.StatusCode}: {body}");
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var json = JsonDocument.Parse(body);
        Assert.Equal(code, json.RootElement.GetProperty("code").GetString());
    }

    public void Dispose() => Http.Dispose();
}
