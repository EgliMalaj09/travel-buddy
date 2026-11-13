import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { api, errorText } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Banner, Button, ConfirmDialog, EmptyState, Icon, PageHeader, Pill, SelectField, Skeleton, StatTiles } from '@/components';
import { downloadJson } from '@/lib/download';
import { formatDateTime, formatDay, reasonText, relativeDays, statusText, statusTone } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

type Dialog = 'suspend' | 'unsuspend' | 'signout' | 'erase' | null;

/**
 * One account for support (opening it is written to the audit log). No name, countries, trip names or places:
 * support does not need them. Actions: suspend / lift, sign out everywhere, export and erase (owners).
 */
export function UserPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { data: u, error, loading, reload } = useLoad(() => api.GET('/admin/users/{id}', { params: { path: { id } } }), [id]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('abuse');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone?: 'err'; text: string } | null>(null);

  const run = async (action: () => Promise<{ error?: unknown; response: Response }>, done: string, after?: () => void) => {
    setBusy(true);
    try {
      const { error: err, response } = await action();
      if (response.ok) {
        setNote({ text: done });
        setDialog(null);
        if (after) after();
        else reload();
      } else setNote({ tone: 'err', text: errorText(err) });
    } catch {
      setNote({ tone: 'err', text: 'Cannot reach the server. Nothing was changed; try again.' });
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const { data, error: err } = await api.GET('/admin/users/{id}/export', { params: { path: { id } } });
      if (data) {
        downloadJson(`travel-app-export-${id}.json`, data);
        setNote({ text: 'Export downloaded. Send it to the person only through a safe channel, then delete your copy.' });
      } else setNote({ tone: 'err', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !u) return <Skeleton height={240} />;
  if (error || !u) {
    return (
      <div className="page">
        <Link to="/users" className="cap">
          ← Accounts
        </Link>
        <EmptyState icon="users" title="Account not found" message={error ?? undefined} />
      </div>
    );
  }

  const suspended = u.status === 'suspended';
  const path = { params: { path: { id } } };

  return (
    <div className="page">
      <Link to="/users" className="cap" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon name="back" size={16} /> Accounts
      </Link>
      <PageHeader
        kicker={`Account ${u.id}`}
        title={u.email}
        action={<Pill tone={statusTone[u.status] as 'go'}>{statusText[u.status] ?? u.status}</Pill>}
      />
      {note ? <Banner tone={note.tone}>{note.text}</Banner> : null}
      {u.isAdmin ? <Banner title="Back office team member">Remove this account from the team before suspending or erasing it.</Banner> : null}
      {u.deleteAfter ? (
        <Banner tone="warn" title={`Erased ${relativeDays(u.deleteAfter)}`}>
          The person asked to delete this account on {formatDay(u.deletionRequestedAt)}. Everything goes on {formatDateTime(u.deleteAfter)} unless they
          restore it in the app.
        </Banner>
      ) : null}

      <StatTiles stats={u.counts.map((c) => ({ key: c.key, label: c.label, value: c.value, hint: c.hint }))} />

      <div className="grid2">
        <section className="card pad-l">
          <h2 className="h2">Account</h2>
          <dl className="facts">
            <dt>Login</dt>
            <dd>{u.authProviders.join(', ') || '–'}{u.hasPassword ? '' : ' (no password)'}</dd>
            <dt>Joined</dt>
            <dd className="num">{formatDateTime(u.createdAt)}</dd>
            <dt>Profile done</dt>
            <dd className="num">{formatDay(u.onboardingCompletedAt)}</dd>
            <dt>Last active</dt>
            <dd className="num">{formatDateTime(u.lastActiveAt)}</dd>
            <dt>Phones signed in</dt>
            <dd className="num">{u.activeSessions}</dd>
            {suspended ? (
              <>
                <dt>Suspended</dt>
                <dd>
                  {formatDateTime(u.suspendedAt)} · {reasonText[u.suspensionReason ?? ''] ?? u.suspensionReason}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
        <section className="card pad-l">
          <h2 className="h2">Consents</h2>
          <dl className="facts">
            <dt>Terms</dt>
            <dd>{u.termsVersion ? `${u.termsVersion}, ${formatDay(u.termsAcceptedAt)}` : 'Not yet'}</dd>
            <dt>Privacy</dt>
            <dd>{u.privacyVersion ? `${u.privacyVersion}, ${formatDay(u.privacyAcceptedAt)}` : 'Not yet'}</dd>
            <dt>Travel tips email</dt>
            <dd>{u.marketingConsent ? 'Yes' : 'No'}</dd>
          </dl>
        </section>
      </div>

      <section className="card pad-l" aria-labelledby="trips">
        <h2 id="trips" className="h2">Trips</h2>
        <p className="cap">Dates and stops only. Names, places and notes stay private.</p>
        {u.trips.length === 0 ? (
          <p className="muted">No trips yet.</p>
        ) : (
          <div className="tblw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Stops</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {u.trips.map((t) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ textTransform: 'none' }}>{t.id.slice(0, 8)}</td>
                    <td>{t.deletedAt ? <Pill tone="flare">Deleted</Pill> : <Pill tone={t.status === 'finished' ? 'go' : 'jet'}>{t.status}</Pill>}</td>
                    <td className="num">{t.startDate ? `${formatDay(t.startDate)} – ${formatDay(t.endDate)}` : 'Someday'}</td>
                    <td className="num">{t.stops}</td>
                    <td className="num">{formatDay(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card pad-l" aria-labelledby="actions">
        <h2 id="actions" className="h2">Actions</h2>
        <div className="cluster">
          {suspended ? (
            <Button small onClick={() => setDialog('unsuspend')}>Lift suspension</Button>
          ) : (
            <Button small variant="alt" disabled={u.isAdmin} onClick={() => setDialog('suspend')}>Suspend account</Button>
          )}
          <Button small variant="alt" disabled={u.activeSessions === 0} onClick={() => setDialog('signout')}>Sign out everywhere</Button>
          {can('owner') ? (
            <>
              <Button small variant="alt" disabled={busy} onClick={exportData}>Download data (GDPR)</Button>
              <Button small variant="danger" disabled={u.isAdmin} onClick={() => setDialog('erase')}>Erase now</Button>
            </>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={dialog === 'suspend'}
        title="Suspend this account?"
        confirmLabel="Suspend account"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => api.POST('/admin/users/{id}/suspend', { ...path, body: { reason } }), 'Account suspended. Every phone is signed out.')}
      >
        <p className="cap">They cannot log in until you lift it, and every phone is signed out. Their data stays.</p>
        <SelectField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={Object.entries(reasonText).map(([value, label]) => ({ value, label }))}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'unsuspend'}
        title="Lift the suspension?"
        confirmLabel="Lift suspension"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => api.POST('/admin/users/{id}/unsuspend', path), 'Suspension lifted. They can log in again.')}
      />
      <ConfirmDialog
        open={dialog === 'signout'}
        title="Sign out every phone?"
        confirmLabel="Sign out everywhere"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => api.POST('/admin/users/{id}/sign-out', path), 'Every phone is signed out. Data on the server is safe.')}
      >
        <p className="cap">For a lost or stolen phone. They log in again with their password and an email code.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'erase'}
        title="Erase this account now?"
        confirmLabel="Erase for good"
        danger
        typeWord="ERASE"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          run(
            () => api.POST('/admin/users/{id}/erase', { ...path, body: { confirm: 'ERASE' } }),
            'Account erased.',
            () => navigate('/users', { replace: true }),
          )
        }
      >
        <p className="cap">
          Only for a written erasure request. The account, trips, places, photos and expenses are removed at once. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
