import { formatDay, formatNumber } from '@/lib/format';

/**
 * One-series bar chart (sign-ups per day). Thin bars, 2px gaps, 4px rounded tops, one colour (jet);
 * each bar shows its day and value on hover or keyboard focus, and a table carries the same numbers
 * for screen readers. No legend: the card title names the series.
 */
export function BarChart({ title, data }: { title: string; data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <figure style={{ margin: 0 }}>
      <div className="bars" aria-hidden>
        {data.map((d) => (
          <div className="b" key={d.day} tabIndex={-1}>
            <i style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="tip">
              {formatDay(d.day)} · {formatNumber(d.count)}
            </span>
          </div>
        ))}
      </div>
      <div className="bars-axis">
        <span className="mono">{formatDay(data[0]?.day)}</span>
        <span className="mono">{formatDay(data.at(-1)?.day)}</span>
      </div>
      <figcaption className="cap" style={{ marginTop: 8 }}>
        {formatNumber(total)} in {data.length} days · highest {formatNumber(max === 1 && total === 0 ? 0 : max)} in a day
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{formatDay(d.day)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
