import { Link, useSearchParams } from 'react-router';

import { api } from '@/api/client';
import { Banner, Button, EmptyState, PageHeader, SelectField, Skeleton } from '@/components';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

export const actionText: Record<string, string> = {
  'admin.login': 'Logged in',
  'admin.2fa_enrolled': 'Set up 2FA and logged in',
  'admin.code_failed': 'Wrong 2FA code',
  'users.searched': 'Searched accounts',
  'user.viewed': 'Opened an account',
  'user.suspended': 'Suspended an account',
  'user.unsuspended': 'Lifted a suspension',
  'user.signed_out': 'Signed out every phone',
  'user.exported': 'Downloaded account data',
  'user.erased': 'Erased an account',
  'deletions.viewed': 'Opened the deletion queue',
  'config.updated': 'Changed app settings',
  'member.added': 'Added a team member',
  'member.role_changed': 'Changed a role',
  'member.removed': 'Removed a team member',
  'member.2fa_reset': 'Reset 2FA',
};

/** Every admin action, newest first. Ids and codes only, never personal data. Kept 2 years. */
export function AuditPage() {
  const [params, setParams] = useSearchParams();
  const action = params.get('action') ?? '';
  const page = Number(params.get('page') ?? 0) || 0;
  const { data, error, loading } = useLoad(
    () => api.GET('/admin/audit', { params: { query: { action: action || undefined, page } } }),
    [action, page],
  );
  const pages = data ? Math.max(1, Math.ceil(Number(data.total) / Number(data.pageSize))) : 1;
  const go = (next: { action?: string; page?: number }) => {
    const p = new URLSearchParams();
    const a = next.action ?? action;
    if (a) p.set('action', a);
    if (next.page) p.set('page', String(next.page));
    setParams(p);
  };

  return (
    <div className="page">
      <PageHeader kicker="Owners only" title="Audit log" lead="Who did what and when. Kept for 2 years, then removed." />
      <div style={{ maxWidth: 320 }}>
        <SelectField
          label="Action"
          value={action}
          onChange={(e) => go({ action: e.target.value, page: 0 })}
          options={[{ value: '', label: 'All actions' }, ...Object.entries(actionText).map(([value, label]) => ({ value, label }))]}
        />
      </div>
      {error ? <Banner tone="err" title="The log did not load">{error}</Banner> : null}
      <section className="card">
        {loading && !data ? (
          <Skeleton height={56} />
        ) : data && data.entries.length === 0 ? (
          <EmptyState icon="list" title="Nothing here yet" />
        ) : data ? (
          <div className="tblw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>On</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.at)}</td>
                    <td>{e.adminMaskedEmail ?? <span className="muted">–</span>}</td>
                    <td>{actionText[e.action] ?? e.action}</td>
                    <td className="mono" style={{ textTransform: 'none' }}>
                      {e.targetType === 'user' && e.targetId ? <Link to={`/users/${e.targetId}`}>{e.targetId.slice(0, 8)}</Link> : (e.targetId?.slice(0, 8) ?? '')}
                    </td>
                    <td className="muted">{e.details ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      {data && Number(data.total) > Number(data.pageSize) ? (
        <div className="cluster">
          <Button variant="alt" small disabled={page === 0} onClick={() => go({ page: page - 1 })}>Newer</Button>
          <span className="mono">Page {page + 1} of {pages}</span>
          <Button variant="alt" small disabled={page + 1 >= pages} onClick={() => go({ page: page + 1 })}>Older</Button>
        </div>
      ) : null}
    </div>
  );
}
