import { AuthError } from './types';

import type { SocialCredential, SocialSheets } from './socialSignIn';

export type { SocialCredential, SocialSheets };

/** Web (npm run web) is only a quick look: the Google and Apple sheets are phone-only. */
function phoneOnly(): never {
  throw new AuthError(
    'not_available',
    'Google and Apple login work in the phone app. On the web, use email.',
  );
}

export const googleClientIds = { web: undefined, ios: undefined };

export const socialSheets: SocialSheets = {
  google: async () => phoneOnly(),
  apple: async () => phoneOnly(),
  async signOut() {},
};
