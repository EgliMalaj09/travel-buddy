import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { AppText, Button, Checkbox, LegalLinks, OrDivider, SocialButtons } from '@/components';
import { openLegal } from '@/features/legal/openLegal';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { FormField } from '../ui/FormField';
import { signUpSchema, type SignUpForm } from '../validation';
import { useSocialLogin } from './useSocialLogin';

export function SignUpScreen() {
  const { colors, space } = useTheme();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const social = useSocialLogin(setError);
  const { control, handleSubmit, formState } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      ageConfirmed: false as true,
      termsAccepted: false as true,
      marketingConsent: false,
    },
  });

  const onSubmit = handleSubmit(async ({ email, password, ...consents }) => {
    setError(null);
    try {
      await signUp(email, password, consents);
      router.push({ pathname: '/verify', params: { email, purpose: 'signup' } });
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  const busy = formState.isSubmitting || social.busy;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your trips, saved and synced on all your phones."
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/login')}
          style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <AppText variant="body">
            Already have an account?{' '}
            <AppText variant="label" color={colors.accent}>
              Log in
            </AppText>
          </AppText>
        </Pressable>
      }
    >
      <SocialButtons onApple={social.onApple} onGoogle={social.onGoogle} disabled={busy} />
      <OrDivider />
      <FormError message={error} />
      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <View style={{ gap: space.xs }}>
        <FormField
          control={control}
          name="password"
          label="Password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <AppText variant="caption">
          At least 10 characters. A short sentence is easy to remember.
        </AppText>
      </View>

      <View style={{ gap: space.xs }}>
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
        <LegalLinks onOpen={openLegal} />
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

      <Button
        title={busy ? 'Sending code…' : 'Create account'}
        onPress={() => void onSubmit()}
        disabled={busy}
      />
    </AuthLayout>
  );
}
