import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEAGUE_COUNTRY, leaguePath } from '../leagues';
import { Card, NewsCard, SectionHeader, TeamBadge } from '../components/ui';
import { useHubData } from '../data';

/* ---------------- Noticias ---------------- */
export function Noticias() {
  const { news, loading } = useHubData();
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => news.filter((n) => (n.title + n.summary + n.source).toLowerCase().includes(q.toLowerCase())),
    [news, q],
  );
  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Noticias" right={`${filtered.length} artículos`} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar noticias…"
        className="w-full bg-court-surface border border-court-border rounded-lg px-space-md py-2 text-body-sm text-text-primary outline-none focus:border-primary-container"
      />
      {loading && <Card className="p-space-lg text-text-muted text-body-sm">Cargando…</Card>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filtered.map((n) => <NewsCard key={n.url} item={n} />)}
      </div>
      {!loading && filtered.length === 0 && <Card className="p-space-lg text-text-muted text-body-sm">Sin resultados.</Card>}
    </div>
  );
}

/* ---------------- Clasificaciones (índice de ligas) ---------------- */
export function Clasificaciones() {
  const { standings, leagues, loading } = useHubData();
  const all = useMemo(() => {
    const names = [...new Set([...Object.keys(standings), ...Object.keys(leagues)])];
    return names.sort((a, b) => a.localeCompare(b));
  }, [standings, leagues]);

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Competiciones" right={`${all.length} ligas`} />
      {loading && <Card className="p-space-lg text-text-muted text-body-sm">Cargando…</Card>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-space-sm">
        {all.map((name) => {
          const rows = standings[name];
          const clubs = leagues[name] || [];
          return (
            <Link
              key={name}
              to={leaguePath(name)}
              className="bg-court-surface border border-court-border rounded-lg p-space-sm hover:border-primary-container transition-colors flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-headline-md font-bold uppercase text-text-primary truncate">{name}</span>
                <span className="font-display text-label-table-header text-text-muted">{LEAGUE_COUNTRY[name] || 'INT'}</span>
              </div>
              <span className="text-body-sm text-text-muted">
                {rows ? `${rows.length} equipos · clasificación` : `${clubs.length} equipos`}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 font-display text-label-table-header uppercase text-primary">
                Ver liga
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Resultados ---------------- */
export function Resultados() {
  const { results, loading } = useHubData();
  const [league, setLeague] = useState('TODAS');
  const leagues = ['TODAS', ...new Set(results.map((r) => r.league))];
  const list = league === 'TODAS' ? results : results.filter((r) => r.league === league);
  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Resultados" right={`${list.length} partidos`} />
      <div className="flex flex-wrap gap-2">
        {leagues.map((l) => (
          <button key={l} onClick={() => setLeague(l)}
            className={`px-3 py-1 rounded font-display text-label-table-header uppercase border-0 cursor-pointer ${
              league === l ? 'bg-primary-container text-on-primary-container' : 'bg-court-surface text-on-surface-variant'
            }`}>{l}</button>
        ))}
      </div>
      <Card className="p-space-sm">
        {loading && <div className="p-space-md text-text-muted text-body-sm">Cargando…</div>}
        {list.map((r, i) => {
          const hw = r.hs > r.as, aw = r.as > r.hs;
          return (
            <div key={i} className="flex items-center gap-space-md px-space-sm py-2 border-b border-court-border last:border-0">
              <span className="w-12 text-center font-display text-label-match-status uppercase text-text-dim">{r.date}</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className={`flex justify-between ${hw ? 'text-text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  <span className="flex items-center gap-2"><TeamBadge name={r.home} size={20} />{r.home}</span>
                  <span className="font-display text-score-display-sm tabular-nums">{r.hs}</span>
                </div>
                <div className={`flex justify-between ${aw ? 'text-text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  <span className="flex items-center gap-2"><TeamBadge name={r.away} size={20} />{r.away}</span>
                  <span className="font-display text-score-display-sm tabular-nums">{r.as}</span>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && list.length === 0 && <div className="p-space-md text-text-muted text-body-sm">Sin resultados.</div>}
      </Card>
    </div>
  );
}

/* ---------------- Calendario ---------------- */
export function Calendario() {
  const { fixtures, loading } = useHubData();
  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Calendario" right={`${fixtures.length} próximos partidos`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {fixtures.map((f, i) => (
          <Card key={i} className="p-space-md flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-label-table-header uppercase text-secondary">{f.league}</span>
              <span className="text-body-sm text-text-muted">{f.date} {f.time ? `· ${f.time}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamBadge name={f.home} size={22} />
              <span className="text-body-sm text-text-primary truncate">{f.home}</span>
            </div>
            <div className="flex items-center gap-2">
              <TeamBadge name={f.away} size={22} />
              <span className="text-body-sm text-text-primary truncate">{f.away}</span>
            </div>
            {f.event ? <span className="text-body-sm text-text-dim">{f.event}</span> : null}
          </Card>
        ))}
      </div>
      {!loading && fixtures.length === 0 && <Card className="p-space-lg text-text-muted text-body-sm">Sin partidos programados.</Card>}
    </div>
  );
}

/* ---------------- Estadísticas ---------------- */
export function Estadisticas() {
  const { stats, loading } = useHubData();
  const groups = useMemo(() => {
    const map = new Map<string, typeof stats>();
    for (const s of stats) {
      if (!map.has(s.league)) map.set(s.league, []);
      map.get(s.league)!.push(s);
    }
    return [...map.entries()];
  }, [stats]);

  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Estadísticas" right={`${stats.length} líderes`} />
      {loading && <Card className="p-space-lg text-text-muted text-body-sm">Cargando…</Card>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {groups.map(([league, rows]) => (
          <Card key={league} className="p-space-md">
            <h3 className="font-display text-headline-md font-bold uppercase text-text-primary m-0 mb-2">{league}</h3>
            <div className="flex flex-col">
              {rows.map((s) => (
                <div key={s.stat + s.leader} className="flex items-center justify-between py-2 border-b border-court-border last:border-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-display text-label-table-header uppercase text-text-muted">{s.stat}</span>
                    <span className="text-body-sm text-text-primary truncate">{s.leader}</span>
                    <span className="text-body-sm text-text-dim truncate">{s.team}</span>
                  </div>
                  <span className="font-display text-score-display text-secondary tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
