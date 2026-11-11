import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components';

import { useAuth } from '../AuthProvider';
import { AuthLayout, FormError } from '../ui/AuthLayout';
import { authErrorMessage } from '../ui/errors';
import { FormField } from '../ui/FormField';
import { forgotSchema } from '../validation';

/** Step 1 of password reset. Also how Google/Apple users add a password. */
export function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { forgotPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await forgotPassword(email);
      router.push({ pathname: '/reset', params: { email } });
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email. If it has an account, we send a 6-digit code to set a new password."
      footer={
        <Button
          title={formState.isSubmitting ? 'Sending…' : 'Send code'}
          onPress={() => void onSubmit()}
          disabled={formState.isSubmitting}
        />
      }
    >
      <FormError message={error} />
      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={() => void onSubmit()}
      />
    </AuthLayout>
  );
}
