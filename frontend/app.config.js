// Adds settings from .env.local to app.json at build time (Expo reads both).
// Google sign-in on iPhone needs the iOS client id written backwards as a URL scheme:
// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc".
// See docs/google-apple-login.md.
module.exports = ({ config }) => {
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
};
