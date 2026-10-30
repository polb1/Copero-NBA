import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, MatchRow, MoreLink, NewsCard, SectionHeader, StatLeader, StandingsTable, TeamBadge } from '../components/ui';
import { useHubData } from '../data';

export function Home() {
  const { news, standings, results, fixtures, stats, leagues, loading } = useHubData();
  const [filter, setFilter] = useState<'all' | 'live' | 'final' | 'scheduled'>('all');

  const nba = standings.NBA || [];
  const eu = standings.EU || standings.EuroLeague || [];

  // Partidos de hoy: resultados recientes + próximos, agrupados por liga.
  const matches = useMemo(() => {
    const list = [
      ...results.slice(0, 6).map((r) => ({ ...r, status: 'final' as const })),
      ...fixtures.slice(0, 6).map((f) => ({ ...f, status: 'scheduled' as const })),
    ];
    if (filter === 'final') return list.filter((m) => m.status === 'final');
    if (filter === 'scheduled') return list.filter((m) => m.status === 'scheduled');
    if (filter === 'live') return [];
    return list;
  }, [results, fixtures, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof matches>();
    for (const m of matches) {
      const key = m.league;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()];
  }, [matches]);

  const featured = news[0];
  const rest = news.slice(1, 4);

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-space-md">
      {/* Ticker */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-court-surface px-space-md py-1.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-live-red text-on-surface font-display text-label-match-status uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary animate-pulse" /> LIVE NBA
          </span>
          <p className="text-body-sm text-on-surface-variant truncate m-0">
            {results[0] ? (
              <>
                <span className="text-text-primary font-medium">{results[0].home} {results[0].hs} - {results[0].as} {results[0].away}</span>
                {' '}· Último resultado · <span className="text-text-primary font-medium">{results[1] ? `${results[1].home} ${results[1].hs} - ${results[1].as} ${results[1].away}` : 'sin más partidos'}</span>
              </>
            ) : 'Cargando resultados…'}
          </p>
        </div>
        <span className="font-mono text-data-mono text-secondary flex items-center gap-1 shrink-0">
          <span className="material-symbols-outlined text-[16px]">sync</span> Actualización automática 15s
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Columna principal */}
        <section className="xl:col-span-8 flex flex-col gap-space-md">
          <Card className="p-space-sm">
            <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-xs rounded">
              <span className="material-symbols-outlined text-secondary text-[20px]">calendar_today</span>
              <span className="font-display text-headline-md font-bold uppercase tracking-wider text-text-primary">
                Partidos de hoy
              </span>
              <span className="font-display text-label-table-header text-text-muted">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-space-xs px-space-xs py-space-sm flex-wrap">
              {[
                ['all', `TODOS (${results.length + fixtures.length})`],
                ['live', 'EN VIVO (0)'],
                ['final', `FINALIZADOS (${results.length})`],
                ['scheduled', `PROGRAMADOS (${fixtures.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`px-space-md py-1 rounded font-display text-label-table-header uppercase tracking-wider border-0 cursor-pointer transition-all ${
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
                    <span className="font-display text-label-table-header uppercase tracking-widest text-secondary">{league}</span>
                    <span className="font-display text-label-table-header text-text-muted">{list.length} partidos</span>
                  </div>
                  {list.map((m, i) => (
                    <MatchRow key={`${league}-${i}`} match={m as never} status={m.status} />
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Noticias */}
          <div>
            <SectionHeader
              title="Últimas noticias y reportajes"
              right={<MoreLink to="/noticias">Ver todas</MoreLink>}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {featured && <NewsCard item={featured} large />}
              <div className="flex flex-col gap-space-md">
                {rest.map((n) => <NewsCard key={n.url} item={n} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Columna lateral */}
        <aside className="xl:col-span-4 flex flex-col gap-space-md">
          <Card className="p-space-md bg-gradient-to-br from-primary-container/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-label-table-header uppercase tracking-widest text-secondary">Modo Simulador Pro</span>
              <span className="font-display text-label-match-status uppercase text-live-red flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />EN VIVO
              </span>
            </div>
            <h3 className="font-display text-headline-lg font-bold uppercase text-text-primary m-0 leading-tight">
              Simulador de carrera con rosters reales
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Elige tu club, juega la temporada, entra en el draft y compite por el anillo con plantillas reales.
            </p>
            <Link
              to="/"
              className="mt-space-md inline-flex items-center justify-center gap-2 w-full px-space-md py-2 rounded bg-primary-container text-on-primary font-display text-headline-md font-bold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span> Jugar al simulador ahora
            </Link>
          </Card>

          <Card className="p-space-md">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-display text-label-table-header uppercase tracking-widest text-text-muted">Clasificación NBA</span>
              <Link to="/clasificaciones" className="font-display text-label-table-header uppercase text-primary">
                Ver toda
              </Link>
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
            <span className="font-display text-label-table-header uppercase tracking-widest text-text-muted">Otras competiciones</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {['EUROLEAGUE', 'LIGA ACB', 'B.LEAGUE', 'LIGA ABA', 'BBL', 'LEGA A'].map((l) => (
                <Link key={l} to="/clasificaciones" className="px-2 py-1 rounded bg-court-surface-elevated text-body-sm text-on-surface-variant hover:text-text-primary transition-colors">
                  {l}
                </Link>
              ))}
            </div>
            <div className="mt-space-sm flex items-center gap-2 text-body-sm text-text-muted">
              <TeamBadge name={eu[0]?.team || 'Real Madrid'} size={20} />
              <span>{eu[0]?.team || 'EuroLeague'} lidera</span>
            </div>
            <div className="text-body-sm text-text-dim">{(leagues && Object.keys(leagues).length) || 0} ligas disponibles</div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
