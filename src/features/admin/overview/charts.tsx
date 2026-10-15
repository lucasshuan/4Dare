import type { ReactNode } from "react";

export interface Series {
  name: string;
  keys: string[];
  color: string;
}

/** Bars per day, one colour per series stacked; the total on top. */
export function StackedDays({
  days,
  series,
}: {
  days: { label: string; title: string; by: Record<string, number> }[];
  series: Series[];
}) {
  const totals = days.map((d) =>
    Object.values(d.by).reduce((a, b) => a + b, 0),
  );
  const W = 640;
  const H = 210;
  const L = 28;
  const B = 26;
  const T = 10;
  const max = Math.max(4, Math.ceil(Math.max(0, ...totals) / 4) * 4);
  const bw = (W - L) / Math.max(1, days.length);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Partidas por dia por jogo"
    >
      <g className="grid">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i;
          return (
            <g key={i}>
              <line x1={L} x2={W} y1={y(v)} y2={y(v)} />
              <text x={L - 6} y={y(v) + 3} textAnchor="end">
                {v}
              </text>
            </g>
          );
        })}
      </g>
      {days.map((d, i) => {
        const x = L + i * bw + bw * 0.18;
        const w = bw * 0.64;
        let acc = 0;
        const rects: ReactNode[] = [];
        for (const s of series) {
          const n = s.keys.reduce((a, k) => a + (d.by[k] ?? 0), 0);
          if (!n) continue;
          const y0 = y(acc);
          const y1 = y(acc + n);
          acc += n;
          rects.push(
            <rect
              key={s.name}
              x={x}
              y={y1}
              width={w}
              height={y0 - y1}
              rx={3}
              fill={s.color}
            >
              <title>{`${d.title} · ${s.name}: ${n}`}</title>
            </rect>,
          );
        }
        return (
          <g key={d.title}>
            {rects}
            {totals[i] ? (
              <text
                x={x + w / 2}
                y={y(totals[i]) - 4}
                textAnchor="middle"
                style={{ fill: "var(--ink)" }}
              >
                {totals[i]}
              </text>
            ) : null}
            <text x={x + w / 2} y={H - 8} textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A ring split by share, the total in the middle. */
export function Donut({
  parts,
  label,
}: {
  parts: { n: number; color: string }[];
  label: string;
}) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  const R = 54;
  const r = 34;
  const c = 70;
  const pt = (rad: number, a: number) =>
    `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
  let a0 = -Math.PI / 2;
  const arcs: ReactNode[] = [];
  parts.forEach((p, i) => {
    if (!p.n || !total) return;
    const a1 = a0 + (p.n / total) * Math.PI * 2;
    const lg = a1 - a0 > Math.PI ? 1 : 0;
    const e = a1 - 0.0001;
    arcs.push(
      <path
        // biome-ignore lint/suspicious/noArrayIndexKey: parts keep their order
        key={i}
        d={`M${pt(R, a0)} A${R} ${R} 0 ${lg} 1 ${pt(R, e)} L${pt(r, e)} A${r} ${r} 0 ${lg} 0 ${pt(r, a0)}Z`}
        fill={p.color}
      />,
    );
    a0 = a1;
  });
  return (
    <svg
      className="chart"
      viewBox="0 0 140 140"
      style={{ maxWidth: 170 }}
      role="img"
      aria-label={label}
    >
      {total ? (
        arcs
      ) : (
        <circle
          cx={c}
          cy={c}
          r={(R + r) / 2}
          fill="none"
          stroke="var(--sunken)"
          strokeWidth={R - r}
        />
      )}
      <text
        x="70"
        y="68"
        textAnchor="middle"
        style={{
          fill: "var(--ink)",
          fontFamily: "var(--f-display)",
          fontWeight: 800,
          fontSize: 22,
        }}
      >
        {total}
      </text>
      <text x="70" y="84" textAnchor="middle">
        jogadas
      </text>
    </svg>
  );
}

/** Horizontal bars, longest first, the count at the right. */
export function HBars({
  rows,
  color = "var(--sky)",
}: {
  rows: { key: string; label: string; n: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="muted">Nada ainda.</p>;
  return (
    <>
      {rows.map((r) => (
        <div className="hbar" key={r.key}>
          <span title={r.label}>{r.label}</span>
          <span className="t">
            <i style={{ width: `${(r.n / max) * 100}%`, background: color }} />
          </span>
          <b>{r.n}</b>
        </div>
      ))}
    </>
  );
}
