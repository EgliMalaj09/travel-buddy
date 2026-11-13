import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { tabBarOptions } from '@/components';
import { useBiometricOffer } from '@/features/auth/useBiometricOffer';
import { useTheme } from '@/theme/ThemeProvider';

/** The 4 agreed tabs: Home, Trips, Atlas (route `globe`), You. */
export default function TabsLayout() {
  const theme = useTheme();
  useBiometricOffer();
  return (
    <Tabs screenOptions={tabBarOptions(theme)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="globe"
        options={{
          title: 'Atlas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="earth-outline" color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={String(color)} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
