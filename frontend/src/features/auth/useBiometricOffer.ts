import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import { getFlag, setFlag } from '@/services/deviceStorage';

import { BIOMETRIC_OFFERED_FLAG, useAuth } from './AuthProvider';
import { biometricAvailable, biometricLabel } from './biometric';

/** After the first login on a phone: "Use Face ID / fingerprint to unlock the app?" Asked once (A8). */
export function useBiometricOffer() {
  const { phase, biometricEnabled, setBiometricEnabled } = useAuth();
  useEffect(() => {
    if (phase !== 'signedIn' || biometricEnabled || Platform.OS === 'web') return;
    if (getFlag(BIOMETRIC_OFFERED_FLAG)) return;
    void (async () => {
      if (!(await biometricAvailable())) return;
      const label = await biometricLabel();
      setFlag(BIOMETRIC_OFFERED_FLAG, true);
      Alert.alert(
        `Use ${label}?`,
        `Unlock the app with ${label} each time you open it. You can change this in You.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: `Use ${label}`, onPress: () => setBiometricEnabled(true) },
        ],
      );
    })();
  }, [phase, biometricEnabled, setBiometricEnabled]);
}
