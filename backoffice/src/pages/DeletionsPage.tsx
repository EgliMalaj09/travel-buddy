import { Link } from 'react-router';

import { api } from '@/api/client';
import { Banner, EmptyState, PageHeader, Skeleton } from '@/components';
import { formatDateTime, formatDay, relativeDays } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

/**
 * Accounts waiting to be erased (30 days after "Delete my account"). The purge job erases them by itself;
 * this page is for checking, and for an owner to erase at once when the person asked in writing.
 */
export function DeletionsPage() {
  const { data, error, loading } = useLoad(() => api.GET('/admin/deletions'), []);
  return (
    <div className="page">
      <PageHeader
        kicker="GDPR"
        title="Deletion queue"
        lead="Erased by the server on the date shown. Open an account to download its data or erase it now (owners)."
      />
      {error ? <Banner tone="err" title="The queue did not load">{error}</Banner> : null}
      <section className="card">
        {loading && !data ? (
          <Skeleton height={56} />
        ) : data && data.length === 0 ? (
          <EmptyState icon="trash" title="Nothing waiting" message="No account is waiting to be erased." />
        ) : data ? (
          <div className="tblw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Asked</th>
                  <th>Erased on</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/users/${d.id}`}>{d.maskedEmail}</Link>
                    </td>
                    <td className="num">{formatDay(d.requestedAt)}</td>
                    <td className="num">
                      {formatDateTime(d.deleteAfter)} <span className="muted">({relativeDays(d.deleteAfter)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
