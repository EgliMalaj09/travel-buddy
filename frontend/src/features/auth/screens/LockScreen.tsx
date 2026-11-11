import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Logo } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import { biometricLabel } from '../biometric';

/** Shown on app open when Face ID / fingerprint unlock is on (A8). */
export function LockScreen() {
  const { colors, space } = useTheme();
  const { unlock, logout } = useAuth();
  const [label, setLabel] = useState('Face ID or fingerprint');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void biometricLabel().then(setLabel);
    void unlock().then((ok) => setFailed(!ok));
  }, [unlock]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: space.lg }}>
      <Logo />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
        <AppText variant="heading">Unlock to see your trips</AppText>
        {failed ? (
          <AppText variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
            {`Not recognised. Try ${label} again.`}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: space.sm }}>
        <Button
          title={`Unlock with ${label}`}
          onPress={() => unlock().then((ok) => setFailed(!ok))}
        />
        <Button title="Log out" kind="ghost" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}
