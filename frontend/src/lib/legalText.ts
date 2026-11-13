/**
 * Turns the legal drafts (legal/*.md, KAN-62) into simple blocks the app can draw with its own components.
 * Only the small part of Markdown the drafts use: headings, paragraphs, bullets, quotes, tables, **bold**
 * and `code`. Notes meant for the lawyer (quotes starting with "Lawyer") are left out of the app.
 */
export interface Span {
  text: string;
  bold: boolean;
}

export type LegalBlock =
  | { kind: 'title'; spans: Span[] }
  | { kind: 'heading'; spans: Span[] }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'bullet'; spans: Span[] }
  | { kind: 'quote'; spans: Span[] }
  | { kind: 'table'; rows: { label: string; spans: Span[] }[][] };

/** "**a** b `c`" -> [{a, bold}, {" b c", plain}]. Backticks are dropped, links are not used in the drafts. */
export function spans(text: string): Span[] {
  const out: Span[] = [];
  text
    .replace(/`([^`]*)`/g, '$1')
    .split(/(\*\*[^*]+\*\*)/)
    .forEach((part) => {
      if (!part) return;
      const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      const value = bold ? part.slice(2, -2) : part;
      const last = out[out.length - 1];
      if (last && last.bold === bold) last.text += value;
      else out.push({ text: value, bold });
    });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function parseLegal(markdown: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ kind: 'title', spans: spans(trimmed.slice(2)) });
      i += 1;
    } else if (/^#{2,3} /.test(trimmed)) {
      blocks.push({ kind: 'heading', spans: spans(trimmed.replace(/^#+ /, '')) });
      i += 1;
    } else if (trimmed.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
        quote.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      const text = quote.join('\n').trim();
      if (!/^(\*\*)?Lawyer/i.test(text)) pushQuote(blocks, text);
    } else if (trimmed.startsWith('|')) {
      const header = cells(trimmed);
      i += 2; // header and the --- line
      const rows: { label: string; spans: Span[] }[][] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(
          cells(lines[i] ?? '').map((c, n) => ({ label: header[n] ?? '', spans: spans(c) })),
        );
        i += 1;
      }
      blocks.push({ kind: 'table', rows });
    } else if (/^(- |\d+\. )/.test(trimmed)) {
      let text = trimmed.replace(/^(- |\d+\. )/, '');
      i += 1;
      while (
        i < lines.length &&
        /^\s{2,}\S/.test(lines[i] ?? '') &&
        !/^\s*(- |\d+\. )/.test(lines[i] ?? '')
      ) {
        text += ' ' + (lines[i] ?? '').trim();
        i += 1;
      }
      blocks.push({ kind: 'bullet', spans: spans(text) });
    } else {
      const para: string[] = [];
      while (i < lines.length) {
        const l = (lines[i] ?? '').trim();
        if (!l || /^(#|>|\||- |\d+\. )/.test(l)) break;
        para.push(l);
        i += 1;
      }
      blocks.push({ kind: 'paragraph', spans: spans(para.join(' ')) });
    }
  }
  return blocks;
}

/** A quote may hold its own paragraphs and bullets (the full entry-rules note). */
function pushQuote(blocks: LegalBlock[], text: string) {
  for (const part of text.split(/\n\s*\n/)) {
    const lines = part.split('\n');
    if (lines.every((l) => /^- /.test(l.trim()) || /^\s{2,}/.test(l))) {
      parseLegal(part).forEach((b) => blocks.push(b));
    } else {
      blocks.push({ kind: 'quote', spans: spans(lines.join(' ')) });
    }
  }
}

/** The first quote of a draft is its "DRAFT for legal review" line. */
export function isDraft(markdown: string): boolean {
  return /DRAFT for legal review/.test(markdown);
}

/** The Markdown under the "## <startsWith>…" heading, up to the next "## " heading. Empty when missing. */
export function section(markdown: string, startsWith: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.slice(3).startsWith(startsWith));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** Plain text of blocks (for short notes shown as one line of text). */
export function plainText(blocks: LegalBlock[]): string {
  return blocks
    .map((b) => (b.kind === 'table' ? '' : b.spans.map((s) => s.text).join('')))
    .filter(Boolean)
    .join(' ');
}
