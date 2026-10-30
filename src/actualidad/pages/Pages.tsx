import { useMemo, useState } from 'react';
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
              league === l ? 'bg-primary-container text-on-primary-container' : 'bg-court-surface text-on-surface-variant hover:text-text-primary'
            }`}>{l}</button>
        ))}
      </div>
      <Card className="p-space-sm">
        {loading && <div className="p-space-md text-text-muted text-body-sm">Cargando…</div>}
        {list.map((r, i) => {
          const hw = r.hs > r.as, aw = r.as > r.hs;
          return (
            <div key={i} className="flex items-center gap-space-md px-space-sm py-2 border-b border-court-border last:border-0">
              <span className="w-14 text-center font-display text-label-match-status uppercase text-text-dim">{r.date}</span>
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
              <span className="hidden sm:block font-display text-label-table-header uppercase text-text-muted w-28 text-right">{r.league}</span>
            </div>
          );
        })}
        {!loading && list.length === 0 && <div className="p-space-md text-text-muted text-body-sm">Sin resultados.</div>}
      </Card>
    </div>
  );
}

/* ---------------- Calendario (rejilla mensual) ---------------- */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const parseFecha = (s: string): { day: number; month: number } | null => {
  const m = /^(\d{1,2})\s+([a-z]{3})/i.exec((s || '').trim());
  if (!m) return null;
  const idx = MESES.indexOf(m[2].toLowerCase());
  if (idx < 0) return null;
  return { day: Number(m[1]), month: idx };
};

export function Calendario() {
  const { fixtures, loading } = useHubData();
  const [sel, setSel] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof fixtures>();
    for (const f of fixtures) {
      const key = (f.date || '').slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [fixtures]);

  const ref = useMemo(() => {
    for (const f of fixtures) {
      const p = parseFecha(f.date);
      if (p) return p;
    }
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() };
  }, [fixtures]);

  const year = new Date().getFullYear() + (ref.month < new Date().getMonth() ? 1 : 0);
  const first = new Date(year, ref.month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, ref.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const dayKey = (d: number) => `${String(d).padStart(2, '0')} ${MESES[ref.month]}`;
  const dayMatches = (d: number) => byDay.get(dayKey(d)) || [];
  const list = sel ? (byDay.get(sel) || []) : fixtures;

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Calendario" right={`${fixtures.length} próximos partidos`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <Card className="p-space-sm lg:col-span-2">
          <div className="flex items-center justify-between px-space-sm py-space-xs">
            <span className="font-display text-headline-md font-bold uppercase text-text-primary">
              {MES_LARGO[ref.month]} {year}
            </span>
            <button
              onClick={() => setSel(null)}
              className="font-display text-label-table-header uppercase text-primary bg-transparent border-0 cursor-pointer"
            >
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {DIAS.map((d) => (
              <div key={d} className="text-center font-display text-label-table-header uppercase text-text-muted py-1">{d}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = dayKey(d);
              const n = dayMatches(d).length;
              const active = sel === key;
              return (
                <button
                  key={key}
                  onClick={() => setSel(active ? null : key)}
                  className={`aspect-square rounded flex flex-col items-center justify-center gap-1 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary-container/20 border-primary-container text-primary'
                      : n
                        ? 'bg-court-surface-elevated border-court-border text-text-primary hover:border-primary-container'
                        : 'bg-transparent border-court-border text-text-dim'
                  }`}
                >
                  <span className="font-display text-body-md font-semibold">{d}</span>
                  {n > 0 && (
                    <span className="flex gap-0.5">
                      {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                        <span key={k} className="w-1 h-1 rounded-full bg-primary-container" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-space-sm">
          <div className="px-space-sm py-space-xs font-display text-label-table-header uppercase text-text-muted">
            {sel ? `Partidos del ${sel}` : 'Próximos partidos'}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && <p className="p-space-sm text-body-sm text-text-muted m-0">Cargando…</p>}
            {list.slice(0, 24).map((f, i) => (
              <div key={i} className="flex items-center gap-space-sm px-space-sm py-2 border-b border-court-border last:border-0">
                <span className="w-12 shrink-0 font-display text-label-match-status uppercase text-secondary">{f.date}</span>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <TeamBadge name={f.home} size={18} />
                    <span className="text-body-sm truncate text-text-primary">{f.home}</span>
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <TeamBadge name={f.away} size={18} />
                    <span className="text-body-sm truncate text-on-surface-variant">{f.away}</span>
                  </span>
                </div>
                <span className="font-display text-label-table-header uppercase text-text-muted shrink-0">{f.time || ''}</span>
              </div>
            ))}
            {!loading && list.length === 0 && <p className="p-space-sm text-body-sm text-text-muted m-0">Sin partidos.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Estadísticas de equipo (calculadas de resultados) ---------------- */
export function Estadisticas() {
  const { stats, results, loading } = useHubData();
  const [league, setLeague] = useState('TODAS');

  const leagues = useMemo(() => ['TODAS', ...new Set(results.map((r) => r.league))], [results]);

  const table = useMemo(() => {
    const acc = new Map<string, { pj: number; pf: number; pc: number }>();
    for (const r of results) {
      if (league !== 'TODAS' && r.league !== league) continue;
      const pares: [string, number, number][] = [[r.home, r.hs, r.as], [r.away, r.as, r.hs]];
      for (const [team, pf, pc] of pares) {
        const cur = acc.get(team) || { pj: 0, pf: 0, pc: 0 };
        acc.set(team, { pj: cur.pj + 1, pf: cur.pf + pf, pc: cur.pc + pc });
      }
    }
    return [...acc.entries()]
      .map(([team, s]) => ({ team, pj: s.pj, ppp: s.pf / s.pj, ppc: s.pc / s.pj, dif: (s.pf - s.pc) / s.pj }))
      .sort((a, b) => b.pj - a.pj || b.dif - a.dif);
  }, [results, league]);

  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-space-md">
      <SectionHeader title="Estadísticas" right={`${table.length} equipos`} />

      <div className="flex flex-wrap gap-2">
        {leagues.map((l) => (
          <button key={l} onClick={() => setLeague(l)}
            className={`px-3 py-1 rounded font-display text-label-table-header uppercase border-0 cursor-pointer ${
              league === l ? 'bg-primary-container text-on-primary-container' : 'bg-court-surface text-on-surface-variant'
            }`}>{l}</button>
        ))}
      </div>

      <Card className="p-space-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              {['EQUIPO', 'PJ', 'PPP', 'PPC', 'DIF'].map((h) => (
                <th key={h} className="font-display text-label-table-header uppercase text-text-muted text-left px-2 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.team} className="border-t border-court-border hover:bg-court-surface-elevated">
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <TeamBadge name={r.team} size={20} />
                    <span className="text-body-sm text-text-primary truncate">{r.team}</span>
                  </span>
                </td>
                <td className="px-2 py-2 font-mono text-data-mono text-text-muted">{r.pj}</td>
                <td className="px-2 py-2 font-mono text-data-mono text-text-primary">{r.ppp.toFixed(1)}</td>
                <td className="px-2 py-2 font-mono text-data-mono text-text-muted">{r.ppc.toFixed(1)}</td>
                <td className={`px-2 py-2 font-mono text-data-mono ${r.dif >= 0 ? 'text-tertiary' : 'text-live-red'}`}>
                  {r.dif >= 0 ? '+' : ''}{r.dif.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && table.length === 0 && <p className="p-space-md text-body-sm text-text-muted m-0">Sin datos de partidos todavía.</p>}
      </Card>

      {stats.length > 0 && (
        <Card className="p-space-md">
          <h3 className="font-display text-headline-md font-bold uppercase text-text-primary m-0 mb-2">Líderes individuales</h3>
          {stats.map((s) => (
            <div key={s.stat + s.leader} className="flex items-center justify-between py-2 border-b border-court-border last:border-0">
              <div className="flex flex-col min-w-0">
                <span className="font-display text-label-table-header uppercase text-text-muted">{s.stat}</span>
                <span className="text-body-sm text-text-primary truncate">{s.leader}</span>
                <span className="text-body-sm text-text-dim truncate">{s.team}</span>
              </div>
              <span className="font-display text-score-display text-secondary tabular-nums">{s.value}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
