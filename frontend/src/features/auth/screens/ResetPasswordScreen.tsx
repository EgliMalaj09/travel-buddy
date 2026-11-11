import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Platform } from 'react-native';

import { AppText, Button, CodeInput } from '@/components';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError, MockCodeHint } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { FormField } from '../ui/FormField';
import { resetSchema, type ResetForm } from '../validation';

/** Step 2 of password reset: code from the email + new password. */
export function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ code, password }) => {
    setError(null);
    try {
      await resetPassword(email, code, password);
      const done = () => router.dismissTo('/login');
      if (Platform.OS === 'web') done();
      else
        Alert.alert('Password saved', 'Log in with your new password.', [
          { text: 'OK', onPress: done },
        ]);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={
        <>
          Enter the code we sent to <AppText variant="label">{email}</AppText> and choose a new
          password.
        </>
      }
      footer={
        <Button
          title={formState.isSubmitting ? 'Saving…' : 'Save password'}
          onPress={() => void onSubmit()}
          disabled={formState.isSubmitting}
        />
      }
    >
      <FormError message={error} />
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <CodeInput
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <MockCodeHint />
      <FormField
        control={control}
        name="password"
        label="New password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormField control={control} name="confirm" label="Repeat new password" password />
    </AuthLayout>
  );
}
