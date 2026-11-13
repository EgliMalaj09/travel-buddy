import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppText, Button, Input, OptionPicker, Screen } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/ui/errors';
import { countries, currencies } from '@/data/static/countries';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

const FIRST_NAME_MAX = 60;

/**
 * Edit profile (KAN-21): first name, passport country, country you live in, home currency.
 * Saved on the server (POST /me/profile, the same call as profile setup), so it needs the
 * connection. Trips keep the passport and currency they were made with (their snapshots).
 */
export function EditProfileScreen() {
  const { colors } = useTheme();
  const { user, saveProfile } = useAuth();
  const profile = user?.profile;
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [passportCountry, setPassport] = useState(profile?.passportCountry ?? '');
  const [residenceCountry, setResidence] = useState(profile?.residenceCountry ?? '');
  const [homeCurrency, setCurrency] = useState(profile?.homeCurrency ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.code, label: c.name, prefix: flagEmoji(c.code) })),
    [],
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.code, label: c.name, hint: c.code })),
    [],
  );

  const name = firstName.trim();
  const nameError =
    name.length === 0
      ? 'Tell us your first name.'
      : name.length > FIRST_NAME_MAX
        ? `Up to ${FIRST_NAME_MAX} characters.`
        : undefined;
  const complete = !nameError && passportCountry && residenceCountry && homeCurrency;

  const onSave = async () => {
    if (!complete || busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ firstName: name, passportCountry, residenceCountry, homeCurrency });
      router.back();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Input
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        error={firstName.length > 0 ? nameError : undefined}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={FIRST_NAME_MAX + 10}
      />
      <OptionPicker
        label="Passport country"
        value={passportCountry}
        options={countryOptions}
        onChange={setPassport}
      />
      <OptionPicker
        label="Country you live in"
        value={residenceCountry}
        options={countryOptions}
        onChange={setResidence}
      />
      <OptionPicker
        label="Home currency"
        value={homeCurrency}
        options={currencyOptions}
        onChange={setCurrency}
      />
      <AppText variant="caption" color={colors.inkSoft}>
        Trips you already made keep the passport and currency they were planned with.
      </AppText>
      {error ? (
        <AppText variant="caption" color={colors.accent}>
          {error}
        </AppText>
      ) : null}
      <Button
        title={busy ? 'Saving…' : 'Save'}
        onPress={() => void onSave()}
        disabled={!complete || busy}
      />
    </Screen>
  );
}
