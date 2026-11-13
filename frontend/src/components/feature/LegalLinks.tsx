import { View } from 'react-native';

import { Button } from '@/components/core';
import { useTheme } from '@/theme/ThemeProvider';

export type LegalDocLink = 'terms' | 'privacy' | 'entry-rules';

/**
 * "Read the terms" and "Read the privacy policy" (and on the You tab "Visa and entry rules"): open the texts
 * bundled with the app (KAN-62). Used next to the consent checkbox at sign-up and profile setup, and in About.
 * The screen decides how to open them (`openLegal` in features/legal).
 */
export function LegalLinks({
  onOpen,
  entryRules = false,
}: {
  onOpen: (doc: LegalDocLink) => void;
  entryRules?: boolean;
}) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
      <Button
        kind="ghost"
        title="Read the terms"
        accessibilityHint="Opens the terms of use"
        onPress={() => onOpen('terms')}
      />
      <Button
        kind="ghost"
        title="Read the privacy policy"
        accessibilityHint="Opens the privacy policy"
        onPress={() => onOpen('privacy')}
      />
      {entryRules ? (
        <Button
          kind="ghost"
          title="Visa and entry rules"
          accessibilityHint="Opens the note about visa and entry rules"
          onPress={() => onOpen('entry-rules')}
        />
      ) : null}
    </View>
  );
}
