import { api } from '@/api/client';
import { Banner, BarChart, PageHeader, Skeleton, StatTiles } from '@/components';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

/** Dashboard: account counts, sign-ups per day and content totals. Counts only, no personal data. */
export function DashboardPage() {
  const { data, error, loading } = useLoad(() => api.GET('/admin/dashboard'), []);
  const u = data?.users;

  return (
    <div className="page">
      <PageHeader kicker="Now" title="Dashboard" lead={data ? `Counted ${formatDateTime(data.at)}` : undefined} />
      {error ? <Banner tone="err" title="The dashboard did not load">{error}</Banner> : null}
      {loading && !data ? <Skeleton height={112} /> : null}
      {u ? (
        <>
          <section className="stack" aria-labelledby="accounts">
            <h2 id="accounts" className="h1">Accounts</h2>
            <StatTiles
              stats={[
                { key: 'total', label: 'Accounts', value: u.total, hint: `${u.newLast7Days} new this week` },
                { key: 'active7', label: 'Active, 7 days', value: u.activeLast7Days, hint: `${u.activeLast30Days} in 30 days` },
                { key: 'new30', label: 'New, 30 days', value: u.newLast30Days },
                { key: 'deleting', label: 'Waiting to be erased', value: u.deletionRequested },
                { key: 'suspended', label: 'Suspended', value: u.suspended },
              ]}
            />
          </section>
          <section className="card pad-l" aria-labelledby="signups">
            <h2 id="signups" className="h2">Sign-ups per day, last 30 days</h2>
            <BarChart title="Sign-ups per day" data={u.signUpsPerDay.map((d) => ({ day: d.day, count: Number(d.count) }))} />
          </section>
          <section className="stack" aria-labelledby="content">
            <h2 id="content" className="h1">Content</h2>
            <StatTiles stats={data!.content.map((m) => ({ key: m.key, label: m.label, value: m.value, hint: m.hint }))} />
          </section>
          <p className="hint">Active means the app started or refreshed a session. Deleted records are not counted.</p>
        </>
      ) : null}
    </div>
  );
}
