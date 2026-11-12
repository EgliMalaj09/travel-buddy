import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

import { AuthError } from './types';

/**
 * The Google and Apple sign-in sheets (A9, A10). Each one returns an ID token that the backend
 * checks against Google's / Apple's public keys (POST /auth/google, /auth/apple).
 * Web uses socialSignIn.web.ts instead (the sheets are phone-only).
 */
export interface SocialCredential {
  idToken: string;
  /** Apple gives the name only on the very first sign-in; Google gives it every time. */
  firstName?: string;
}

export interface SocialSheets {
  google(): Promise<SocialCredential>;
  apple(): Promise<SocialCredential>;
  /** Forget the Google account choice, so the next login shows the account picker again. */
  signOut(): Promise<void>;
}

/** Google OAuth client ids from frontend/.env.local (see docs/google-apple-login.md). */
export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
};

const cancelled = () => new AuthError('cancelled', 'Login was cancelled.');

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  if (!googleClientIds.web) {
    throw new AuthError(
      'not_available',
      'Google login is not set up on this build yet. Use email for now.',
    );
  }
  // The web client id makes Google put it in the token's "aud", which the backend checks.
  GoogleSignin.configure({ webClientId: googleClientIds.web, iosClientId: googleClientIds.ios });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<SocialCredential> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw cancelled();
    const { idToken, user } = response.data;
    if (!idToken) {
      throw new AuthError('invalid_token', 'Google did not send a login token. Try again.');
    }
    return { idToken, firstName: user.givenName ?? undefined };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) throw cancelled();
      if (e.code === statusCodes.IN_PROGRESS) {
        throw new AuthError('not_available', 'Google login is already open.');
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError(
          'not_available',
          'Google Play services are missing or old on this phone. Use email instead.',
        );
      }
      // DEVELOPER_ERROR (code 10) on Android = the Android client id or SHA-1 in Google Cloud is wrong.
      console.warn('[google sign-in]', e.code, e.message);
    }
    throw new AuthError('not_available', 'Google login did not work. Try again or use email.');
  }
}

export async function signInWithApple(): Promise<SocialCredential> {
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new AuthError(
      'not_available',
      'Apple login works on iPhone. On this phone, use Google or email.',
    );
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new AuthError('invalid_token', 'Apple did not send a login token. Try again.');
    }
    return {
      idToken: credential.identityToken,
      firstName: credential.fullName?.givenName ?? undefined,
    };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw cancelled();
    console.warn('[apple sign-in]', e);
    throw new AuthError('not_available', 'Apple login did not work. Try again or use email.');
  }
}

export const socialSheets: SocialSheets = {
  google: signInWithGoogle,
  apple: signInWithApple,
  async signOut() {
    if (!googleConfigured) return;
    await GoogleSignin.signOut().catch(() => undefined);
  },
};
