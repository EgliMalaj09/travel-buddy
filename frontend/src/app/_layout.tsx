import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import { setDataOwner } from '@/data';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { usePhotoSync } from '@/features/photos/usePhotoSync';
import { useReminderSync } from '@/features/reminders/useReminderSync';
import { AnimatedSplash } from '@/features/splash/AnimatedSplash';
import { takeFirstLaunch } from '@/features/splash/splashPlan';
import { initSentry, wrapWithSentry } from '@/services/sentry';
import { useUserSettings } from '@/services/userSettings';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

initSentry();
SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, fonts } = useTheme();
  const { phase, user } = useAuth();

  // The still (native) splash hands over to the animated one as soon as it is on screen. The
  // animated splash stays until we know if someone is logged in. The Stack must render from
  // the start (Expo Router needs it); while loading, Home sits hidden behind the splash.
  const [firstLaunch] = useState(takeFirstLaunch);
  const [showSplash, setShowSplash] = useState(true);
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  const splashDone = useCallback(() => setShowSplash(false), []);
  const signedIn = phase === 'signedIn' || phase === 'loading';

  // Trips load for the logged-in user; they load again once the session is back after opening.
  const dataOwner = phase === 'signedIn' ? (user?.id ?? null) : null;
  useEffect(() => setDataOwner(dataOwner), [dataOwner]);
  // Settings (reminder switches, quiet hours) belong to the account (KAN-21). Loaded before the
  // reminder hook below runs, so reminders are planned with this user's settings.
  useEffect(() => useUserSettings.getState().load(dataOwner), [dataOwner]);
  // Reminders on the phone follow the trips; cleared when nobody is logged in (KAN-32).
  useReminderSync(phase === 'signedIn');
  // Photo files upload in the background while the app is open (KAN-39).
  usePhotoSync(dataOwner);

  // Each group is only reachable in its phase; Expo Router sends the user to the first open screen.
  return (
    <>
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
          <Stack.Screen name="trip/new" options={{ title: '' }} />
          <Stack.Screen name="trip/edit/[id]" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="place/edit" options={{ title: '' }} />
          <Stack.Screen name="photo/[id]" options={{ title: '' }} />
          <Stack.Screen name="expense/edit" options={{ title: '' }} />
          <Stack.Screen name="trip/checklist/[id]" options={{ title: 'Checklist' }} />
          <Stack.Screen name="design-kit" options={{ title: 'Design kit' }} />
        </Stack.Protected>
      </Stack>
      {showSplash && (
        <AnimatedSplash
          firstLaunch={firstLaunch}
          ready={phase !== 'loading'}
          onShown={hideNativeSplash}
          onDone={splashDone}
        />
      )}
    </>
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
