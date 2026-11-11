import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { AppText, Button, Checkbox, OptionPicker } from '@/components';
import { countries, currencies, currencyForCountry, deviceCountry } from '@/data/static/countries';
import { flagEmoji } from '@/lib/trips';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { profileTravelSchema, socialConsentsSchema } from '../validation';

const withConsents = profileTravelSchema.extend(socialConsentsSchema.shape);
type Form = z.infer<typeof withConsents>;

/**
 * Profile setup step 2: passport country, home country, home currency.
 * Defaults: phone's country → residence = passport → currency from residence.
 * Google/Apple users also accept 16+ and terms here (email users did it at sign-up).
 */
export function ProfileTravelScreen() {
  const { colors, space } = useTheme();
  const { firstName = '' } = useLocalSearchParams<{ firstName: string }>();
  const { user, saveProfile } = useAuth();
  const needsConsents = !user?.consents;
  const [error, setError] = useState<string | null>(null);

  const start = deviceCountry();
  const { control, handleSubmit, formState, setValue, getFieldState } = useForm<Form>({
    resolver: zodResolver(
      needsConsents ? withConsents : profileTravelSchema.passthrough(),
    ) as never,
    defaultValues: {
      passportCountry: start ?? '',
      residenceCountry: start ?? '',
      homeCurrency: currencyForCountry(start) ?? '',
      ageConfirmed: false as true,
      termsAccepted: false as true,
      marketingConsent: false,
    },
  });

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.name,
        prefix: flagEmoji(c.code),
        hint: c.currencyCode,
      })),
    [],
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.code, label: c.name, hint: c.code })),
    [],
  );

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await saveProfile(
        {
          firstName,
          passportCountry: v.passportCountry,
          residenceCountry: v.residenceCountry,
          homeCurrency: v.homeCurrency,
        },
        needsConsents
          ? {
              ageConfirmed: v.ageConfirmed,
              termsAccepted: v.termsAccepted,
              marketingConsent: v.marketingConsent,
            }
          : undefined,
      );
      // Saved → the app opens Home by itself.
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      step="Step 2 of 2"
      title={firstName ? `Nice to meet you, ${firstName}` : 'Your travels'}
      subtitle="We use this for visa and passport checks and to show what you spend in your own money."
      footer={
        <Button
          title={formState.isSubmitting ? 'Saving…' : 'Start exploring'}
          onPress={() => void onSubmit()}
          disabled={formState.isSubmitting}
        />
      }
    >
      <FormError message={error} />
      <Controller
        control={control}
        name="passportCountry"
        render={({ field, fieldState }) => (
          <OptionPicker
            label="Passport country"
            value={field.value}
            options={countryOptions}
            error={fieldState.error?.message}
            onChange={(code) => {
              field.onChange(code);
              // Follow the passport until the user picks a home country themselves.
              if (!getFieldState('residenceCountry').isDirty) {
                setValue('residenceCountry', code);
                if (!getFieldState('homeCurrency').isDirty) {
                  setValue('homeCurrency', currencyForCountry(code) ?? '');
                }
              }
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="residenceCountry"
        render={({ field, fieldState }) => (
          <OptionPicker
            label="Country you live in"
            value={field.value}
            options={countryOptions}
            error={fieldState.error?.message}
            onChange={(code) => {
              setValue('residenceCountry', code, { shouldDirty: true, shouldValidate: true });
              if (!getFieldState('homeCurrency').isDirty) {
                setValue('homeCurrency', currencyForCountry(code) ?? '');
              }
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="homeCurrency"
        render={({ field, fieldState }) => (
          <OptionPicker
            label="Home currency"
            value={field.value}
            options={currencyOptions}
            error={fieldState.error?.message}
            onChange={(code) =>
              setValue('homeCurrency', code, { shouldDirty: true, shouldValidate: true })
            }
          />
        )}
      />
      <AppText variant="caption">You can change these later in your profile.</AppText>

      {needsConsents ? (
        <View
          style={{
            gap: space.xs,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: space.md,
          }}
        >
          <Controller
            control={control}
            name="ageConfirmed"
            render={({ field, fieldState }) => (
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                label="I am 16 or older"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="termsAccepted"
            render={({ field, fieldState }) => (
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                label="I accept the terms and the privacy policy"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="marketingConsent"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                label="Send me travel tips by email (optional)"
              />
            )}
          />
        </View>
      ) : null}
    </AuthLayout>
  );
}
