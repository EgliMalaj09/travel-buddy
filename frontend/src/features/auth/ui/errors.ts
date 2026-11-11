import { AuthError } from '../types';

/** Turns any error from the auth service into a short message for the user. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}
