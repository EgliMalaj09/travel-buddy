import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button, Field } from '@/components/core';

/**
 * Confirmation for actions that cannot be undone or change an account. With `typeWord`, the admin types the
 * word (for example ERASE) so a stray click can never do it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  typeWord,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  typeWord?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped('');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const ready = !typeWord || typed === typeWord;
  return (
    <dialog ref={ref} className="dlg" aria-labelledby="dlg-title" onClose={onClose} onCancel={onClose}>
      {open ? (
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) onConfirm();
          }}
        >
          <h2 id="dlg-title" className="h1">
            {title}
          </h2>
          {children}
          {typeWord ? (
            <Field
              label={`Type ${typeWord} to confirm`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          ) : null}
          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" small onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={danger ? 'danger' : 'primary'} small disabled={!ready || busy}>
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
