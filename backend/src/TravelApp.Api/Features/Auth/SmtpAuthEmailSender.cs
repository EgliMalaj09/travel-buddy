using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Settings in the "Email" section (KAN-61). When <see cref="Host"/> is empty the codes go to the API log
/// (<see cref="LogAuthEmailSender"/>, development only). The password comes from an environment setting, never the repository.
/// Works with any mail service that offers SMTP with a user name and password on port 587 (STARTTLS), for example
/// Azure Communication Services or Brevo (decisions/features/18-ship-part-1.md, S-c).
/// </summary>
public sealed class EmailOptions
{
    public const string Section = "Email";

    public string? Host { get; set; }

    public int Port { get; set; } = 587;

    public string? UserName { get; set; }

    public string? Password { get; set; }

    /// <summary>Sender address, for example no-reply@yourdomain.eu (must be verified at the mail service).</summary>
    public string? From { get; set; }

    public string FromName { get; set; } = "Travel App";

    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(15);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);
}

/// <summary>Subject and text of a code email. Kept apart from sending so it can be tested.</summary>
internal static class CodeEmail
{
    public static (string Subject, string Text, string Html) Build(string purpose, string code, string appName)
    {
        var (subject, line) = purpose switch
        {
            CodePurpose.SignUp => ($"Your {appName} sign-up code", "Use this code to finish creating your account:"),
            CodePurpose.Reset => ($"Your {appName} password reset code", "Use this code to choose a new password:"),
            _ => ($"Your {appName} login code", "Use this code to log in:"),
        };
        const string after = "It works for 10 minutes. If you did not ask for it, you can ignore this email.";
        var text = $"{line}\n\n{code}\n\n{after}\n";
        var html = $"<p>{WebUtility.HtmlEncode(line)}</p>"
            + $"<p style=\"font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace\">{code}</p>"
            + $"<p>{WebUtility.HtmlEncode(after)}</p>";
        // The code is not in the subject, so it does not show on a locked phone's notification.
        return (subject, text, html);
    }
}

/// <summary>
/// Sends the 6-digit codes by SMTP (beta and production). Uses .NET's own SmtpClient: no extra library.
/// GDPR core rule: the address, the code and the server's reply text are never logged, only the purpose and
/// the SMTP status number. Errors thrown from here carry no address either (SmtpFailedRecipientException
/// messages contain it, so they are replaced).
/// </summary>
internal sealed partial class SmtpAuthEmailSender(IOptions<EmailOptions> options, ILogger<SmtpAuthEmailSender> logger) : IAuthEmailSender
{
    public async Task SendCodeAsync(string email, string purpose, string code, CancellationToken ct)
    {
        var o = options.Value;
        var (subject, text, html) = CodeEmail.Build(purpose, code, o.FromName);

        using var message = new MailMessage
        {
            From = new MailAddress(o.From!, o.FromName),
            Subject = subject,
            Body = text,
            IsBodyHtml = false,
        };
        message.To.Add(email);
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(html, null, "text/html"));

        using var client = new SmtpClient(o.Host, o.Port)
        {
            EnableSsl = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = new NetworkCredential(o.UserName, o.Password),
            Timeout = (int)o.Timeout.TotalMilliseconds,
        };

        try
        {
            await client.SendMailAsync(message, ct);
        }
        catch (SmtpException e)
        {
            LogFailed(purpose, (int)e.StatusCode);
            throw new InvalidOperationException($"The {purpose} code email could not be sent (SMTP status {(int)e.StatusCode}).");
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Code email ({Purpose}) not sent, SMTP status {Status}")]
    private partial void LogFailed(string purpose, int status);
}
