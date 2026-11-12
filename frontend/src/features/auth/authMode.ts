import { createApiAuthService } from './apiAuthService';
import type { AuthService } from './authService';
import { createMockAuthService } from './mockAuthService';

/**
 * Which login the app uses. "api" (default) = the real backend (KAN-12).
 * "mock" = any email, code 123456, no backend needed (A14): set EXPO_PUBLIC_AUTH_MODE=mock.
 */
export type AuthMode = 'api' | 'mock';

export const authMode: AuthMode = process.env.EXPO_PUBLIC_AUTH_MODE === 'mock' ? 'mock' : 'api';

export function createAuthService(mode: AuthMode = authMode): AuthService {
  return mode === 'mock' ? createMockAuthService() : createApiAuthService();
}
