import * as Sentry from '@sentry/react-native';

/**
 * Crash and error reporting (decisions/tech-stack.md, AF4).
 * Turned on only when EXPO_PUBLIC_SENTRY_DSN is set (see .env.example). Use a Sentry
 * project with EU data storage. No DSN = Sentry stays off, the app works normally.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // No personal data in crash reports by default (GDPR).
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    // GDPR core rule: no personal data leaves the phone. Console lines are not sent, web
    // addresses lose their ?query part, and no user, request body or screen text goes with it.
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: (event) => {
      delete event.user;
      delete event.request;
      return event;
    },
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_IN_DEV === 'true',
  });
}

export const wrapWithSentry = Sentry.wrap;

/** Drops console breadcrumbs and keeps only the path of web addresses (ids, never query values). */
export function scrubBreadcrumb(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (crumb.category === 'console' || crumb.category?.startsWith('ui.')) return null;
  if (crumb.data && typeof crumb.data.url === 'string') {
    crumb.data = { ...crumb.data, url: crumb.data.url.split('?')[0] };
  }
  delete crumb.message;
  return crumb;
}

/** Reports an error that the user does not need to see (e.g. a reminder that failed to schedule). */
export function captureError(error: unknown): void {
  if (__DEV__) console.warn(error instanceof Error ? error.name : 'error');
  if (sentryEnabled) Sentry.captureException(error);
}
