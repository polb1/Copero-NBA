import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, MatchRow, SectionHeader, StandingsTable, TeamBadge } from '../components/ui';
import { leaguePath, LEAGUE_COUNTRY } from '../leagues';
import { leagueMeta, pct, useHubData } from '../data';

type Tab = 'resumen' | 'clasificacion' | 'resultados' | 'proximos' | 'estadisticas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'clasificacion', label: 'Clasificación' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'estadisticas', label: 'Estadísticas' },
];

/** Normaliza nombres para emparejar resultados/fixtures con la liga. */
const sameLeague = (a: string, b: string) => {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ka = norm(a), kb = norm(b);
  if (ka === kb) return true;
  const aliases: Record<string, string[]> = {
    eu: ['euroleague', 'eu'],
    euroleague: ['euroleague', 'eu'],
    'b.league': ['b.league', 'b1'],
    nba: ['nba'],
    'liga acb': ['liga acb', 'acb'],
  };
  const listA = aliases[ka] || [ka];
  const listB = aliases[kb] || [kb];
  return listA.some((x) => listB.includes(x));
};

export function LeaguePage() {
  const { league } = useParams<{ league: string }>();
  const { standings, results, fixtures, stats, leagues: leagueMap, loading } = useHubData();
  const [tab, setTab] = useState<Tab>('resumen');

  // Nombre real de la liga a partir del slug.
  const name = useMemo(() => {
    const all = [...new Set([...Object.keys(standings), ...Object.keys(leagueMap)])];
    return all.find((n) => leaguePath(n) === `/liga/${league}`) || null;
  }, [league, standings, leagueMap]);

  const rows = (name ? standings[name] || standings[name === 'EuroLeague' ? 'EU' : name] : []) || [];
  const clubs = (name ? leagueMap[name] || [] : []) || [];
  const leagueResults = name ? (results || []).filter((r) => sameLeague(r.league, name)) : [];
  const leagueFixtures = name ? (fixtures || []).filter((f) => sameLeague(f.league, name)) : [];
  const leagueStats = name ? (stats || []).filter((s) => sameLeague(s.league, name)) : [];
  const meta = leagueMeta(name || '');

  if (!name && !loading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <Card className="p-space-lg">
          <h1 className="font-display text-headline-lg font-bold uppercase text-text-primary m-0">Liga no encontrada</h1>
          <p className="text-body-sm text-text-muted mt-2">La liga «{league}» no existe en la base de datos.</p>
          <div className="mt-space-md flex flex-wrap gap-2">
            {[...new Set([...Object.keys(standings), ...Object.keys(leagueMap)])].slice(0, 24).map((n) => (
              <Link key={n} to={leaguePath(n)} className="px-2 py-1 rounded bg-court-surface text-body-sm text-on-surface-variant hover:text-text-primary">
                {n}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1300px] mx-auto flex flex-col gap-space-md">
      {/* Cabecera de la liga */}
      <Card className="p-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-md">
            <span className={`px-2 py-1 rounded font-display text-label-table-header uppercase tracking-widest ${meta.chip}`}>
              {LEAGUE_COUNTRY[name || ''] || 'INT'}
            </span>
            <div>
              <h1 className="font-display text-headline-xl font-extrabold uppercase text-text-primary m-0 leading-none">{name}</h1>
              <p className="text-body-sm text-text-muted m-0 mt-1">
                {rows.length ? `${rows.length} equipos · clasificación en vivo` : `${clubs.length} equipos · plantilla de la temporada`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <Link to="/clasificaciones" className="font-display text-label-table-header uppercase text-primary">Todas las ligas</Link>
          </div>
        </div>
      </Card>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded font-display text-label-table-header uppercase tracking-wider border-0 cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-court-surface text-on-surface-variant hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Card className="p-space-lg text-text-muted text-body-sm">Cargando…</Card>}

      {/* RESUMEN (promiedos style: tabla + últimos + próximos) */}
      {tab === 'resumen' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <Card className="p-space-sm">
              <SectionHeader title="Clasificación" right={rows.length ? 'En vivo' : 'Plantilla'} />
              {rows.length ? (
                <StandingsTable rows={rows.slice(0, 10)} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                  {clubs.map((c) => {
                    const nm = typeof c === 'string' ? c : (c as { name: string }).name;
                    return (
                      <div key={nm} className="flex items-center gap-2 bg-court-surface-elevated rounded px-2 py-1.5">
                        <TeamBadge name={nm} size={20} />
                        <span className="text-body-sm text-text-primary truncate">{nm}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-space-md">
            <Card className="p-space-sm">
              <SectionHeader title="Últimos resultados" />
              {leagueResults.length ? (
                leagueResults.slice(0, 6).map((r, i) => <MatchRow key={i} match={r} status="final" />)
              ) : (
                <p className="text-body-sm text-text-muted p-space-sm m-0">Sin resultados registrados para esta liga.</p>
              )}
            </Card>
            <Card className="p-space-sm">
              <SectionHeader title="Próximos partidos" />
              {leagueFixtures.length ? (
                leagueFixtures.slice(0, 6).map((f, i) => <MatchRow key={i} match={f} status="scheduled" />)
              ) : (
                <p className="text-body-sm text-text-muted p-space-sm m-0">Sin partidos programados.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* CLASIFICACIÓN */}
      {tab === 'clasificacion' && !loading && (
        <Card className="p-space-sm">
          {rows.length ? (
            <StandingsTable rows={rows} />
          ) : (
            <>
              <p className="text-body-sm text-text-muted px-space-sm py-space-xs m-0">
                {clubs.length} equipos de la temporada · sin clasificación en vivo disponible
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
                {clubs.map((c) => {
                  const nm = typeof c === 'string' ? c : (c as { name: string }).name;
                  return (
                    <div key={nm} className="flex items-center gap-2 bg-court-surface-elevated rounded px-2 py-1.5">
                      <TeamBadge name={nm} size={20} />
                      <span className="text-body-sm text-text-primary truncate">{nm}</span>
                      <span className="ml-auto text-body-sm text-text-dim">{pct(0, 0)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* RESULTADOS */}
      {tab === 'resultados' && !loading && (
        <Card className="p-space-sm">
          {leagueResults.length ? (
            leagueResults.map((r, i) => <MatchRow key={i} match={r} status="final" />)
          ) : (
            <p className="text-body-sm text-text-muted p-space-sm m-0">Sin resultados registrados para esta liga.</p>
          )}
        </Card>
      )}

      {/* PRÓXIMOS */}
      {tab === 'proximos' && !loading && (
        <Card className="p-space-sm">
          {leagueFixtures.length ? (
            leagueFixtures.map((f, i) => <MatchRow key={i} match={f} status="scheduled" />)
          ) : (
            <p className="text-body-sm text-text-muted p-space-sm m-0">Sin partidos programados.</p>
          )}
        </Card>
      )}

      {/* ESTADÍSTICAS */}
      {tab === 'estadisticas' && !loading && (
        <Card className="p-space-md">
          {leagueStats.length ? (
            <div className="flex flex-col">
              {leagueStats.map((s) => (
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
          ) : (
            <p className="text-body-sm text-text-muted m-0">Sin estadísticas individuales disponibles para esta liga.</p>
          )}
        </Card>
      )}
    </div>
  );
}
