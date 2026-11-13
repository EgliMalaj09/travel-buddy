import { View } from 'react-native';

import { AppText, Card, Screen } from '@/components';
import { legalTexts } from '@/data/static/legalTexts';
import { type LegalBlock, parseLegal, section, type Span } from '@/lib/legalText';
import { useTheme } from '@/theme/ThemeProvider';

/** Route names: /legal/privacy, /legal/terms, /legal/entry-rules. */
export type LegalRouteDoc = 'privacy' | 'terms' | 'entry-rules';

function markdownFor(doc: string | undefined): string | null {
  if (doc === 'privacy') return legalTexts.privacy;
  if (doc === 'terms') return legalTexts.terms;
  // The entry-rules file holds three versions of the note; the app shows the full one.
  if (doc === 'entry-rules') return unquote(section(legalTexts.entryRules, 'Full note'));
  return null;
}

/** The full note is written as one quote in the .md file; on its own screen it reads as normal text. */
export function unquote(markdown: string): string {
  return markdown
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .replace(/^\*\*(.+)\*\*$/m, '# $1');
}

/**
 * Reads a legal text bundled with the app (KAN-62, drafts in legal/). Works offline, no network call.
 * Tables become one small card per row (label above value), so nothing scrolls sideways on a phone.
 */
export function LegalScreen({ doc }: { doc: string | undefined }) {
  const { space } = useTheme();
  const markdown = markdownFor(doc);
  if (markdown === null) {
    return (
      <Screen>
        <AppText variant="title">Not found</AppText>
        <AppText variant="body">This text does not exist. Go back and try again.</AppText>
      </Screen>
    );
  }
  return (
    <Screen>
      <View style={{ gap: space.md }}>
        {parseLegal(markdown).map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </View>
    </Screen>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  const { fonts } = useTheme();
  return (
    <>
      {spans.map((s, i) => (
        <AppText key={i} variant="body" style={s.bold ? { fontFamily: fonts.bodyMedium } : null}>
          {s.text}
        </AppText>
      ))}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const { colors, space, radii } = useTheme();
  switch (block.kind) {
    case 'title':
      return (
        <AppText variant="title" accessibilityRole="header">
          {block.spans.map((s) => s.text).join('')}
        </AppText>
      );
    case 'heading':
      return (
        <AppText variant="heading" accessibilityRole="header" style={{ marginTop: space.sm }}>
          {block.spans.map((s) => s.text).join('')}
        </AppText>
      );
    case 'paragraph':
      return (
        <AppText variant="body">
          <Spans spans={block.spans} />
        </AppText>
      );
    case 'bullet':
      return (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppText variant="body">•</AppText>
          <AppText variant="body" style={{ flex: 1 }}>
            <Spans spans={block.spans} />
          </AppText>
        </View>
      );
    case 'quote':
      return (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            borderLeftWidth: 3,
            borderLeftColor: colors.accent,
            padding: space.md,
          }}
        >
          <AppText variant="body">
            <Spans spans={block.spans} />
          </AppText>
        </View>
      );
    case 'table':
      return (
        <View style={{ gap: space.sm }}>
          {block.rows.map((row, r) => (
            <Card key={r}>
              {row.map((cell, c) => (
                <View key={c} style={{ gap: space.xs }}>
                  <AppText variant="date">{cell.label.toUpperCase()}</AppText>
                  <AppText variant="body">
                    <Spans spans={cell.spans} />
                  </AppText>
                </View>
              ))}
            </Card>
          ))}
        </View>
      );
  }
}
