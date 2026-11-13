using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using TravelApp.Api.Features.Admin;
using TravelApp.Api.Features.AppConfig;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Tests.Features.Auth;
using TravelApp.Api.Tests.Infrastructure;
using static TravelApp.Api.Tests.Features.Admin.AdminTestClient;

namespace TravelApp.Api.Tests.Features.Admin;

/// <summary>Back office (KAN-55): login with 2FA, roles, accounts, settings, team and the audit log.</summary>
public sealed class AdminTests(ApiFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private Task<HttpResponseMessage> Login(string email, string password)
    {
        var http = factory.CreateClient();
        return http.PostAsJsonAsync(new Uri("/admin/auth/login", UriKind.Relative), new AdminLoginRequest(email, password), Ct);
    }

    private Task<HttpResponseMessage> Verify(string challenge, string code) =>
        factory.CreateClient().PostAsJsonAsync(new Uri("/admin/auth/verify", UriKind.Relative), new AdminVerifyRequest(challenge, code), Ct);

    [Fact]
    public async Task Wrong_password_and_accounts_outside_the_team_get_the_same_answer()
    {
        await OwnerAsync(factory);
        using var auth = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        await auth.SignUp(email, AuthTestClient.NewDevice());

        await AuthTestClient.AssertError(await Login(email, AuthTestClient.Password), HttpStatusCode.Unauthorized, AdminErrorCodes.InvalidCredentials);
        await AuthTestClient.AssertError(await Login(ApiFactory.AdminOwnerEmail, "not the password"), HttpStatusCode.Unauthorized, AdminErrorCodes.InvalidCredentials);
        await AuthTestClient.AssertError(await Login("nobody@example.com", "whatever password"), HttpStatusCode.Unauthorized, AdminErrorCodes.InvalidCredentials);
    }

    [Fact]
    public async Task First_login_sets_up_the_authenticator_and_a_code_works_only_once()
    {
        var member = await MemberAsync(factory, AdminRoles.Viewer);
        using var me = await Send(factory, member, HttpMethod.Get, "/admin/me");
        var dto = await AuthTestClient.Read<AdminMeDto>(me);
        Assert.Equal(AdminRoles.Viewer, dto.Role);
        Assert.Equal(member.Email, dto.Email);

        // Second login: no setup any more, a code is asked. The code used at setup cannot be used again.
        var login = await AuthTestClient.Read<AdminLoginResponse>(await Login(member.Email, AuthTestClient.Password));
        Assert.Equal("codeRequired", login.Kind);
        Assert.Null(login.Secret);
        var usedStep = Totp.StepAt(DateTimeOffset.UtcNow);
        var reused = await Verify(login.Challenge, Totp.Code(member.Secret, usedStep));
        var next = await Verify(login.Challenge, Totp.Code(member.Secret, usedStep + 1));
        // Either the setup used this step (then "reused" fails) or the previous one (then it works); the next step always works once.
        Assert.True(reused.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.OK);
        Assert.Equal(HttpStatusCode.OK, next.StatusCode);
        await AuthTestClient.AssertError(await Verify(login.Challenge, Totp.Code(member.Secret, usedStep + 1)), HttpStatusCode.BadRequest, AdminErrorCodes.InvalidCode);
    }

    [Fact]
    public async Task Five_wrong_codes_lock_the_member_for_a_while()
    {
        var member = await MemberAsync(factory, AdminRoles.Viewer);
        var login = await AuthTestClient.Read<AdminLoginResponse>(await Login(member.Email, AuthTestClient.Password));
        for (var i = 0; i < 4; i++)
        {
            await AuthTestClient.AssertError(await Verify(login.Challenge, "000000"), HttpStatusCode.BadRequest, AdminErrorCodes.InvalidCode);
        }

        await AuthTestClient.AssertError(await Verify(login.Challenge, "000000"), HttpStatusCode.TooManyRequests, AdminErrorCodes.TooManyAttempts);
        await AuthTestClient.AssertError(await Verify(login.Challenge, CodeNow(member.Secret, 1)), HttpStatusCode.TooManyRequests, AdminErrorCodes.TooManyAttempts);
    }

    [Fact]
    public async Task App_tokens_and_back_office_tokens_cannot_be_swapped()
    {
        var owner = await OwnerAsync(factory);
        using var auth = new AuthTestClient(factory);
        var session = await auth.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        using var adminWithAppToken = await SendWithToken(factory, session.AccessToken, HttpMethod.Get, "/admin/me");
        Assert.Equal(HttpStatusCode.Unauthorized, adminWithAppToken.StatusCode);
        using var appWithAdminToken = await auth.GetMe(owner.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, appWithAdminToken.StatusCode);
        using var noToken = await factory.CreateClient().GetAsync(new Uri("/admin/dashboard", UriKind.Relative), Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, noToken.StatusCode);
    }

    [Fact]
    public async Task Viewers_see_the_dashboard_but_not_accounts()
    {
        var viewer = await MemberAsync(factory, AdminRoles.Viewer);
        var dashboard = await AuthTestClient.Read<AdminDashboardDto>(await Send(factory, viewer, HttpMethod.Get, "/admin/dashboard"));
        Assert.True(dashboard.Users.Total >= 1);
        Assert.Equal(30, dashboard.Users.SignUpsPerDay.Count);
        Assert.Contains(dashboard.Content, m => m.Key == "trips");
        Assert.Contains(dashboard.Content, m => m.Key == "photos");

        using var users = await Send(factory, viewer, HttpMethod.Get, "/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, users.StatusCode);
        using var config = await Send(factory, viewer, HttpMethod.Put, "/admin/config", new UpdateAppConfigRequest("1.0.0", 15, 1, [], [], 1));
        Assert.Equal(HttpStatusCode.Forbidden, config.StatusCode);
    }

    [Fact]
    public async Task Support_finds_accounts_with_masked_emails_and_sees_the_full_email_only_on_the_account()
    {
        var support = await MemberAsync(factory, AdminRoles.Support);
        using var auth = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var session = await auth.SignUp(email, AuthTestClient.NewDevice());

        var page = await AuthTestClient.Read<AdminUserPageDto>(await Send(factory, support, HttpMethod.Get, $"/admin/users?q={email[..15]}"));
        var row = Assert.Single(page.Users);
        Assert.Equal(session.User.Id, row.Id);
        Assert.Equal("u***@example.com", row.MaskedEmail);

        var user = await AuthTestClient.Read<AdminUserDto>(await Send(factory, support, HttpMethod.Get, $"/admin/users/{session.User.Id}"));
        Assert.Equal(email, user.Email);
        Assert.Equal("active", user.Status);
        Assert.Equal(1, user.ActiveSessions);
        Assert.Contains(user.Counts, c => c.Key == "trips" && c.Value == 0);

        using var missing = await Send(factory, support, HttpMethod.Get, $"/admin/users/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        using var export = await Send(factory, support, HttpMethod.Get, $"/admin/users/{session.User.Id}/export");
        Assert.Equal(HttpStatusCode.Forbidden, export.StatusCode);
    }

    [Fact]
    public async Task Suspending_blocks_login_and_refresh_until_it_is_lifted()
    {
        var support = await MemberAsync(factory, AdminRoles.Support);
        using var auth = new AuthTestClient(factory);
        var email = AuthTestClient.NewEmail();
        var device = AuthTestClient.NewDevice();
        var session = await auth.SignUp(email, device);

        using var suspend = await Send(factory, support, HttpMethod.Post, $"/admin/users/{session.User.Id}/suspend", new SuspendUserRequest("abuse"));
        Assert.Equal(HttpStatusCode.NoContent, suspend.StatusCode);

        await AuthTestClient.AssertError(await auth.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device)),
            HttpStatusCode.Forbidden, AuthErrorCodes.AccountSuspended);
        using var refresh = await auth.Post("/auth/refresh", new RefreshRequest(session.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        var user = await AuthTestClient.Read<AdminUserDto>(await Send(factory, support, HttpMethod.Get, $"/admin/users/{session.User.Id}"));
        Assert.Equal("suspended", user.Status);
        Assert.Equal("abuse", user.SuspensionReason);
        Assert.Equal(0, user.ActiveSessions);

        using var lift = await Send(factory, support, HttpMethod.Post, $"/admin/users/{session.User.Id}/unsuspend");
        Assert.Equal(HttpStatusCode.NoContent, lift.StatusCode);
        var login = await AuthTestClient.Read<LoginResponse>(await auth.Post("/auth/login", new LoginRequest(email, AuthTestClient.Password, device)));
        Assert.Equal("session", login.Kind);
    }

    [Fact]
    public async Task Suspend_reason_must_be_a_code_and_team_members_cannot_be_suspended()
    {
        var support = await MemberAsync(factory, AdminRoles.Support);
        var other = await MemberAsync(factory, AdminRoles.Viewer);

        using var freeText = await Send(factory, support, HttpMethod.Post, $"/admin/users/{other.UserId}/suspend", new SuspendUserRequest("he was rude to me"));
        Assert.Equal(HttpStatusCode.BadRequest, freeText.StatusCode);
        await AuthTestClient.AssertError(
            await Send(factory, support, HttpMethod.Post, $"/admin/users/{other.UserId}/suspend", new SuspendUserRequest("abuse")),
            HttpStatusCode.Conflict, AdminErrorCodes.IsAdmin);
    }

    [Fact]
    public async Task Owner_exports_and_erases_an_account_on_request()
    {
        var owner = await OwnerAsync(factory);
        using var auth = new AuthTestClient(factory);
        var session = await auth.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());

        using var export = await Send(factory, owner, HttpMethod.Get, $"/admin/users/{session.User.Id}/export");
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        Assert.Equal("no-store", export.Headers.CacheControl?.ToString());
        using (var json = JsonDocument.Parse(await export.Content.ReadAsStringAsync(Ct)))
        {
            Assert.True(json.RootElement.GetProperty("data").TryGetProperty("account", out _));
        }

        using var noConfirm = await Send(factory, owner, HttpMethod.Post, $"/admin/users/{session.User.Id}/erase", new EraseUserRequest("yes"));
        Assert.Equal(HttpStatusCode.BadRequest, noConfirm.StatusCode);
        using var erase = await Send(factory, owner, HttpMethod.Post, $"/admin/users/{session.User.Id}/erase", new EraseUserRequest("ERASE"));
        Assert.Equal(HttpStatusCode.NoContent, erase.StatusCode);
        using var gone = await Send(factory, owner, HttpMethod.Get, $"/admin/users/{session.User.Id}");
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    [Fact]
    public async Task Settings_save_with_the_version_they_started_from_and_the_phone_reads_them()
    {
        var owner = await OwnerAsync(factory);
        var http = factory.CreateClient();
        var before = (await http.GetFromJsonAsync<AppConfigDto>(new Uri("/app-config", UriKind.Relative), Ct))!;

        var request = new UpdateAppConfigRequest("1.2.0", 12, 2, new() { ["free"] = "compressed", ["paid"] = "full" },
            new() { ["printAlbumEnabled"] = false, ["tripVideoEnabled"] = true }, before.Version);
        var saved = await AuthTestClient.Read<AppConfigDto>(await Send(factory, owner, HttpMethod.Put, "/admin/config", request));
        Assert.Equal(before.Version + 1, saved.Version);

        var after = (await http.GetFromJsonAsync<AppConfigDto>(new Uri("/app-config", UriKind.Relative), Ct))!;
        Assert.Equal("1.2.0", after.MinAppVersion);
        Assert.True(after.FeatureFlags["tripVideoEnabled"]);

        await AuthTestClient.AssertError(await Send(factory, owner, HttpMethod.Put, "/admin/config", request), HttpStatusCode.Conflict, AdminErrorCodes.Conflict);
        await AuthTestClient.AssertError(
            await Send(factory, owner, HttpMethod.Put, "/admin/config", request with { Version = saved.Version, FeatureFlags = new() { ["Bad Name"] = true } }),
            HttpStatusCode.BadRequest, AdminErrorCodes.Invalid);
        using var badVersion = await Send(factory, owner, HttpMethod.Put, "/admin/config", request with { MinAppVersion = "one" });
        Assert.Equal(HttpStatusCode.BadRequest, badVersion.StatusCode);

        // Put it back for the other tests.
        using var reset = await Send(factory, owner, HttpMethod.Put, "/admin/config",
            new UpdateAppConfigRequest(before.MinAppVersion, before.MaxPhotoSizeMb, before.FreeTripLimit,
                new(before.PhotoQualityByPlan), new(before.FeatureFlags), saved.Version));
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
    }

    [Fact]
    public async Task Removing_a_member_works_at_once_and_the_last_owner_stays()
    {
        var owner = await OwnerAsync(factory);
        var support = await MemberAsync(factory, AdminRoles.Support);

        using var remove = await Send(factory, owner, HttpMethod.Delete, $"/admin/members/{support.UserId}");
        Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        using var after = await Send(factory, support, HttpMethod.Get, "/admin/me");
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);

        await AuthTestClient.AssertError(await Send(factory, owner, HttpMethod.Delete, $"/admin/members/{owner.UserId}"),
            HttpStatusCode.Conflict, AdminErrorCodes.LastOwner);
        await AuthTestClient.AssertError(
            await Send(factory, owner, HttpMethod.Put, $"/admin/members/{owner.UserId}", new ChangeAdminRoleRequest(AdminRoles.Viewer)),
            HttpStatusCode.Conflict, AdminErrorCodes.LastOwner);

        // Accounts without a password (Google/Apple only) cannot be added: the back office login needs one.
        await AuthTestClient.AssertError(
            await Send(factory, owner, HttpMethod.Post, "/admin/members", new AddAdminMemberRequest("nobody@example.com", AdminRoles.Viewer)),
            HttpStatusCode.BadRequest, AdminErrorCodes.NeedsPassword);
    }

    [Fact]
    public async Task Every_action_is_in_the_audit_log_without_personal_data()
    {
        var owner = await OwnerAsync(factory);
        var support = await MemberAsync(factory, AdminRoles.Support);
        using var auth = new AuthTestClient(factory);
        var session = await auth.SignUp(AuthTestClient.NewEmail(), AuthTestClient.NewDevice());
        (await Send(factory, support, HttpMethod.Get, $"/admin/users/{session.User.Id}")).Dispose();
        (await Send(factory, support, HttpMethod.Post, $"/admin/users/{session.User.Id}/sign-out")).Dispose();

        using var forbidden = await Send(factory, support, HttpMethod.Get, "/admin/audit");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var page = await AuthTestClient.Read<AdminAuditPageDto>(await Send(factory, owner, HttpMethod.Get, "/admin/audit"));
        Assert.Contains(page.Entries, e => e.Action == AdminActions.UserViewed && e.TargetId == session.User.Id.ToString() && e.AdminUserId == support.UserId);
        Assert.Contains(page.Entries, e => e.Action == AdminActions.UserSignedOut && e.TargetId == session.User.Id.ToString());
        Assert.All(page.Entries, e => Assert.DoesNotContain("@example.com", e.Details ?? "", StringComparison.Ordinal));
        Assert.All(page.Entries, e => Assert.DoesNotContain("@example.com", e.TargetId ?? "", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Status_page_lists_every_outside_service_with_its_plan()
    {
        var viewer = await MemberAsync(factory, AdminRoles.Viewer);
        var status = await AuthTestClient.Read<AdminServicesDto>(await Send(factory, viewer, HttpMethod.Get, "/admin/services?refresh=true"));
        var keys = status.Services.Select(s => s.Key).ToList();
        foreach (var key in new[] { "database", "email", "fx", "map-tiles", "place-search", "powersync", "storage", "weather" })
        {
            Assert.Contains(key, keys);
        }

        Assert.Equal(ServiceStates.Ok, status.Services.Single(s => s.Key == "database").State);
        Assert.Equal(ServiceStates.Ok, status.Services.Single(s => s.Key == "weather").State);
        Assert.Equal(ServiceStates.NotConfigured, status.Services.Single(s => s.Key == "powersync").State);
        Assert.All(status.Services, s => Assert.False(string.IsNullOrEmpty(s.BeforeLaunch)));
    }

    [Fact]
    public async Task The_back_office_web_app_on_localhost_may_call_admin_in_development()
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, new Uri("/admin/auth/login", UriKind.Relative));
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        using var response = await factory.CreateClient().SendAsync(request, Ct);
        Assert.Equal("http://localhost:5173", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
    }
}
