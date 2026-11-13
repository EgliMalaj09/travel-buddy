import { useState } from 'react';

import { AppText, Button, Card, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/ui/errors';
import { daysLeft, deletionDay } from '@/lib/account';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Shown after logging in to an account that is waiting to be deleted (KAN-22). The only choices
 * are Restore (everything comes back, downloaded again) or Log out (it stays scheduled).
 * Nothing syncs to this phone until the account is restored.
 */
export function RestoreAccountScreen() {
  const { colors } = useTheme();
  const { user, restoreAccount, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteAfter = user?.deletion?.deleteAfter ?? '';
  const left = daysLeft(deleteAfter);

  const onRestore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restoreAccount();
      // Restored: the app opens Home and downloads the trips again.
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Your account is set to be deleted</AppText>
      <Card>
        <AppText variant="body">
          {left > 0
            ? `It will be erased for good on ${deletionDay(deleteAfter)} (in ${left} ${left === 1 ? 'day' : 'days'}).`
            : 'It is being erased now.'}
        </AppText>
        <AppText variant="body">
          Restore it to keep your trips, photos and everything else, just as they were.
        </AppText>
      </Card>
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
      <Button
        title={busy ? 'Restoring…' : 'Restore my account'}
        onPress={() => void onRestore()}
        disabled={busy || left === 0}
      />
      <Button title="Log out" kind="secondary" onPress={() => void logout()} disabled={busy} />
    </Screen>
  );
}
