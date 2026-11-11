import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Button } from '@/components';

import { useAuth } from '../AuthProvider';
import { AuthLayout } from '../ui/AuthLayout';
import { FormField } from '../ui/FormField';
import { profileNameSchema } from '../validation';

/** Profile setup step 1: first name (default from Google/Apple). */
export function ProfileNameScreen() {
  const { user } = useAuth();
  const { control, handleSubmit } = useForm<{ firstName: string }>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { firstName: user?.suggestedFirstName ?? '' },
  });

  const onNext = handleSubmit(({ firstName }) =>
    router.push({ pathname: '/profile-travel', params: { firstName: firstName.trim() } }),
  );

  return (
    <AuthLayout
      step="Step 1 of 2"
      title="What should we call you?"
      subtitle="Your first name shows on your passport page and on what you share."
      footer={<Button title="Next" onPress={() => void onNext()} />}
    >
      <FormField
        control={control}
        name="firstName"
        label="First name"
        autoComplete="given-name"
        textContentType="givenName"
        autoFocus
        onSubmitEditing={() => void onNext()}
      />
    </AuthLayout>
  );
}
