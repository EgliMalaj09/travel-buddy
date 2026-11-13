import { formatNumber } from '@/lib/format';

export type Stat = { key: string; label: string; value: number | string; hint?: string | null };

/** StatTiles: big numbers in the display face, mono labels, tabular figures. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div className="stat" key={s.key}>
          <span className="mono">{s.label}</span>
          <span className="v">{formatNumber(s.value)}</span>
          {s.hint ? <span className="h">{s.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}
