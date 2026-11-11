import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { AppText, Button, OrDivider, SocialButtons } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { FormField } from '../ui/FormField';
import { loginSchema, type LoginForm } from '../validation';
import { useSocialLogin } from './useSocialLogin';

export function LoginScreen() {
  const { colors, space } = useTheme();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const social = useSocialLogin(setError);
  const { control, handleSubmit, formState, getValues } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      const result = await login(email, password);
      // 'session' → the app opens Home by itself. New phone → confirm with the email code.
      if (result === 'codeRequired') {
        router.push({ pathname: '/verify', params: { email, purpose: 'login' } });
      }
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  const busy = formState.isSubmitting || social.busy;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your trips."
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/sign-up')}
          style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <AppText variant="body">
            No account?{' '}
            <AppText variant="label" color={colors.accent}>
              Sign up
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
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => void onSubmit()}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/forgot', params: { email: getValues('email') } })
          }
          style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}
        >
          <AppText variant="label" color={colors.accent}>
            Forgot password?
          </AppText>
        </Pressable>
      </View>
      <Button
        title={busy ? 'Logging in…' : 'Log in'}
        onPress={() => void onSubmit()}
        disabled={busy}
      />
    </AuthLayout>
  );
}
