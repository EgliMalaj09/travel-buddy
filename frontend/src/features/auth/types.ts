/** Login data shapes. They mirror the backend endpoints in decisions/features/01-login-onboarding.md. */

export interface Consents {
  ageConfirmed: boolean;
  termsAccepted: boolean;
  marketingConsent: boolean;
}

export interface Profile {
  firstName: string;
  passportCountry: string;
  residenceCountry: string;
  homeCurrency: string;
}

export interface AuthUser {
  id: string;
  email: string;
  authProviders: ('email' | 'google' | 'apple')[];
  /** Null until profile setup is done. */
  profile: Profile | null;
  /** First name from Google/Apple, used as a default in profile setup. */
  suggestedFirstName?: string;
  consents: Consents | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Login with email may need a code on a new phone. */
export type LoginResult = { kind: 'session'; session: Session } | { kind: 'codeRequired' };

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'invalid_code'
  | 'email_taken'
  | 'too_many_attempts'
  | 'session_expired'
  | 'password_leaked'
  | 'invalid_token'
  | 'consent_required'
  | 'invalid_input'
  | 'not_available'
  /** The person closed the Google / Apple sheet. Not an error to show. */
  | 'cancelled'
  | 'network';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
