import type { ReactNode } from 'react';

/** Mono kicker, display title and an optional action on the right. */
export function PageHeader({ kicker, title, lead, action }: { kicker: string; title: string; lead?: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <span className="mono">{kicker}</span>
        <h1 className="d2">{title}</h1>
        {lead ? <p className="cap">{lead}</p> : null}
      </div>
      {action}
    </header>
  );
}
