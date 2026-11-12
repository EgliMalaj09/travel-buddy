import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { authMode } from '../authMode';
import { MOCK_CODE } from '../mockAuthService';

/** Page frame for the login screens: title, text, form, and a footer pinned near the thumb. */
export function AuthLayout({
  title,
  subtitle,
  step,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  /** e.g. "Step 1 of 2" */
  step?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors, space } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: space.lg, gap: space.lg }}
        >
          <View style={{ gap: space.sm }}>
            {step ? <AppText variant="date">{step}</AppText> : null}
            <AppText variant="title">{title}</AppText>
            {subtitle ? (
              <AppText variant="body" color={colors.inkSoft}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {children}
          {footer ? (
            <View style={{ marginTop: 'auto', paddingTop: space.lg, gap: space.sm }}>{footer}</View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Tells testers where the code is: the fixed mock code, or (development builds with the real API)
 * the API log, because no email is sent yet (A6). Hidden in release builds.
 */
export function MockCodeHint() {
  const { colors, radii, space } = useTheme();
  if (authMode !== 'mock' && !__DEV__) return null;
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.bucket,
        borderRadius: radii.md,
        padding: space.md,
      }}
    >
      <AppText variant="caption" color={colors.bucket}>
        {authMode === 'mock'
          ? `Test mode: no email is sent. The code is ${MOCK_CODE}.`
          : 'Development: no email is sent yet. The code is in the API window (the one running dotnet run), in a line with "[dev email]".'}
      </AppText>
    </View>
  );
}

/** Red message box for errors from the server (wrong password, wrong code…). */
export function FormError({ message }: { message: string | null }) {
  const { colors, radii, space } = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.surface,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        borderRadius: radii.sm,
        padding: space.md,
      }}
    >
      <AppText variant="body" color={colors.accent}>
        {message}
      </AppText>
    </View>
  );
}
