import type { ReactNode } from 'react';

import { Icon } from './Icon';

/** Banner. Errors say what happened, what is safe and what to do. */
export function Banner({ tone, title, children }: { tone?: 'warn' | 'err'; title?: string; children?: ReactNode }) {
  return (
    <div className={tone ? `banner ${tone}` : 'banner'} role={tone === 'err' ? 'alert' : 'status'}>
      <Icon name={tone ? 'alert' : 'info'} size={18} />
      <div>
        {title ? <b>{title}</b> : null}
        {children}
      </div>
    </div>
  );
}
