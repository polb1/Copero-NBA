import { useState } from 'react';
import { useCareer } from '../store/store';
import { teamOf, userOf } from '../engine/career';
import { teamName } from '../engine/league';
import { fmtDate, seasonLabel } from '../engine/schedule';
import { Card, Empty, PageHead } from '../ui/common';
import { AdvanceBar } from '../ui/Layout';

export function Schedule() {
  const c = useCareer()!;
  const u = userOf(c);
  const t = teamOf(c);
  const [filter, setFilter] = useState<'all' | 'played' | 'next'>('all');
  const L = c.league;
  const logByDay = new Map(c.gameLog.filter((g) => g.comp === 'NBA').map((g) => [g.day, g]));
  const games = t ? L.schedule.filter((g) => g.home === t.id || g.away === t.id) : [];
  const shown = games.filter((g) => (filter === 'played' ? g.played : filter === 'next' ? !g.played : true));
  const satGames = c.gameLog.filter((g) => g.comp !== 'NBA');
  return (
    <>
      <PageHead eyebrow={`Calendario ${seasonLabel(L.season)}`} title="Calendario de partidos" desc={t ? `${teamName(L, t.id)}: 82 partidos de temporada regular. Día ${L.day} de ${L.lastDay}. All-Star: ${fmtDate(L.season, L.allStarDay)}. Fecha límite de traspasos: ${fmtDate(L.season, L.deadlineDay)}.` : 'Sin equipo NBA esta temporada.'}>
        <AdvanceBar />
      </PageHead>
      {satGames.length > 0 && (
        <Card title={`Partidos ${satGames[0].comp === 'GLG' ? 'en la G League' : satGames[0].comp === 'NCAA' ? 'universitarios' : 'en Europa'}`} icon="ball" style={{ marginBottom: 16 }}>
          <GameTable rows={satGames.slice().reverse().map((g) => ({ key: `${g.day}-${g.comp}`, date: fmtDate(g.season, g.day), opp: `${g.home ? 'vs' : '@'} ${g.oppName}`, res: `${g.teamScore}-${g.oppScore}`, win: g.teamScore > g.oppScore, line: g.line ? `${g.line.pts} PTS · ${g.line.oreb + g.line.dreb} REB · ${g.line.ast} AST · ${Math.round(g.line.min)} MIN` : 'No jugó' }))} />
        </Card>
      )}
      {t ? (
        <Card title={`${teamName(L, t.id)} · ${t.w}-${t.l}`} icon="calendar" action={<div className="seg">{(['all', 'played', 'next'] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'Todos' : f === 'played' ? 'Jugados' : 'Pendientes'}</button>)}</div>}>
          <GameTable rows={shown.map((g) => {
            const home = g.home === t.id;
            const opp = home ? g.away : g.home;
            const my = home ? g.hs : g.as;
            const their = home ? g.as : g.hs;
            const log = logByDay.get(g.day);
            return {
              key: String(g.id),
              date: fmtDate(L.season, g.day),
              opp: `${home ? 'vs' : '@'} ${teamName(L, opp)}`,
              oppRec: `${L.teams[opp].w}-${L.teams[opp].l}`,
              res: g.played ? `${my}-${their}${g.ot ? ` (${g.ot}OT)` : ''}` : '—',
              win: g.played ? (my ?? 0) > (their ?? 0) : undefined,
              line: !g.played ? (g.day === L.day + 1 ? 'Siguiente' : '') : log?.line ? `${log.line.pts} PTS · ${log.line.oreb + log.line.dreb} REB · ${log.line.ast} AST · ${Math.round(log.line.min)} MIN` : log?.dnp ?? (c.assignment === 'GLG' ? 'En la G League' : '—'),
              me: g.day === L.day + 1,
            };
          })} />
        </Card>
      ) : !satGames.length && <Card><Empty icon="📅" title="Sin calendario NBA">{u.injury ? 'Recuperándote de una lesión.' : 'Aún no formas parte de una plantilla NBA.'}</Empty></Card>}
    </>
  );
}

function GameTable({ rows }: { rows: { key: string; date: string; opp: string; oppRec?: string; res: string; win?: boolean; line: string; me?: boolean }[] }) {
  return (
    <div className="table-wrap" style={{ maxHeight: 640, overflowY: 'auto' }}>
      <table className="t">
        <thead><tr><th className="l">Fecha</th><th className="l">Rival</th><th className="hide-sm">Récord</th><th>Resultado</th><th className="l">Tu partido</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.me ? 'me' : ''}>
              <td className="l dim">{r.date}</td>
              <td className="l">{r.opp}</td>
              <td className="hide-sm dim">{r.oppRec ?? ''}</td>
              <td>{r.win !== undefined && <span className={`wl ${r.win ? 'w' : 'l'}`} style={{ marginRight: 6 }}>{r.win ? 'V' : 'D'}</span>}{r.res}</td>
              <td className="l small">{r.line}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
