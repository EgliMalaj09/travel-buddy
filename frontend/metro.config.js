// Metro bundler config. Sentry's wrapper adds debug IDs so crash reports
// can point to the exact TypeScript line (see decisions/tech-stack.md).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
