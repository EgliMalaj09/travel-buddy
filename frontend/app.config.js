// Adds settings to app.json at build time (Expo reads both).
const { withEntitlementsPlist } = require('expo/config-plugins');

// Google sign-in on iPhone needs the iOS client id written backwards as a URL scheme:
// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc".
// See docs/google-apple-login.md.
function withGoogleScheme(config) {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const scheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
  return {
    ...config,
    plugins: config.plugins.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin'
        ? [plugin[0], { ...plugin[1], iosUrlScheme: scheme }]
        : plugin,
    ),
  };
}

// Beta and store builds (KAN-60) must talk to the real server over HTTPS and never ship mock login.
// EAS sets EAS_BUILD_PROFILE; a wrong setting stops the build here instead of reaching a phone.
function checkReleaseSettings() {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== 'beta' && profile !== 'production') return;
  const problems = [];
  for (const name of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_POWERSYNC_URL']) {
    const value = process.env[name] ?? '';
    if (!value.startsWith('https://')) problems.push(`${name} must be an https:// address`);
  }
  if (process.env.EXPO_PUBLIC_AUTH_MODE === 'mock')
    problems.push('EXPO_PUBLIC_AUTH_MODE must not be "mock"');
  if (process.env.EXPO_PUBLIC_DATA_MODE === 'mock')
    problems.push('EXPO_PUBLIC_DATA_MODE must not be "mock"');
  if (problems.length > 0) {
    throw new Error(
      `Build profile "${profile}" settings: ${problems.join('; ')} (docs/COMMANDS.md, Phone builds)`,
    );
  }
}

// iPhone with a free Apple ID (KAN-60, free route): Xcode's free "personal team" cannot sign apps that use
// Sign in with Apple or push notifications. With FREE_APPLE_SIGNING=1 those two are left out of the build
// (local reminders still work: they need no push). Never set it for TestFlight or store builds.
function withFreeAppleSigning(config) {
  if (process.env.FREE_APPLE_SIGNING !== '1') return config;
  const withoutAppleSignIn = { ...config, ios: { ...config.ios, usesAppleSignIn: false } };
  return withEntitlementsPlist(withoutAppleSignIn, (c) => {
    delete c.modResults['aps-environment'];
    delete c.modResults['com.apple.developer.applesignin'];
    return c;
  });
}

module.exports = ({ config }) => {
  checkReleaseSettings();
  return withFreeAppleSigning(withGoogleScheme(config));
};
