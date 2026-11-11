import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { Input } from '@/components';

/** An Input connected to react-hook-form; shows the zod error under the field. */
export function FormField<T extends FieldValues>({
  control,
  name,
  ...input
}: { control: Control<T>; name: Path<T> } & Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'onBlur' | 'error'
>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...input}
          value={field.value as string}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
