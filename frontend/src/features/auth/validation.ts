import { z } from 'zod';

/** Form rules shared by the login screens (agreed rules: password ≥ 10 characters, 6-digit codes). */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .email('Enter a valid email');

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters');

export const codeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  ageConfirmed: z.literal(true, { error: 'You must be 16 or older' }),
  termsAccepted: z.literal(true, { error: 'Please accept the terms and privacy policy' }),
  marketingConsent: z.boolean(),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({
    code: codeSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export const profileNameSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(60, 'Use at most 60 characters'),
});

export const profileTravelSchema = z.object({
  passportCountry: z.string().length(2, 'Choose your passport country'),
  residenceCountry: z.string().length(2, 'Choose the country you live in'),
  homeCurrency: z.string().length(3, 'Choose your home currency'),
});

export const socialConsentsSchema = z.object({
  ageConfirmed: z.literal(true, { error: 'You must be 16 or older' }),
  termsAccepted: z.literal(true, { error: 'Please accept the terms and privacy policy' }),
  marketingConsent: z.boolean(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type SignUpForm = z.infer<typeof signUpSchema>;
export type ResetForm = z.infer<typeof resetSchema>;
