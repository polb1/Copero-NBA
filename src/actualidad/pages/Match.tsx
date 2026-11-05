import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { slugify } from '../leagues';
import { Card, SectionHeader, TeamBadge } from '../components/ui';
import { fechaCorta, leagueHref, matchId, useHubData } from '../data';

/**
 * Ficha de partido: marcador, contexto de ambos equipos (posición, balance,
 * racha) y sus últimos resultados / próximos partidos.
 */
export function Match() {
  const { id = '' } = useParams<{ id: string }>();

  // Las fichas de partido son útiles para el usuario pero no aportan valor único
  // a buscadores mientras no haya análisis propio: noindex, follow.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, follow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const { results, fixtures, standings, loading } = useHubData();

  const todos = [
    ...results.map((r) => ({ ...r, final: true, time: '' as string | undefined })),
    ...fixtures.map((f) => ({ ...f, hs: undefined as number | undefined, as: undefined as number | undefined, final: false })),
  ];
  const partido = todos.find((m) => matchId(m as { home: string; away: string; date: string }) === id);

  if (loading) {
    return <Card className="p-space-lg text-text-muted text-body-sm">Cargando partido…</Card>;
  }
  if (!partido) {
    return (
      <Card className="p-space-lg">
        <h1 className="font-display text-headline-lg font-bold uppercase text-text-primary m-0">Partido no encontrado</h1>
        <p className="text-body-sm text-text-muted">Ese enlace ya no existe o el partido salió de la ventana de datos.</p>
        <Link to="/" className="font-display text-label-table-header uppercase text-primary">Volver a la portada</Link>
      </Card>
    );
  }

  const rows = standings[partido.league] || [];
  const fila = (team: string) => rows.find((r) => r.team === team);
  const forma = (team: string) =>
    results
      .filter((r) => r.home === team || r.away === team)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
      .map((r) => {
        const gano = r.home === team ? r.hs > r.as : r.as > r.hs;
        return { ...r, gano };
      });
  const siguiente = (team: string) =>
    fixtures
      .filter((f) => f.home === team || f.away === team)
      .sort((a, b) => (a.date > b.date ? 1 : -1))[0];

  const equipo = (name: string, rival: string, score?: number) => {
    const r = fila(name);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <TeamBadge name={name} size={44} />
          <div className="min-w-0">
            {/* Plain <a>: team pages are static HTML, not app routes. */}
            <a href={`/equipo/${slugify(name)}`} className="font-display text-headline-lg font-bold uppercase text-text-primary hover:text-primary truncate block no-underline">
              {name}
            </a>
            <span className="text-body-sm text-text-muted">
              {r ? `${r.rank}º · ${r.w}-${r.l} · ${((r.w / Math.max(1, r.w + r.l)) * 100).toFixed(1)}%` : 'Sin clasificación disponible'}
            </span>
          </div>
          {score !== undefined && <span className="ml-auto font-display text-score-display text-secondary tabular-nums">{score}</span>}
        </div>
        <div>
          <span className="font-display text-label-table-header uppercase text-text-muted">Últimos 5</span>
          <div className="flex gap-1 mt-1">
            {forma(name).map((g, i) => (
              <span key={i} className={`w-5 h-5 rounded grid place-items-center text-[10px] font-bold ${g.gano ? 'bg-tertiary/20 text-tertiary' : 'bg-live-red/20 text-live-red'}`}>
                {g.gano ? 'V' : 'D'}
              </span>
            ))}
            {forma(name).length === 0 && <span className="text-body-sm text-text-dim">Sin partidos</span>}
          </div>
        </div>
        {siguiente(name) && (
          <div className="text-body-sm text-text-muted">
            Próximo: <b className="text-text-primary">{siguiente(name)!.home} — {siguiente(name)!.away}</b> · {fechaCorta(siguiente(name)!.date)}
          </div>
        )}
        <div className="text-body-sm text-text-dim">Rival: {rival}</div>
      </div>
    );
  };

  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-space-md">
      <Link to={leagueHref(partido.league)} className="font-display text-label-table-header uppercase text-primary">
        ← {partido.league}
      </Link>

      <Card className="p-space-lg">
        <SectionHeader title="Partido" right={`${fechaCorta(partido.date)}${partido.time ? ' · ' + partido.time : ''}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {equipo(partido.home, partido.away, (partido as { hs?: number }).hs)}
          {equipo(partido.away, partido.home, (partido as { as?: number }).as)}
        </div>
        {partido.final ? (
          <p className="text-body-sm text-text-muted mt-space-md m-0">Resultado final · datos de {partido.league}.</p>
        ) : (
          <p className="text-body-sm text-text-muted mt-space-md m-0">Partido programado.</p>
        )}
      </Card>

      <Card className="p-space-md">
        <h2 className="font-display text-headline-md font-bold uppercase text-text-primary m-0 mb-2">Datos del partido</h2>
        <p className="text-body-sm text-text-muted m-0">
          Ahora mismo se muestran marcador, clasificación y forma reciente de ambos equipos. Las estadísticas
          detalladas por cuarto y las alineaciones llegarán con la fuente de datos completa (Apify/box score).
        </p>
      </Card>
    </div>
  );
}
