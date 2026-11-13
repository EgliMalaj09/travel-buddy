import { useState, type FormEvent } from 'react';

import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Banner, Button, ConfirmDialog, Field, PageHeader, Pill, SelectField, Skeleton } from '@/components';
import { formatDateTime, formatDay } from '@/lib/format';
import { roleText, type Role } from '@/lib/roles';
import { useLoad } from '@/lib/useLoad';

const roles = (['viewer', 'support', 'owner'] as Role[]).map((r) => ({ value: r, label: `${r[0]!.toUpperCase()}${r.slice(1)}` }));

/** The back office team (owners only): add an existing account with a password, change roles, reset 2FA, remove. */
export function TeamPage() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useLoad(() => api.GET('/admin/members'), []);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('support');
  const [note, setNote] = useState<{ tone?: 'err'; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'reset'; userId: string; who: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (call: () => Promise<{ response: Response; error?: unknown }>, done: string) => {
    setBusy(true);
    try {
      const { response, error: err } = await call();
      setNote(response.ok ? { text: done } : { tone: 'err', text: errorText(err) });
      if (response.ok) {
        setConfirm(null);
        reload();
      }
    } catch {
      setNote({ tone: 'err', text: 'Cannot reach the server. Nothing was changed; try again.' });
    } finally {
      setBusy(false);
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    void act(async () => {
      const r = await api.POST('/admin/members', { body: { email: email.trim(), role } });
      if (r.response.ok) setEmail('');
      return r;
    }, 'Added. At their first login they set up an authenticator app.');
  };

  return (
    <div className="page">
      <PageHeader kicker="Owners only" title="Team" lead="Everyone logs in with their own app account, password and authenticator app." />
      {note ? <Banner tone={note.tone}>{note.text}</Banner> : null}
      {error ? <Banner tone="err" title="The team did not load">{error}</Banner> : null}
      <section className="card pad-l">
        {loading && !data ? <Skeleton height={56} /> : null}
        <div className="rows">
          {data?.map((m) => {
            const self = m.userId === session?.me.userId;
            return (
              <div className="row" key={m.userId} style={{ flexWrap: 'wrap' }}>
                <div className="gr">
                  <b>
                    {m.maskedEmail}
                    {self ? ' (you)' : ''}
                  </b>
                  <small>
                    Added {formatDay(m.addedAt)} · last login {formatDateTime(m.lastLoginAt)}
                  </small>
                </div>
                {m.twoFactorReady ? <Pill tone="go">2FA on</Pill> : <Pill tone="sun">Setup pending</Pill>}
                <div style={{ width: 150 }}>
                  <SelectField
                    label="Role"
                    value={m.role}
                    disabled={self || busy}
                    options={roles}
                    onChange={(e) =>
                      act(
                        () => api.PUT('/admin/members/{userId}', { params: { path: { userId: m.userId } }, body: { role: e.target.value } }),
                        'Role changed. It works at once.',
                      )
                    }
                  />
                </div>
                <Button variant="ghost" small disabled={busy} onClick={() => setConfirm({ kind: 'reset', userId: m.userId, who: m.maskedEmail })}>
                  Reset 2FA
                </Button>
                <Button variant="ghost" small disabled={self || busy} onClick={() => setConfirm({ kind: 'remove', userId: m.userId, who: m.maskedEmail })}>
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <form className="card pad-l" onSubmit={add}>
        <h2 className="h2">Add someone</h2>
        <p className="cap">They need an app account with email and password first (Google or Apple only is not enough).</p>
        <div className="grid2">
          <Field label="Their email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SelectField label="Role" value={role} options={roles} onChange={(e) => setRole(e.target.value as Role)} />
        </div>
        <p className="hint">{roleText[role]}</p>
        <div>
          <Button type="submit" small disabled={busy || !email}>
            Add to the team
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm?.kind === 'remove'}
        title={`Remove ${confirm?.who ?? ''}?`}
        confirmLabel="Remove from the team"
        danger
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm && act(() => api.DELETE('/admin/members/{userId}', { params: { path: { userId: confirm.userId } } }), 'Removed. Their back office access ended at once.')
        }
      >
        <p className="cap">Their app account stays. Only the back office access ends, at once.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === 'reset'}
        title={`Reset 2FA for ${confirm?.who ?? ''}?`}
        confirmLabel="Reset 2FA"
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          act(
            () => api.POST('/admin/members/{userId}/reset-2fa', { params: { path: { userId: confirm.userId } } }),
            'Reset. At their next login they set up the authenticator app again.',
          )
        }
      >
        <p className="cap">For a lost phone. Check it is really them (for example a call) before you do this.</p>
      </ConfirmDialog>
    </div>
  );
}
