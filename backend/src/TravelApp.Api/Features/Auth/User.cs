using Microsoft.AspNetCore.Identity;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// The account (decisions/data-model.md, "User"). It is also the ASP.NET Core Identity user (A3):
/// Identity keeps the email, the confirmed flag, the password hash, the lockout counters and the
/// Google/Apple links (table "user_logins"). <c>Id</c> is created by the server (UUID v7).
/// </summary>
/// <remarks>
/// The profile fields (first name, countries, currency) are empty between sign-up and profile setup.
/// The consent fields are empty for a Google/Apple sign-up until profile setup.
/// </remarks>
public sealed class User : IdentityUser<Guid>
{
    /// <summary>server. Login methods of this account: "email", "google", "apple" (L3).</summary>
    public List<string> AuthProviders { get; set; } = [];

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? DisplayName { get; set; }

    public Guid? AvatarMediaId { get; set; }

    public string? PassportCountry { get; set; }

    public string? ResidenceCountry { get; set; }

    public string? HomeCurrency { get; set; }

    public string Language { get; set; } = "en";

    public string TimeZone { get; set; } = "UTC";

    /// <summary>First name given by Google or Apple, offered as the default in profile setup.</summary>
    public string? SuggestedFirstName { get; set; }

    public DateTimeOffset? AgeConfirmedAt { get; set; }

    public string? TermsVersion { get; set; }

    public DateTimeOffset? TermsAcceptedAt { get; set; }

    public string? PrivacyVersion { get; set; }

    public DateTimeOffset? PrivacyAcceptedAt { get; set; }

    public bool MarketingConsent { get; set; }

    public DateTimeOffset? MarketingConsentAt { get; set; }

    public DateTimeOffset? OnboardingCompletedAt { get; set; }

    /// <summary>server. "active" or "deletion_requested".</summary>
    public string Status { get; set; } = UserStatus.Active;

    // Sync fields (the User row syncs like every other record).
    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    public long Version { get; set; }

    public void Touch(DateTimeOffset now)
    {
        UpdatedAt = now;
        Version++;
    }

    public void AddProvider(string provider)
    {
        if (!AuthProviders.Contains(provider))
        {
            AuthProviders.Add(provider);
        }
    }
}

public static class UserStatus
{
    public const string Active = "active";
    public const string DeletionRequested = "deletion_requested";
}

public static class AuthProvider
{
    public const string Email = "email";
    public const string Google = "google";
    public const string Apple = "apple";
}
