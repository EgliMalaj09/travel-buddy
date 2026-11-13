import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { api } from '@/api/client';
import { Banner, Button, EmptyState, Field, PageHeader, Pill, Segmented, Skeleton } from '@/components';
import { formatDay, statusText, statusTone } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

type Status = '' | 'active' | 'suspended' | 'deletion_requested';

/**
 * Find accounts by id or part of the email. Emails are masked here; open the account to see it (audited).
 * Tap budget: type, Enter, click the account.
 */
export function UsersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as Status;
  const page = Number(params.get('page') ?? 0) || 0;
  const [text, setText] = useState(q);

  const { data, error, loading } = useLoad(
    () =>
      api.GET('/admin/users', {
        params: { query: { q: q || undefined, status: status || undefined, page } },
      }),
    [q, status, page],
  );

  const set = (next: Partial<{ q: string; status: string; page: number }>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === 0 || v === undefined) p.delete(k);
      else p.set(k, String(v));
    }
    if (!('page' in next)) p.delete('page');
    setParams(p);
  };

  const search = (e: FormEvent) => {
    e.preventDefault();
    set({ q: text.trim() });
  };

  const pages = data ? Math.max(1, Math.ceil(Number(data.total) / Number(data.pageSize))) : 1;

  return (
    <div className="page">
      <PageHeader kicker="Support" title="Accounts" lead="Search by account id or part of the email (3 letters or more)." />
      <form className="cluster" onSubmit={search} role="search" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 280px' }}>
          <Field label="Search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Email or id" />
        </div>
        <Button type="submit" small>
          Search
        </Button>
      </form>
      <Segmented<Status>
        label="Status"
        value={status}
        onChange={(v) => set({ status: v })}
        options={[
          { value: '', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'deletion_requested', label: 'Deleting' },
        ]}
      />
      {error ? <Banner tone="err" title="The list did not load">{error}</Banner> : null}
      <section className="card">
        {loading && !data ? (
          <Skeleton height={56} />
        ) : data && data.users.length === 0 ? (
          <EmptyState icon="search" title="No accounts found" message="Try fewer letters, or the full account id." />
        ) : data ? (
          <div className="tblw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Login</th>
                  <th>Joined</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link to={`/users/${u.id}`}>{u.maskedEmail}</Link>
                      <div className="mono" style={{ textTransform: 'none' }}>
                        {u.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>
                      <Pill tone={statusTone[u.status] as 'go'}>{statusText[u.status] ?? u.status}</Pill>
                    </td>
                    <td className="muted">{u.authProviders.join(', ')}</td>
                    <td className="num">{formatDay(u.createdAt)}</td>
                    <td className="num">{formatDay(u.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      {data && Number(data.total) > Number(data.pageSize) ? (
        <div className="cluster">
          <Button variant="alt" small disabled={page === 0} onClick={() => set({ page: page - 1 })}>
            Newer
          </Button>
          <span className="mono">
            Page {page + 1} of {pages} · {data.total} accounts
          </span>
          <Button variant="alt" small disabled={page + 1 >= pages} onClick={() => set({ page: page + 1 })}>
            Older
          </Button>
        </div>
      ) : null}
    </div>
  );
}
