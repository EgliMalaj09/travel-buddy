import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/core';

/** EmptyState: icon tile + title + one line + optional action. */
export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="tile">
        <Icon name={icon} size={24} />
      </div>
      <p className="h2">{title}</p>
      {message ? <p className="cap">{message}</p> : null}
      {action}
    </div>
  );
}
