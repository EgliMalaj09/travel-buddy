import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { initSentry, wrapWithSentry } from '@/services/sentry';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

initSentry();
SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, fonts } = useTheme();
  const { phase } = useAuth();

  // Keep the splash screen until we know if someone is logged in. The Stack must render from
  // the start (Expo Router needs it); while loading, Home sits hidden behind the splash.
  useEffect(() => {
    if (phase !== 'loading') SplashScreen.hideAsync();
  }, [phase]);
  const signedIn = phase === 'signedIn' || phase === 'loading';

  // Each group is only reachable in its phase; Expo Router sends the user to the first open screen.
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.title, color: colors.ink },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={phase === 'intro'}>
        <Stack.Screen name="intro" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'intro' || phase === 'signedOut'}>
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="sign-up" options={{ title: '' }} />
        <Stack.Screen name="verify" options={{ title: '' }} />
        <Stack.Screen name="forgot" options={{ title: '' }} />
        <Stack.Screen name="reset" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'locked'}>
        <Stack.Screen name="lock" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'needsProfile'}>
        <Stack.Screen name="profile-name" options={{ headerShown: false }} />
        <Stack.Screen name="profile-travel" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ title: '' }} />
        <Stack.Screen name="design-kit" options={{ title: 'Design kit' }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default wrapWithSentry(RootLayout);
