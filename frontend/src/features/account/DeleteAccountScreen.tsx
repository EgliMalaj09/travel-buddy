import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Input, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/ui/errors';
import { confirmsDelete, DELETE_WORD } from '@/lib/account';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * "Delete my account" (KAN-22). Says what goes, gives 30 days to change your mind (owner's choice,
 * 13 Nov 2026), and only works after typing DELETE, so a stray tap can never delete an account.
 * Needs the connection: the server must hear it before this phone forgets the data.
 * Kept plain on purpose: the design thread restyles screens.
 */
export function DeleteAccountScreen() {
  const { colors, space } = useTheme();
  const { deleteAccount } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirmsDelete(typed);

  const onDelete = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      // Logged out: the app opens the login by itself.
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Delete your account</AppText>
      <Card>
        <AppText variant="body">This removes everything you keep in the app:</AppText>
        <View style={{ gap: space.xs }}>
          {[
            'your trips, stops and flights',
            'places, checklists and packing lists',
            'expenses',
            'photos and notes',
            'your profile and settings',
          ].map((line) => (
            <AppText key={line} variant="body">
              {`• ${line}`}
            </AppText>
          ))}
        </View>
      </Card>
      <Card>
        <AppText variant="label">30 days to change your mind</AppText>
        <AppText variant="body">
          You are logged out on every phone right away. Your data is kept locked for 30 days, then
          erased for good. Log in during those 30 days to restore your account.
        </AppText>
        <AppText variant="caption" color={colors.inkSoft}>
          Want a copy first? Use “Download my data” in Settings before you delete.
        </AppText>
      </Card>
      <Input
        label={`Type ${DELETE_WORD} to confirm`}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!busy}
      />
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
      <Button
        title={busy ? 'Deleting…' : 'Delete my account'}
        onPress={() => void onDelete()}
        disabled={!ready || busy}
        accessibilityState={{ disabled: !ready || busy }}
      />
    </Screen>
  );
}
