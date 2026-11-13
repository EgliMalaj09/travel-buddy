using TravelApp.Api.Features.Admin;

namespace TravelApp.Api.Features.Auth;

/// <summary>How login codes are sent, for the status page (KAN-55).</summary>
internal sealed class EmailStatusCheck(IAuthEmailSender sender) : IServiceStatusCheck
{
    public Task<ServiceStatusDto> CheckAsync(HttpClient http, CancellationToken ct)
    {
        var logOnly = sender is LogAuthEmailSender;
        return Task.FromResult(new ServiceStatusDto("email", logOnly ? "Codes in the API log" : "Email service", "Login and reset codes",
            logOnly ? ServiceStates.DevOnly : ServiceStates.Ok, null,
            logOnly ? "No email is sent; the code is written to the API log (development only)" : "Sends real emails",
            "Beta: Azure Communication Services sends the codes (switch list)"));
    }
}
