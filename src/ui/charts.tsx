// Lightweight SVG charts. They only render data passed in from the career state.
import { useId } from 'react';

export interface Series { label: string; color: string; values: (number | null)[] }

export function LineChart({ labels, series, height = 200, yMin, yMax, format = (v: number) => String(Math.round(v)) }: { labels: string[]; series: Series[]; height?: number; yMin?: number; yMax?: number; format?: (v: number) => string }) {
  const id = useId();
  const W = 600;
  const H = height;
  const pad = { l: 38, r: 14, t: 14, b: 26 };
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!all.length || labels.length === 0) return <div className="empty small">Sin datos todavía.</div>;
  let lo = yMin ?? Math.min(...all);
  let hi = yMax ?? Math.max(...all);
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const span = hi - lo;
  lo -= yMin === undefined ? span * 0.08 : 0;
  hi += yMax === undefined ? span * 0.08 : 0;
  const x = (i: number) => pad.l + (labels.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (labels.length - 1));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + t * (hi - lo));
  const step = Math.ceil(labels.length / 8);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.label).join(', ')} style={{ display: 'block' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#262b34" strokeDasharray={i === 0 ? '' : '3 4'} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#767d8a">{format(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % step === 0 || i === labels.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#767d8a">{l}</text>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter(Boolean) as [number, number][];
          if (!pts.length) return null;
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          const area = `${d} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z`;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={`${id}-${si}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="1" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {si === 0 && <path d={area} fill={`url(#${id}-${si})`} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#13161b" stroke={s.color} strokeWidth="2"><title>{`${s.label}: ${format(s.values.filter((v) => v !== null)[i] as number)}`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <figcaption className="row wrap small muted" style={{ gap: 14, marginTop: 6 }}>
          {series.map((s) => <span key={s.label} className="row" style={{ gap: 6 }}><span className="team-dot" style={{ background: s.color }} />{s.label}</span>)}
        </figcaption>
      )}
    </figure>
  );
}

export function BarChart({ labels, values, color = 'var(--accent)', height = 180, format = (v: number) => String(Math.round(v)) }: { labels: string[]; values: number[]; color?: string; height?: number; format?: (v: number) => string }) {
  const W = 600;
  const H = height;
  const pad = { l: 8, r: 8, t: 18, b: 24 };
  if (!values.length) return <div className="empty small">Sin datos todavía.</div>;
  const max = Math.max(...values, 1);
  const bw = (W - pad.l - pad.r) / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico de barras" style={{ display: 'block' }}>
      {values.map((v, i) => {
        const h = (v / max) * (H - pad.t - pad.b);
        const x = pad.l + i * bw + bw * 0.15;
        return (
          <g key={i}>
            <rect x={x} y={H - pad.b - h} width={bw * 0.7} height={Math.max(1, h)} rx="4" fill={color} opacity={0.9}><title>{`${labels[i]}: ${format(v)}`}</title></rect>
            {values.length <= 20 && <text x={x + bw * 0.35} y={H - pad.b - h - 5} textAnchor="middle" fontSize="10" fill="#b0b6c1">{format(v)}</text>}
            {(values.length <= 12 || i % Math.ceil(values.length / 10) === 0) && <text x={x + bw * 0.35} y={H - 8} textAnchor="middle" fontSize="10" fill="#767d8a">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function Radar({ axes, values, compare, size = 260 }: { axes: string[]; values: number[]; compare?: number[]; size?: number }) {
  const c = size / 2;
  const r = c - 46;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / 99), c + Math.sin(a) * r * (v / 99)];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img" aria-label={`Radar: ${axes.map((a, i) => `${a} ${values[i]}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={poly(axes.map(() => 99 * k))} fill="none" stroke="#262b34" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, 99); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#262b34" />; })}
      {compare && <polygon points={poly(compare)} fill="rgba(96,165,250,.12)" stroke="#60a5fa" strokeDasharray="4 3" />}
      <polygon points={poly(values)} fill="rgba(255,107,26,.22)" stroke="var(--accent)" strokeWidth="2" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, 120);
        return <text key={a} x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#b0b6c1" fontWeight="600">{a} <tspan fill="#f4f5f7">{Math.round(values[i])}</tspan></text>;
      })}
    </svg>
  );
}

export function Spark({ values, color = 'var(--accent)', w = 120, h = 32 }: { values: number[]; color?: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * w) / (values.length - 1)},${h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}
