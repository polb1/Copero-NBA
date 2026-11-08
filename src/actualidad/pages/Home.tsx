import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, MoreLink, NewsCard, SectionHeader, StatLeader, StandingsTable, TeamBadge } from '../components/ui';
import { fechaCorta, leagueHref, matchHref, useHubData, MAIN_LEAGUES } from '../data';

const esPrincipal = (liga: string) => MAIN_LEAGUES.includes(liga);

/** ¿Ganó este lado? Solo partidos con marcador; los próximos no resaltan a nadie. */
const win = (m: { hs?: number; as?: number }, side: 'home' | 'away') =>
  m.hs !== undefined && m.as !== undefined && (side === 'home' ? m.hs > m.as : m.as > m.hs);

export function Home() {
  const { news, standings, results, fixtures, stats, updatedAt, loading } = useHubData();
  const [filter, setFilter] = useState<'all' | 'final' | 'scheduled'>('all');

  const nba = standings.NBA || [];
  const eu = standings.EuroLeague || standings.EU || [];

  // Resultados ordenados por fecha real (ISO), más recientes primero.
  const resultados = useMemo(
    () => [...results].filter((r) => r.date && Number.isFinite(r.hs)).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)),
    [results],
  );
  const principales = useMemo(() => resultados.filter((r) => esPrincipal(r.league)), [resultados]);

  // Destacado: el partido más reciente de una liga principal.
  const destacado = principales[0] ?? resultados[0];

  // Últimos 30 resultados + próximos 20; los "en vivo" no se ofrecen todavía.
  const ultimos30 = useMemo(() => resultados.slice(0, 30), [resultados]);
  const proximos = useMemo(
    () => [...fixtures].filter((f) => f.date).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)).slice(0, 20),
    [fixtures],
  );

  type M = { date: string; home: string; away: string; league: string; hs?: number; as?: number; time?: string; status: 'final' | 'scheduled' };

  const matches = useMemo<M[]>(() => {
    if (filter === 'scheduled') return proximos.map((f) => ({ ...f, status: 'scheduled' as const }));
    return ultimos30.map((r) => ({ ...r, status: 'final' as const }));
  }, [filter, proximos, ultimos30]);

  const grouped = useMemo(() => {
    const map = new Map<string, M[]>();
    for (const m of matches) {
      if (!map.has(m.league)) map.set(m.league, []);
      map.get(m.league)!.push(m);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [matches]);

  const featured = news[0];
  const rest = news.slice(1, 4);

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-space-md">
      {/* Destacado: el resultado más reciente de las ligas principales */}
      {destacado && (
        <Link
          to={matchHref(destacado)}
          className="block bg-gradient-to-r from-court-surface-elevated to-surface-container-high rounded-xl border border-court-border p-space-lg hover:border-primary-container transition-all"
        >
          <div className="flex items-center justify-between gap-space-md">
            <div className="min-w-0">
              <span className="font-display text-label-table-header uppercase text-secondary tracking-widest">
                Destacado · {destacado.league}
              </span>
              <h2 className="font-display text-headline-xl-mobile md:text-headline-xl font-extrabold uppercase text-text-primary m-0 leading-tight md:truncate">
                {destacado.home} <span className={win(destacado, 'home') ? 'text-secondary' : 'text-text-muted'}>{destacado.hs}</span> —{' '}
                <span className={win(destacado, 'away') ? 'text-secondary' : 'text-text-muted'}>{destacado.as}</span> {destacado.away}
              </h2>
              <p className="text-body-sm text-text-muted m-0 mt-1">{(destacado as { date: string }).date === new Date().toISOString().slice(0, 10) ? 'Hoy' : fechaCorta(destacado.date)} · Resultado final</p>
            </div>
            <div className="hidden md:block font-display text-score-display text-secondary tabular-nums">
              {destacado.hs}-{destacado.as}
            </div>
          </div>
        </Link>
      )}

      {/* Ticker */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-court-surface px-space-md py-1.5 rounded-lg shadow-sm">
        {/* en móvil ya se ve el destacado justo encima: solo la hora de los datos */}
        <div className="hidden sm:flex items-center gap-space-sm min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-court-surface-elevated text-text-primary font-display text-label-match-status uppercase tracking-wider">
            Último resultado
          </span>
          <p className="text-body-sm text-on-surface-variant truncate m-0">
            {destacado ? (
              <>
                <span className="text-text-primary font-medium">
                  {destacado.home} {destacado.hs} - {destacado.as} {destacado.away}
                </span>{' '}
                · {destacado.league} · {fechaCorta(destacado.date)}
              </>
            ) : 'Cargando resultados…'}
          </p>
        </div>
        {updatedAt && (
          <span className="font-mono text-data-mono text-secondary flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[16px]">sync</span> Datos de{' '}
            {new Date(updatedAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Últimos resultados */}
      <div>
        <SectionHeader title="Últimos resultados" right={`${principales.length} partidos · se muestran los 30 más recientes`} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {principales.slice(0, 3).map((r, i) => (
            <Link key={i} to={matchHref(r)} className="block">
              <Card className="p-space-md flex flex-col gap-2 hover:border-primary-container transition-colors h-full">
                <div className="flex items-center gap-space-xs text-body-sm text-text-muted">
                  <span className="font-display text-label-match-status uppercase">{r.league}</span>
                  <span>· {fechaCorta(r.date)}</span>
                </div>
                {[[r.home, r.hs, r.hs > r.as], [r.away, r.as, r.as > r.hs]].map(([team, pts, won]) => (
                  <div key={String(team)} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <TeamBadge name={String(team)} size={22} />
                      <span className={`font-display text-headline-md truncate ${won ? 'font-bold text-text-primary' : 'font-medium text-text-muted'}`}>{team}</span>
                    </div>
                    <span className={`font-display text-score-display tabular-nums ${won ? 'text-secondary' : 'text-text-muted'}`}>{pts}</span>
                  </div>
                ))}
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        <section className="xl:col-span-8 flex flex-col gap-space-md">
          <Card className="p-space-sm">
            <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-xs rounded">
              <span className="material-symbols-outlined text-secondary text-[20px]">calendar_today</span>
              <span className="font-display text-headline-md font-bold uppercase tracking-wider text-text-primary">Partidos</span>
              <span className="font-display text-label-table-header text-text-muted">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-space-xs px-space-xs py-space-sm flex-wrap">
              {[
                ['all', `ÚLTIMOS 30 (${ultimos30.length})`],
                ['scheduled', `PRÓXIMOS (${proximos.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`px-space-md py-2 rounded font-display text-label-table-header uppercase tracking-wider border-0 cursor-pointer transition-all ${
                    filter === key
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-court-surface-elevated text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col">
              {loading && <div className="p-space-lg text-center text-text-muted text-body-sm">Cargando partidos…</div>}
              {!loading && grouped.length === 0 && (
                <div className="p-space-lg text-center text-text-muted text-body-sm">No hay partidos con este filtro.</div>
              )}
              {grouped.map(([league, list]) => (
                <div key={league} className="flex flex-col">
                  <div className="flex items-center justify-between bg-surface-container-low px-space-md py-1.5 mt-1 rounded">
                    <Link to={leagueHref(league)} className="font-display text-label-table-header uppercase tracking-widest text-secondary hover:text-primary">
                      {league}
                    </Link>
                    <span className="font-display text-label-table-header text-text-muted">{list.length} partidos</span>
                  </div>
                  {list.map((m, i) => (
                    <Link
                      key={`${league}-${i}`}
                      to={matchHref(m)}
                      className="block hover:bg-court-surface-elevated transition-colors rounded-md px-2 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <TeamBadge name={m.home} size={20} />
                              <span className={`font-display text-body-sm truncate ${win(m, 'home') ? 'font-bold text-text-primary' : 'text-on-surface-variant'}`}>{m.home}</span>
                            </span>
                            {(m as { hs?: number }).hs !== undefined ? (
                              <b className={`font-display text-score-display-sm tabular-nums ${win(m, 'home') ? 'text-secondary' : 'text-text-muted'}`}>{(m as { hs?: number }).hs}</b>
                            ) : (
                              <span className="font-display text-label-match-status text-secondary">{m.status === 'scheduled' ? (m as { time?: string }).time || '—' : 'FINAL'}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <TeamBadge name={m.away} size={20} />
                              <span className={`font-display text-body-sm truncate ${win(m, 'away') ? 'font-bold text-text-primary' : 'text-on-surface-variant'}`}>{m.away}</span>
                            </span>
                            {(m as { as?: number }).as !== undefined ? (
                              <b className={`font-display text-score-display-sm tabular-nums ${win(m, 'away') ? 'text-secondary' : 'text-text-muted'}`}>{(m as { as?: number }).as}</b>
                            ) : null}
                          </div>
                        </div>
                        <span className="font-display text-label-table-header uppercase text-text-dim shrink-0">{fechaCorta(m.date)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <div>
            <SectionHeader title="Últimas noticias y reportajes" right={<MoreLink to="/noticias">Ver todas</MoreLink>} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {featured && <NewsCard item={featured} large />}
              <div className="flex flex-col gap-space-md">
                {rest.map((n) => <NewsCard key={n.url} item={n} />)}
              </div>
            </div>
          </div>
        </section>

        <aside className="xl:col-span-4 flex flex-col gap-space-md">
          <Card className="p-space-md bg-gradient-to-br from-primary-container/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-label-table-header uppercase tracking-widest text-secondary">Modo Simulador Pro</span>
            </div>
            <h3 className="font-display text-headline-lg font-bold uppercase text-text-primary m-0 leading-tight">
              Simulador de carrera con rosters reales
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Elige tu club, juega la temporada, entra en el draft y compite por el anillo con plantillas reales.
            </p>
            <Link
              to="/play"
              className="mt-space-md inline-flex items-center justify-center gap-2 w-full px-space-md py-2 rounded bg-primary-container text-on-primary font-display text-headline-md font-bold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span> Jugar al simulador ahora
            </Link>
          </Card>

          <Card className="p-space-md">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-display text-label-table-header uppercase tracking-widest text-text-muted">Clasificación NBA</span>
              <Link to="/liga/nba" className="font-display text-label-table-header uppercase text-primary">Ver toda</Link>
            </div>
            <StandingsTable rows={nba.slice(0, 6)} />
          </Card>

          <Card className="p-space-md">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-display text-label-table-header uppercase tracking-widest text-text-muted">Líderes estadísticos</span>
              <Link to="/estadisticas" className="font-display text-label-table-header uppercase text-primary">Ver todos</Link>
            </div>
            {stats.slice(0, 3).map((s) => <StatLeader key={s.stat + s.leader} stat={s} />)}
          </Card>

          <Card className="p-space-md">
            <span className="font-display text-label-table-header uppercase tracking-widest text-text-muted">Ligas</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {MAIN_LEAGUES.map((l) => (
                <Link key={l} to={leagueHref(l)} className="px-2 py-1 rounded bg-court-surface-elevated text-body-sm text-on-surface-variant hover:text-text-primary transition-colors">
                  {l}
                </Link>
              ))}
            </div>
            <div className="mt-space-sm flex items-center gap-2 text-body-sm text-text-muted">
              <TeamBadge name={eu[0]?.team || 'Real Madrid'} size={20} />
              <span>{eu[0]?.team || 'EuroLeague'} lidera la Euroliga</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
