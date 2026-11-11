import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initSentry, wrapWithSentry } from '@/services/sentry';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

initSentry();
SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, fonts } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.title, color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ title: '' }} />
      <Stack.Screen name="design-kit" options={{ title: 'Design kit' }} />
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <AppStack />
    </ThemeProvider>
  );
}

export default wrapWithSentry(RootLayout);
