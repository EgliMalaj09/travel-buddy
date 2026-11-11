import type { AuthUser, Consents, LoginResult, Profile, Session } from './types';

/**
 * Everything the app can do with the login backend. Today there is a mock implementation
 * (A14); the real one calls the API through openapi-fetch once KAN-12 is built.
 */
export interface AuthService {
  signUp(email: string, password: string, consents: Consents): Promise<void>;
  verifySignUp(email: string, code: string, deviceId: string): Promise<Session>;
  login(email: string, password: string, deviceId: string): Promise<LoginResult>;
  verifyLogin(email: string, code: string, deviceId: string): Promise<Session>;
  loginWithGoogle(deviceId: string): Promise<Session>;
  loginWithApple(deviceId: string): Promise<Session>;
  /** Sends a new 6-digit code (sign-up or new-phone check). Limit: 1 per minute, 5 per hour. */
  resendCode(email: string, purpose: 'signup' | 'login'): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  /** Exchanges the refresh token for a new session (also used on app start). */
  refresh(refreshToken: string): Promise<Session>;
  saveProfile(accessToken: string, profile: Profile, consents?: Consents): Promise<AuthUser>;
  logout(refreshToken: string): Promise<void>;
}
