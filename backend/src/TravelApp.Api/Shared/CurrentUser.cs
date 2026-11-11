using System.Security.Claims;

namespace TravelApp.Api.Shared;

/// <summary>The logged-in user's id from the access token ("sub"). Used by every feature with user data.</summary>
public static class CurrentUser
{
    public static Guid UserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue("sub"), out var id)
            ? id
            : throw new InvalidOperationException("No user id in the access token.");
}
