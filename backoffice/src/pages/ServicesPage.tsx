import { useState } from 'react';

import { api } from '@/api/client';
import { Banner, Button, Icon, PageHeader, Pill, Skeleton } from '@/components';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

const stateText: Record<string, { label: string; tone: 'go' | 'sun' | 'flare' | undefined }> = {
  ok: { label: 'Working', tone: 'go' },
  dev_only: { label: 'Development only', tone: 'sun' },
  not_configured: { label: 'Not set up', tone: undefined },
  down: { label: 'Not reachable', tone: 'flare' },
};

/**
 * The outside services the app depends on: are they answering, which (free) plan we use, and what must
 * change before the public launch (the switch list in decisions/releases.md).
 */
export function ServicesPage() {
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading } = useLoad(
    () => api.GET('/admin/services', { params: { query: { refresh: refresh > 0 } } }),
    [refresh],
  );
  return (
    <div className="page">
      <PageHeader
        kicker="Outside services"
        title="Services"
        lead={data ? `Checked ${formatDateTime(data.checkedAt)}. Answers are kept for 1 minute.` : undefined}
        action={
          <Button variant="alt" small disabled={loading} onClick={() => setRefresh((n) => n + 1)}>
            <Icon name="refresh" size={18} /> Check again
          </Button>
        }
      />
      {error ? <Banner tone="err" title="The status did not load">{error}</Banner> : null}
      {loading && !data ? <Skeleton height={200} /> : null}
      <div className="grid2">
        {data?.services.map((s) => {
          const st = stateText[s.state] ?? { label: s.state, tone: undefined };
          return (
            <section className="card pad-l" key={s.key}>
              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2 className="h2">{s.name}</h2>
                  <p className="cap">{s.usedFor}</p>
                </div>
                <Pill tone={st.tone}>{st.label}</Pill>
              </div>
              <dl className="facts">
                <dt>Now</dt>
                <dd>{s.plan}</dd>
                <dt>Before launch</dt>
                <dd>{s.beforeLaunch}</dd>
                {s.latencyMs != null || s.detail ? (
                  <>
                    <dt>Check</dt>
                    <dd className="num">
                      {[s.latencyMs != null ? `${s.latencyMs} ms` : null, s.detail].filter(Boolean).join(' · ')}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
