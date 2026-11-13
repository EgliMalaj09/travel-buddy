import { createApiAuthService } from './apiAuthService';
import type { AuthService } from './authService';
import { createMockAuthService } from './mockAuthService';

/**
 * Which login the app uses. "api" (default) = the real backend (KAN-12).
 * "mock" = any email, code 123456, no backend needed (A14): set EXPO_PUBLIC_AUTH_MODE=mock.
 * Release builds (beta and store builds, KAN-60) always use "api": mock login can never ship.
 */
export type AuthMode = 'api' | 'mock';

export function pickAuthMode(
  env = process.env.EXPO_PUBLIC_AUTH_MODE,
  release = !__DEV__,
): AuthMode {
  return !release && env === 'mock' ? 'mock' : 'api';
}

export const authMode: AuthMode = pickAuthMode();

export function createAuthService(mode: AuthMode = authMode): AuthService {
  return mode === 'mock' ? createMockAuthService() : createApiAuthService();
}
