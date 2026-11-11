namespace TravelApp.Api.Features.Auth;

internal static class AuthUserMapper
{
    public static AuthUserResponse ToResponse(User user)
    {
        var profile = user.OnboardingCompletedAt is null
            ? null
            : new ProfileDto(user.FirstName!, user.PassportCountry!, user.ResidenceCountry!, user.HomeCurrency!);
        var consents = user.TermsAcceptedAt is null
            ? null
            : new ConsentsDto(user.AgeConfirmedAt is not null, true, user.MarketingConsent);
        return new AuthUserResponse(user.Id, user.Email!, user.AuthProviders, profile, user.SuggestedFirstName, consents);
    }
}
