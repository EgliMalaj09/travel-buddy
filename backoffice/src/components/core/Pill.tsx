import type { ReactNode } from 'react';

/** A small state label: a dot plus words, so the state is never shown by colour alone. */
export function Pill({ tone, children }: { tone?: 'go' | 'sun' | 'flare' | 'jet'; children: ReactNode }) {
  return <span className={tone ? `pill ${tone}` : 'pill'}>{children}</span>;
}
