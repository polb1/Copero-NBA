import { useState } from 'react';
import { useCareer } from '../store/store';
import { teamOf } from '../engine/career';
import { standings, gamesBehind } from '../engine/season';
import { teamName } from '../engine/league';
import { seasonLabel } from '../engine/schedule';
import { Card, PageHead } from '../ui/common';
import type { League, Series, Team } from '../engine/types';

export function Standings() {
  const c = useCareer()!;
  const L = c.league;
  const my = teamOf(c);
  const [view, setView] = useState<'conf' | 'div' | 'playoffs' | 'history'>(L.postseason ? 'playoffs' : 'conf');
  return (
    <>
      <PageHead eyebrow={`Temporada ${seasonLabel(L.season)}`} title="Clasificación y playoffs">
        <div className="seg">
          {([['conf', 'Conferencias'], ['div', 'Divisiones'], ['playoffs', 'Playoffs'], ['history', 'Campeones']] as const).map(([k, l]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
        </div>
      </PageHead>
      {view === 'conf' && (
        <div className="grid g2">
          {(['E', 'W'] as const).map((conf) => (
            <Card key={conf} title={conf === 'E' ? 'Conferencia Este' : 'Conferencia Oeste'} icon="table">
              <StandTable L={L} teams={standings(L, conf)} myId={my?.id} seeds />
            </Card>
          ))}
        </div>
      )}
      {view === 'div' && (
        <div className="grid g3">
          {[...new Set(Object.values(L.teams).map((t) => t.div))].map((d) => (
            <Card key={d} title={d} icon="table"><StandTable L={L} teams={standings(L).filter((t) => t.div === d)} myId={my?.id} /></Card>
          ))}
        </div>
      )}
      {view === 'playoffs' && <Playoffs L={L} myId={my?.id} />}
      {view === 'history' && (
        <Card title="Palmarés de la liga" icon="trophy">
          {L.champions.length === 0 ? <p className="muted small">Aún no se ha decidido ningún campeón en esta partida.</p> : (
            <table className="t">
              <thead><tr><th className="l">Temporada</th><th className="l">Campeón</th><th className="l">Finalista</th><th className="l">MVP</th><th className="l">MVP Finales</th></tr></thead>
              <tbody>{[...L.champions].reverse().map((ch) => {
                const aw = L.awards.find((a) => a.season === ch.season);
                return <tr key={ch.season} className={ch.team === my?.id ? 'me' : ''}><td className="l">{seasonLabel(ch.season)}</td><td className="l"><b>{teamName(L, ch.team)}</b></td><td className="l">{teamName(L, ch.runnerUp)}</td><td className="l small">{aw?.mvp ? aw.names[aw.mvp] : '—'}</td><td className="l small">{aw?.fmvp ? aw.names[aw.fmvp] : '—'}</td></tr>;
              })}</tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}

function StandTable({ L, teams, myId, seeds }: { L: League; teams: Team[]; myId?: string; seeds?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th className="l">Equipo</th><th>V</th><th>D</th><th>%</th><th>DIF</th><th className="hide-sm">Casa</th><th className="hide-sm">Fuera</th><th>Racha</th><th className="hide-sm">Últ. 10</th><th>Dif. pts</th></tr></thead>
        <tbody>
          {teams.map((t, i) => {
            const gp = t.w + t.l;
            const l10w = t.last10.filter((x) => x === 'W').length;
            return (
              <tr key={t.id} className={`${t.id === myId ? 'me' : ''} ${seeds && (i === 5 || i === 9) ? 'sep' : ''}`}>
                <td className="l"><span className="row" style={{ gap: 8 }}><span className="dim num" style={{ width: 18 }}>{i + 1}</span><span className="team-dot" style={{ background: t.color }} />{teamName(L, t.id)}</span></td>
                <td>{t.w}</td><td>{t.l}</td><td>{gp ? (t.w / gp).toFixed(3).replace(/^0/, '') : '—'}</td>
                <td className="dim">{i === 0 ? '—' : gamesBehind(teams[0], t).toFixed(1)}</td>
                <td className="hide-sm">{t.homeW}-{t.homeL}</td><td className="hide-sm">{t.awayW}-{t.awayL}</td>
                <td className={t.streak > 0 ? 'good' : t.streak < 0 ? 'bad' : ''}>{t.streak > 0 ? `V${t.streak}` : t.streak < 0 ? `D${-t.streak}` : '—'}</td>
                <td className="hide-sm">{l10w}-{t.last10.length - l10w}</td>
                <td className={t.pf - t.pa >= 0 ? 'good' : 'bad'}>{gp ? ((t.pf - t.pa) / gp).toFixed(1) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {seeds && <p className="tiny dim" style={{ marginTop: 6 }}>1-6: playoffs directos · 7-10: Play-In · Desempate simplificado por diferencia de puntos.</p>}
    </div>
  );
}

function SeriesBox({ L, s, myId }: { L: League; s?: Series; myId?: string }) {
  if (!s) return <div className="series" style={{ opacity: 0.35 }}><div><span>Por decidir</span></div><div><span>Por decidir</span></div></div>;
  const row = (id: string, seed: number, w: number) => (
    <div className={s.winner ? (s.winner === id ? 'win' : 'lose') : ''}>
      <span>{seed ? <span className="dim">{seed} </span> : null}{L.teams[id].city}</span><b>{w}</b>
    </div>
  );
  return <div className={`series ${s.high === myId || s.low === myId ? 'me' : ''}`}>{row(s.high, s.highSeed, s.winsHigh)}{row(s.low, s.lowSeed, s.winsLow)}</div>;
}

function Playoffs({ L, myId }: { L: League; myId?: string }) {
  const ps = L.postseason;
  if (!ps) return <Card><p className="muted">La postemporada empieza al terminar los 82 partidos de temporada regular.</p></Card>;
  const get = (id: string) => ps.series.find((s) => s.id === id);
  return (
    <div className="stack" style={{ gap: 16 }}>
      {ps.playIn.length > 0 && (
        <Card title="Play-In" icon="ball">
          <div className="grid g3">
            {ps.playIn.map((g) => (
              <div key={g.id} className={`series ${g.home === myId || g.away === myId ? 'me' : ''}`}>
                <div className="dim tiny" style={{ justifyContent: 'center' }}>{g.conf === 'E' ? 'Este' : 'Oeste'} · {g.label}</div>
                <div className={g.winner ? (g.winner === g.home ? 'win' : 'lose') : ''}><span>{L.teams[g.home].city}</span>{g.winner === g.home && <b>✓</b>}</div>
                <div className={g.winner ? (g.winner === g.away ? 'win' : 'lose') : ''}><span>{L.teams[g.away].city}</span>{g.winner === g.away && <b>✓</b>}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card title={ps.champion ? `Campeón: ${teamName(L, ps.champion)}` : 'Cuadro de playoffs'} icon="trophy">
        <div className="bracket">
          <div className="stack">{[0, 1, 2, 3].map((i) => <SeriesBox key={i} L={L} s={get(`W1-${i}`)} myId={myId} />)}</div>
          <div className="stack" style={{ gap: 60 }}>{[0, 1].map((i) => <SeriesBox key={i} L={L} s={get(`W2-${i}`)} myId={myId} />)}</div>
          <div><SeriesBox L={L} s={get('W3-0')} myId={myId} /></div>
          <div><div className="tiny dim" style={{ textAlign: 'center', marginBottom: 6 }}>Finales NBA</div><SeriesBox L={L} s={get('F4-0')} myId={myId} />{ps.champion && <div className="chip gold" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>🏆 {L.teams[ps.champion].name}</div>}</div>
          <div><SeriesBox L={L} s={get('E3-0')} myId={myId} /></div>
          <div className="stack" style={{ gap: 60 }}>{[0, 1].map((i) => <SeriesBox key={i} L={L} s={get(`E2-${i}`)} myId={myId} />)}</div>
          <div className="stack">{[0, 1, 2, 3].map((i) => <SeriesBox key={i} L={L} s={get(`E1-${i}`)} myId={myId} />)}</div>
        </div>
        <p className="tiny dim" style={{ marginTop: 10 }}>Oeste a la izquierda, Este a la derecha. Series al mejor de 7 con formato de campo 2-2-1-1-1.</p>
      </Card>
    </div>
  );
}
