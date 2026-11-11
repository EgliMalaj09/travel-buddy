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
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_IN_DEV === 'true',
  });
}

export const wrapWithSentry = Sentry.wrap;
