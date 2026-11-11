namespace TravelApp.Api.Features.Auth;

/// <summary>Sends the 6-digit codes.</summary>
public interface IAuthEmailSender
{
    Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct);
}

/// <summary>
/// Development (A6): the code is written to the API log, no email is sent.
/// Replaced by Azure Communication Services from the beta (switch list in decisions/releases.md).
/// </summary>
internal sealed partial class LogAuthEmailSender(ILogger<LogAuthEmailSender> logger) : IAuthEmailSender
{
    public Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct)
    {
        LogCode(email, purpose, code);
        return Task.CompletedTask;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "[dev email] {Purpose} code for {Email}: {Code}")]
    private partial void LogCode(string email, string purpose, string code);
}
