import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { crestFor, initials, leagueMeta, pct, teamColor, type FixtureRow, type NewsItem, type ResultRow, type StandingRow, type StatRow } from '../data';

export function SectionHeader({ title, right, id }: { title: string; right?: ReactNode; id?: string }) {
  return (
    <div id={id} className="flex items-center justify-between gap-space-md mb-space-sm">
      <div className="flex items-center gap-space-sm">
        <span className="w-1 h-5 bg-primary-container rounded" />
        <h2 className="font-display text-headline-md font-bold uppercase tracking-wider text-text-primary m-0">{title}</h2>
      </div>
      {right && <div className="font-display text-label-table-header uppercase text-text-muted flex items-center gap-1">{right}</div>}
    </div>
  );
}

export function TeamBadge({ name, size = 24 }: { name: string; size?: number }) {
  const crest = crestFor(name);
  const [broken, setBroken] = useState(false);
  if (crest && !broken) {
    return (
      <img
        src={crest}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full bg-white/95 object-contain p-[2px] shrink-0 ring-1 ring-black/20"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className="rounded-full grid place-items-center font-display font-bold text-white shrink-0 ring-1 ring-black/20"
      style={{ width: size, height: size, background: teamColor(name), fontSize: Math.max(8, size * 0.34) }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function LeagueChip({ league }: { league: string }) {
  const meta = leagueMeta(league);
  return (
    <span className={`font-display text-label-table-header uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.chip}`}>
      {meta.label}
    </span>
  );
}

/** Fila de partido con estado (FINAL / EN VIVO / hora). */
export function MatchRow({ match, status }: { match: FixtureRow | ResultRow; status: 'final' | 'live' | 'scheduled' }) {
  const score = 'hs' in match ? { home: (match as ResultRow).hs, away: (match as ResultRow).as } : null;
  const homeWon = score ? score.home > score.away : false;
  const awayWon = score ? score.away > score.home : false;
  return (
    <div className="flex items-center gap-space-sm px-space-sm py-2 rounded hover:bg-court-surface-elevated transition-colors">
      <div className="w-16 shrink-0 text-center">
        {status === 'live' ? (
          <span className="inline-flex items-center gap-1 font-display text-label-match-status uppercase text-live-red font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />LIVE
          </span>
        ) : status === 'final' ? (
          <span className="font-display text-label-match-status uppercase text-text-dim font-bold">FINAL</span>
        ) : (
          <span className="font-display text-label-match-status uppercase text-secondary font-bold">{('time' in match && match.time) || '—'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className={`flex items-center justify-between gap-space-sm ${homeWon ? 'text-text-primary font-semibold' : 'text-on-surface-variant'}`}>
          <span className="flex items-center gap-2 min-w-0">
            <TeamBadge name={match.home} size={20} />
            <span className="truncate text-body-sm">{match.home}</span>
          </span>
          {score && <span className="font-display text-score-display-sm tabular-nums">{score.home}</span>}
        </div>
        <div className={`flex items-center justify-between gap-space-sm ${awayWon ? 'text-text-primary font-semibold' : 'text-on-surface-variant'}`}>
          <span className="flex items-center gap-2 min-w-0">
            <TeamBadge name={match.away} size={20} />
            <span className="truncate text-body-sm">{match.away}</span>
          </span>
          {score && <span className="font-display text-score-display-sm tabular-nums">{score.away}</span>}
        </div>
        {'event' in match && (match as FixtureRow).event ? (
          <span className="text-body-sm text-text-dim truncate">{(match as FixtureRow).event}</span>
        ) : null}
      </div>
      <div className="shrink-0">
        <LeagueChip league={match.league} />
      </div>
    </div>
  );
}

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-surface-container-low">
          {['#', 'EQUIPO', 'PJ', 'G', 'P', '%', 'RACHA'].map((h) => (
            <th key={h} className="font-display text-label-table-header uppercase tracking-wider text-text-muted text-left px-2 py-2">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team} className="border-t border-court-border hover:bg-court-surface-elevated">
            <td className={`px-2 py-2 font-display font-bold ${r.rank <= 4 ? 'text-tertiary' : 'text-text-muted'}`}>{r.rank}</td>
            <td className="px-2 py-2">
              <span className="flex items-center gap-2">
                <TeamBadge name={r.team} size={20} />
                <span className="text-body-sm text-text-primary truncate">{r.team}</span>
              </span>
            </td>
            <td className="px-2 py-2 font-mono text-data-mono text-text-muted">{r.w + r.l}</td>
            <td className="px-2 py-2 font-mono text-data-mono text-text-primary">{r.w}</td>
            <td className="px-2 py-2 font-mono text-data-mono text-text-muted">{r.l}</td>
            <td className="px-2 py-2 font-mono text-data-mono text-secondary">{pct(r.w, r.l)}</td>
            <td className="px-2 py-2">
              <span className="flex gap-1">
                {(r.form || '').split('').map((c, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-sm grid place-items-center text-[9px] font-bold ${
                      c === 'W' ? 'bg-tertiary text-on-tertiary-fixed' : 'bg-live-red/25 text-live-red'
                    }`}
                  >
                    {c}
                  </span>
                ))}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NewsCard({ item, large = false }: { item: NewsItem; large?: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener"
      className={`block bg-court-surface rounded-lg overflow-hidden border border-court-border hover:border-primary-container transition-colors ${large ? '' : 'flex flex-col'}`}
    >
      <div className={`relative bg-surface-container-low overflow-hidden ${large ? 'aspect-[16/9]' : 'aspect-[16/9]'}`}>
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
        ) : null}
        <span className="absolute top-2 left-2"><LeagueChip league={item.category} /></span>
      </div>
      <div className={`p-space-md flex flex-col gap-1 ${large ? 'md:p-space-lg' : ''}`}>
        <h3 className={`font-display font-bold text-text-primary m-0 leading-tight ${large ? 'text-headline-lg' : 'text-headline-md'}`}>
          {item.title}
        </h3>
        <p className={`text-body-sm text-on-surface-variant m-0 ${large ? '' : 'line-clamp-3'}`}>{item.summary}</p>
        <span className="text-body-sm text-text-dim mt-1">{item.source} · {item.date}</span>
      </div>
    </a>
  );
}

export function StatLeader({ stat }: { stat: StatRow }) {
  return (
    <div className="flex items-center justify-between gap-space-sm py-2 border-b border-court-border last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="font-display text-label-table-header uppercase tracking-wider text-text-muted truncate">
          {stat.stat}
        </span>
        <span className="text-body-sm text-text-primary truncate">{stat.leader}</span>
        <span className="text-body-sm text-text-dim truncate">{stat.team}</span>
      </div>
      <span className="font-display text-score-display text-secondary tabular-nums">{stat.value}</span>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-court-surface rounded-xl border border-court-border shadow-[0_1px_3px_rgba(0,0,0,0.35)] ${className}`}>
      {children}
    </div>
  );
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 font-display text-label-table-header uppercase tracking-wider text-primary hover:text-primary-container transition-colors">
      {children}
      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
    </Link>
  );
}
