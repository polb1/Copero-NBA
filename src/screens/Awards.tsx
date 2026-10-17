import { useState } from 'react';
import { useCareer } from '../store/store';
import { userOf } from '../engine/career';
import { AWARD_LABEL } from '../engine/awards';
import { awardCounts, careerTotals, playoffTotals } from '../engine/legacy';
import { seasonLabel } from '../engine/schedule';
import { f1 } from '../engine/stats';
import { Card, Empty, Kpi, PageHead } from '../ui/common';

const MILESTONES = [1000, 5000, 10000, 15000, 20000, 25000, 30000];

export function Awards() {
  const c = useCareer()!;
  const u = userOf(c);
  const L = c.league;
  const counts = awardCounts(c);
  const tot = careerTotals(c);
  const po = playoffTotals(c);
  const [season, setSeason] = useState<number | null>(L.awards.length ? L.awards[L.awards.length - 1].season : null);
  const aw = L.awards.find((a) => a.season === season);
  const name = (id?: string) => (id ? (id === u.id ? `${u.first} ${u.last} (tú)` : aw?.names[id] ?? id) : '—');
  const highs: [string, { value: number; season: number; opp: string } | undefined][] = [
    ['Puntos', c.highs.pts], ['Rebotes', c.highs.reb], ['Asistencias', c.highs.ast], ['Robos', c.highs.stl], ['Tapones', c.highs.blk], ['Triples', c.highs.tpm],
  ];
  return (
    <>
      <PageHead eyebrow="Premios y récords" title="Vitrina" desc="Premios calculados con las estadísticas reales de todos los jugadores simulados: producción, eficiencia, impacto en victorias y partidos disputados (mínimo 65 para MVP, DPOY, All-NBA y All-Defensive)." />
      <div className="grid g3">
        <Card title="Tus premios" icon="trophy" className="span2">
          {Object.keys(counts).length === 0 ? <Empty icon="🏆" title="Vitrina vacía">Los premios llegan con rendimiento, no con OVR.</Empty> : (
            <div className="row wrap" style={{ gap: 10 }}>
              {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <div key={k} className="card flat" style={{ padding: '12px 16px', minWidth: 140 }}>
                  <div className="kpi"><span className="v gold">{n}×</span><span className="l">{AWARD_LABEL[k] ?? k}</span></div>
                </div>
              ))}
            </div>
          )}
          <div className="divider" />
          <h3 className="small" style={{ marginBottom: 8 }}>Por temporada</h3>
          <div className="list">
            {c.seasons.filter((s) => s.awards.length).map((s, i) => (
              <div key={i} className="li"><span className="chip">{seasonLabel(s.season)}</span><div className="row wrap" style={{ gap: 6 }}>{s.awards.map((a) => <span key={a} className="chip gold">{AWARD_LABEL[a] ?? a}</span>)}</div></div>
            ))}
          </div>
        </Card>
        <Card title="Récords personales (NBA)" icon="star">
          <table className="t">
            <tbody>
              {highs.map(([l, h]) => <tr key={l}><td className="l">{l}</td><td><b>{h?.value ?? '—'}</b></td><td className="small dim">{h ? `vs ${h.opp.split(' ').slice(-1)[0]} ${seasonLabel(h.season)}` : ''}</td></tr>)}
            </tbody>
          </table>
          <h3 className="small" style={{ margin: '14px 0 6px' }}>Playoffs</h3>
          <table className="t"><tbody>
            {([['Puntos', c.playoffHighs.pts], ['Rebotes', c.playoffHighs.reb], ['Asistencias', c.playoffHighs.ast]] as const).map(([l, h]) => <tr key={l}><td className="l">{l}</td><td><b>{h?.value ?? '—'}</b></td><td className="small dim">{h ? seasonLabel(h.season) : ''}</td></tr>)}
          </tbody></table>
        </Card>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title="Hitos de carrera" icon="flag">
          <div className="kpis" style={{ marginBottom: 12 }}>
            <Kpi v={tot.pts.toLocaleString('es')} l="Puntos NBA" tone="accent" />
            <Kpi v={(tot.oreb + tot.dreb).toLocaleString('es')} l="Rebotes" />
            <Kpi v={tot.ast.toLocaleString('es')} l="Asistencias" />
            <Kpi v={po.gp} l="Partidos de playoffs" />
          </div>
          <div className="stack small">
            {MILESTONES.map((m) => (
              <div key={m} className="row between"><span className={tot.pts >= m ? '' : 'dim'}>{tot.pts >= m ? '✅' : '⬜'} {m.toLocaleString('es')} puntos</span>{tot.pts < m && <span className="tiny dim">faltan {(m - tot.pts).toLocaleString('es')}</span>}</div>
            ))}
            <div className="row between"><span>{tot.td > 0 ? '✅' : '⬜'} Triples-dobles: {tot.td}</span><span>Dobles-dobles: {tot.dd}</span></div>
          </div>
        </Card>
        <Card title="Premios de la liga" icon="medal" action={L.awards.length > 0 && (
          <select className="input" style={{ width: 'auto', minHeight: 32, padding: '4px 8px' }} value={season ?? ''} onChange={(e) => setSeason(Number(e.target.value))} aria-label="Temporada">
            {[...L.awards].reverse().map((a) => <option key={a.season} value={a.season}>{seasonLabel(a.season)}</option>)}
          </select>
        )}>
          {!aw ? <Empty icon="🏅" title="Aún no hay premios entregados" /> : (
            <div className="stack small">
              {(['mvp', 'dpoy', 'roy', 'smoy', 'mip', 'fmvp'] as const).map((k) => <div key={k} className="row between"><span className="muted">{AWARD_LABEL[k]}</span><b className={aw[k] === u.id ? 'accent' : ''}>{name(aw[k])}</b></div>)}
              <div className="row between"><span className="muted">Campeón</span><b>{aw.champion ? `${L.teams[aw.champion].city} ${L.teams[aw.champion].name}` : '—'}</b></div>
              <div className="divider" />
              <div className="label">Votación MVP</div>
              {aw.mvpVoting.map((m, i) => <div key={m.pid} className="row between"><span>{i + 1}. {name(m.pid)}</span><span className="dim">{m.score}</span></div>)}
              <div className="divider" />
              <div className="label">All-NBA</div>
              {aw.allNba.map((team, i) => <div key={i}><span className="dim">{i + 1}.º:</span> {team.map(name).join(', ')}</div>)}
              <div className="label" style={{ marginTop: 6 }}>Líderes</div>
              {(['pts', 'reb', 'ast', 'stl', 'blk'] as const).map((k) => aw.leaders[k] && <div key={k} className="row between"><span className="muted">{{ pts: 'Puntos', reb: 'Rebotes', ast: 'Asistencias', stl: 'Robos', blk: 'Tapones' }[k]}</span><span>{name(aw.leaders[k]!.pid)} · <b>{f1(aw.leaders[k]!.value)}</b></span></div>)}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
