import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/** Page frame for the trip steps: step line, title, content, and buttons near the thumb. */
export function TripFormLayout({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
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
            <AppText variant="date">{step}</AppText>
            <AppText variant="title">{title}</AppText>
            {subtitle ? (
              <AppText variant="body" color={colors.inkSoft}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {children}
        </ScrollView>
        <View
          style={{
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            gap: space.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          {footer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Calm message under a step when something blocks "Next". */
export function StepHint({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <AppText variant="caption" color={colors.accent} accessibilityRole="alert">
      {message}
    </AppText>
  );
}
