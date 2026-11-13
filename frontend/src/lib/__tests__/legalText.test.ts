import { legalTexts } from '@/data/static/legalTexts';
import { unquote } from '@/features/legal/LegalScreen';

import { isDraft, parseLegal, plainText, section, spans } from '../legalText';

describe('legal texts', () => {
  it('splits bold and drops backticks', () => {
    expect(spans('a **b** `c` d')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c d', bold: false },
    ]);
  });

  it('reads headings, paragraphs, bullets, quotes and tables', () => {
    const blocks = parseLegal(
      [
        '# Title',
        '',
        '> **DRAFT for legal review**',
        '',
        '## 1. Part',
        'One line',
        'two lines.',
        '',
        '- first',
        '  goes on',
        '- second',
        '',
        '| What | Why |',
        '| --- | --- |',
        '| **Account** | To log in |',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      'title',
      'quote',
      'heading',
      'paragraph',
      'bullet',
      'bullet',
      'table',
    ]);
    expect(plainText([blocks[3]!])).toBe('One line two lines.');
    expect(plainText([blocks[4]!])).toBe('first goes on');
    const table = blocks[6];
    expect(table?.kind === 'table' && table.rows[0]?.[1]).toEqual({
      label: 'Why',
      spans: [{ text: 'To log in', bold: false }],
    });
  });

  it('leaves the notes for the lawyer out of the app', () => {
    const blocks = parseLegal('Before\n\n> Lawyer: check this\n> please\n\nAfter');
    expect(plainText(blocks)).toBe('Before After');
    expect(plainText(parseLegal(legalTexts.privacy))).not.toMatch(/Lawyer:/);
  });

  it('bundles all three drafts, marked as drafts', () => {
    expect(isDraft(legalTexts.privacy)).toBe(true);
    expect(isDraft(legalTexts.terms)).toBe(true);
    expect(isDraft(legalTexts.entryRules)).toBe(true);
  });

  it('finds the entry-rules short and full notes', () => {
    expect(plainText(parseLegal(section(legalTexts.entryRules, 'Short note')))).toMatch(
      /Always check with official sources/,
    );
    const full = parseLegal(section(legalTexts.entryRules, 'Full note'));
    expect(full.filter((b) => b.kind === 'bullet')).toHaveLength(3);
    expect(plainText(full)).toMatch(/refused boarding/);
    const screen = parseLegal(unquote(section(legalTexts.entryRules, 'Full note')));
    expect(screen[0]).toEqual({
      kind: 'title',
      spans: [{ text: 'About visa and entry rules', bold: false }],
    });
    expect(screen.filter((b) => b.kind === 'quote')).toHaveLength(0);
  });
});
