import type { ReactNode } from 'react';
import type { Career, StatLine } from '../engine/types';
import { averages, f1, fpct } from '../engine/stats';
import { countryByCode } from '../content/names';
import { Icon } from './icons';

export const flag = (code: string) => countryByCode(code).flag;
export const natName = (code: string) => countryByCode(code).name;
export const cm = (h: number) => `${(h / 100).toFixed(2)} m`;
export const ftIn = (h: number) => {
  const inches = Math.round(h / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
};

export function PageHead({ eyebrow, title, desc, children }: { eyebrow?: string; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="page-head anim-in">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

export function Card({ title, icon, action, children, className, style }: { title?: ReactNode; icon?: string; action?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card ${className ?? ''}`} style={style}>
      {(title || action) && (
        <div className="card-head">
          <h3>{icon && <Icon name={icon} />} {title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ v, l, tone }: { v: ReactNode; l: string; tone?: 'good' | 'bad' | 'accent' | 'gold' }) {
  return (
    <div className="kpi">
      <span className={`v ${tone ?? ''}`}>{v}</span>
      <span className="l">{l}</span>
    </div>
  );
}

export function Gauge({ label, value, max = 100, color, hint }: { label: string; value: number; max?: number; color?: string; hint?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const auto = pct >= 66 ? 'var(--good)' : pct >= 40 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div className="gauge" title={hint}>
      <div className="top"><span>{label}</span><b>{Math.round(value)}</b></div>
      <div className="bar" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <span style={{ width: `${pct}%`, background: color ?? auto }} />
      </div>
    </div>
  );
}

export function attrColor(v: number) {
  if (v >= 85) return 'var(--good)';
  if (v >= 72) return '#a3e635';
  if (v >= 60) return 'var(--warn)';
  if (v >= 48) return 'var(--accent)';
  return 'var(--bad)';
}

export function StatLineRow({ s, label }: { s: StatLine; label: ReactNode }) {
  const a = averages(s);
  return (
    <tr>
      <td className="l">{label}</td>
      <td>{s.gp}</td><td>{s.gs}</td><td>{f1(a.mpg)}</td><td><b>{f1(a.ppg)}</b></td><td>{f1(a.rpg)}</td><td>{f1(a.apg)}</td>
      <td>{f1(a.spg)}</td><td>{f1(a.bpg)}</td><td>{f1(a.tpg)}</td><td>{fpct(a.fgp)}</td><td>{fpct(a.tpp)}</td><td>{fpct(a.ftp)}</td><td>{fpct(a.ts)}</td>
    </tr>
  );
}
export const STAT_HEAD = ['PJ', 'TIT', 'MIN', 'PTS', 'REB', 'AST', 'ROB', 'TAP', 'PÉR', 'TC%', 'T3%', 'TL%', 'TS%'];

export function Empty({ icon = '🏀', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {children && <div className="muted small">{children}</div>}
    </div>
  );
}

export const PHASE_LABEL: Record<Career['phase'], string> = {
  predraft: 'Camino al draft',
  draft: 'Draft',
  signing: 'Firma del primer contrato',
  preseason: 'Pretemporada',
  regular: 'Temporada regular',
  postseason: 'Postemporada',
  'season-end': 'Fin de temporada',
  offseason: 'Temporada baja',
  retired: 'Retirado',
};

export const MODE_LABEL: Record<Career['mode'], string> = { express: 'Carrera exprés', quick: 'Carrera normal', full: 'Carrera larga', daily: 'Desafío diario' };
