import * as LocalAuthentication from 'expo-local-authentication';

/** Face ID / fingerprint unlock (A8). Optional per phone; the choice is in DeviceSettings. */

export async function biometricAvailable(): Promise<boolean> {
  try {
    return (
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync())
    );
  } catch {
    return false;
  }
}

export async function biometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  } catch {
    // fall through
  }
  return 'Face ID or fingerprint';
}

export async function unlockWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Travel App',
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
