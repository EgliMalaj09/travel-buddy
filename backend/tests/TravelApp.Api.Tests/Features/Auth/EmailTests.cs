using System.Net;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TravelApp.Api.Features.Auth;

namespace TravelApp.Api.Tests.Features.Auth;

/// <summary>Real code emails (KAN-61): the text, and that a failed send never shows the address (GDPR core rule).</summary>
public sealed class EmailTests
{
    [Theory]
    [InlineData(CodePurpose.SignUp, "sign-up")]
    [InlineData(CodePurpose.Login, "login")]
    [InlineData(CodePurpose.Reset, "password reset")]
    public void The_email_has_the_code_in_the_body_but_not_in_the_subject(string purpose, string word)
    {
        var (subject, text, html) = CodeEmail.Build(purpose, "042917", "Travel App");

        Assert.Contains(word, subject);
        Assert.DoesNotContain("042917", subject);
        Assert.Contains("042917", text);
        Assert.Contains("042917", html);
        Assert.Contains("10 minutes", text);
    }

    [Fact]
    public async Task A_failed_send_logs_and_throws_without_the_address_or_code()
    {
        using var server = new RefusingSmtpServer();
        var logs = new ListLogger();
        var sender = new SmtpAuthEmailSender(
            Options.Create(new EmailOptions { Host = "127.0.0.1", Port = server.Port, UserName = "u", Password = "p", From = "no-reply@example.com" }),
            logs);

        var error = await Assert.ThrowsAnyAsync<Exception>(() =>
            sender.SendCodeAsync("private.person@example.com", CodePurpose.Login, "123987", TestContext.Current.CancellationToken));

        Assert.DoesNotContain("private.person", error.ToString());
        Assert.DoesNotContain("123987", error.ToString());
        Assert.All(logs.Lines, l =>
        {
            Assert.DoesNotContain("private.person", l);
            Assert.DoesNotContain("123987", l);
        });
    }

    /// <summary>Answers like a mail server that cannot start TLS, so every send fails early.</summary>
    private sealed class RefusingSmtpServer : IDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly CancellationTokenSource _stop = new();

        public RefusingSmtpServer()
        {
            _listener.Start();
            _ = Task.Run(ServeAsync);
        }

        public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

        private async Task ServeAsync()
        {
            try
            {
                while (!_stop.IsCancellationRequested)
                {
                    using var client = await _listener.AcceptTcpClientAsync(_stop.Token);
                    await using var stream = client.GetStream();
                    using var reader = new StreamReader(stream, Encoding.ASCII);
                    await using var writer = new StreamWriter(stream, Encoding.ASCII) { AutoFlush = true, NewLine = "\r\n" };
                    await writer.WriteLineAsync("220 fake ESMTP");
                    while (await reader.ReadLineAsync(_stop.Token) is { } line)
                    {
                        if (line.StartsWith("EHLO", StringComparison.OrdinalIgnoreCase))
                        {
                            await writer.WriteLineAsync("250-fake");
                            await writer.WriteLineAsync("250 STARTTLS");
                        }
                        else if (line.StartsWith("QUIT", StringComparison.OrdinalIgnoreCase))
                        {
                            await writer.WriteLineAsync("221 bye");
                            break;
                        }
                        else
                        {
                            await writer.WriteLineAsync("554 5.7.1 refused for private.person@example.com");
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
            }
            catch (IOException)
            {
            }
        }

        public void Dispose()
        {
            _stop.Cancel();
            _listener.Stop();
            _stop.Dispose();
        }
    }

    private sealed class ListLogger : ILogger<SmtpAuthEmailSender>
    {
        public List<string> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Lines.Add(formatter(state, exception) + exception);
    }
}
