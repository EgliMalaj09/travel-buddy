using Microsoft.AspNetCore.Diagnostics;

namespace TravelApp.Api.Shared;

/// <summary>
/// A request ASP.NET Core could not read (a missing value, "lat=41,9", a broken JSON body) answers 400 ProblemDetails.
/// GDPR core rule: the framework's message repeats the value that was sent (it can be a position or a name),
/// so it is neither logged nor sent back; handled here, the exception middleware does not log it either.
/// </summary>
internal sealed class BadRequestHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not BadHttpRequestException bad) return false;
        httpContext.Response.StatusCode = bad.StatusCode;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = { Status = bad.StatusCode, Title = "The request could not be read." },
        });
    }
}
