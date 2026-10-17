import { useCareer } from '../store/store';
import { averages, f1, fpct } from '../engine/stats';
import { seasonLabel } from '../engine/schedule';
import { fmtMoney } from '../engine/contracts';
import { AWARD_LABEL } from '../engine/awards';
import { Card, Empty, PageHead } from '../ui/common';
import { LineChart } from '../ui/charts';

const COMP: Record<string, string> = { NBA: 'NBA', GLG: 'G League', NCAA: 'NCAA', EUR: 'Europa' };

export function History() {
  const c = useCareer()!;
  const s = c.seasons;
  const teams = [...new Set(s.filter((x) => x.comp === 'NBA' && x.teamId).map((x) => x.teamId!))];
  return (
    <>
      <PageHead eyebrow="Historial de temporadas" title="Tu trayectoria" desc="Cada temporada, con su equipo, su rol y lo que pasó." />
      {s.length === 0 ? <Card><Empty icon="🗓️" title="Tu historia empieza ahora">Completa tu primera temporada para verla aquí.</Empty></Card> : (
        <div className="grid two-col-h">
          <Card title="Línea de tiempo" icon="history">
            <div className="timeline">
              {s.map((x, i) => {
                const a = averages(x.stats);
                const t = x.teamId ? c.league.teams[x.teamId] : null;
                return (
                  <div key={i} className="tl-item">
                    <div className="age">{x.age}</div>
                    <div className="rail" />
                    <div className="body">
                      <div className="row wrap" style={{ gap: 8 }}>
                        {t && <span className="team-dot" style={{ background: t.color }} />}
                        <b>{x.teamName}</b>
                        <span className="chip">{COMP[x.comp]}</span>
                        <span className="chip">{seasonLabel(x.season)}</span>
                        <span className={`chip ${x.ovrEnd >= x.ovrStart ? 'good' : 'bad'}`}>OVR {x.ovrEnd}</span>
                      </div>
                      <div className="small muted" style={{ marginTop: 4 }}>{x.role} · {x.stats.gp} PJ · {f1(a.ppg)} PTS · {f1(a.rpg)} REB · {f1(a.apg)} AST · {fpct(a.fgp)} TC</div>
                      <div className="small" style={{ marginTop: 2 }}>{x.teamRecord !== '—' ? `${x.teamRecord} · ` : ''}{x.result}{x.salary ? <span className="dim"> · {fmtMoney(x.salary)}</span> : null}</div>
                      {x.awards.length > 0 && <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>{x.awards.map((aw) => <span key={aw} className="chip gold">{AWARD_LABEL[aw] ?? aw}</span>)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="stack">
            <Card title="Historial de equipos" icon="people">
              {teams.length === 0 ? <p className="small muted">Aún sin temporadas NBA.</p> : (
                <div className="list">
                  {teams.map((id) => {
                    const ss = s.filter((x) => x.teamId === id && x.comp === 'NBA');
                    const t = c.league.teams[id];
                    return <div key={id} className="li"><span className="team-dot" style={{ background: t.color }} /><div style={{ flex: 1 }}><b className="small">{t.city} {t.name}</b><div className="tiny dim">{seasonLabel(ss[0].season)} – {seasonLabel(ss[ss.length - 1].season)}</div></div><span className="chip">{ss.length} temp.</span></div>;
                  })}
                </div>
              )}
            </Card>
            <Card title="Minutos por temporada" icon="chart">
              <LineChart labels={s.filter((x) => x.comp === 'NBA').map((x) => seasonLabel(x.season).slice(2))} series={[{ label: 'MIN', color: 'var(--accent)', values: s.filter((x) => x.comp === 'NBA').map((x) => averages(x.stats).mpg) }]} format={(v) => v.toFixed(0)} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
