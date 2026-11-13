import { router } from 'expo-router';

import type { LegalDocLink } from '@/components';

/** Opens a bundled legal text (KAN-62): /legal/terms, /legal/privacy or /legal/entry-rules. */
export function openLegal(doc: LegalDocLink): void {
  router.push({ pathname: '/legal/[doc]', params: { doc } });
}
