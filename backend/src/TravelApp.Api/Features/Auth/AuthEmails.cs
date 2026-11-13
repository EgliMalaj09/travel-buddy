namespace TravelApp.Api.Features.Auth;

/// <summary>Sends the 6-digit codes.</summary>
public interface IAuthEmailSender
{
    Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct);
}

/// <summary>
/// Development (A6): the code is written to the API log, no email is sent.
/// Replaced by Azure Communication Services from the beta (switch list in decisions/releases.md).
/// GDPR core rule: the email address is never logged. The code is shown only in Development,
/// so you can log in on your own computer; anywhere else only "a code was made" is logged.
/// </summary>
internal sealed partial class LogAuthEmailSender(ILogger<LogAuthEmailSender> logger, IHostEnvironment env) : IAuthEmailSender
{
    public Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct)
    {
        if (env.IsDevelopment()) LogCode(purpose, code);
        else LogCodeHidden(purpose);
        return Task.CompletedTask;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "[dev email] {Purpose} code: {Code}")]
    private partial void LogCode(string purpose, string code);

    [LoggerMessage(Level = LogLevel.Warning, Message = "[dev email] {Purpose} code made; not shown outside Development and no email sent")]
    private partial void LogCodeHidden(string purpose);
}
