import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { userOf } from '../engine/career';
import { teamName } from '../engine/league';
import { averages, f1, fpct } from '../engine/stats';
import { archetypeDef } from '../engine/attributes';
import { SATELLITES } from '../engine/satellite';
import { RULES } from '../engine/config';
import { Card, Kpi, PageHead, flag } from '../ui/common';
import { AdvanceBar } from '../ui/Layout';
import { Icon } from '../ui/icons';
import { PlayerCard } from '../ui/PlayerCard';

const STEP_LABEL = ['Temporada', 'Decisión', 'Combine', 'Entrevistas', 'Mock Draft', 'Lotería', 'Draft'];
const STEP_KEYS = ['season', 'decision', 'combine', 'interviews', 'mock', 'lottery', 'draft'];

export function Draft() {
  const c = useCareer()!;
  const nav = useNavigate();
  const p = c.predraft;
  const u = userOf(c);
  if (!p || !(c.phase === 'predraft' || (c.phase === 'signing' && p.step === 'draft'))) {
    return (
      <Card title="Proceso del draft">
        <p className="muted">Tu proceso de draft ya terminó{p?.userPick ? `: pick ${p.userPick.pick} (${teamName(c.league, p.userPick.teamId)})` : ''}.</p>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={() => nav('/career')}>Ir al panel</button>
      </Card>
    );
  }
  const idx = STEP_KEYS.indexOf(p.step);
  const sat = c.satellite;
  return (
    <>
      <PageHead eyebrow={`Camino al Draft ${c.league.season + 1}`} title={STEP_LABEL[idx] ?? 'Draft'} desc={p.route === 'college' ? `Temporada en ${p.clubName} (NCAA). Cada partido cuenta para los ojeadores.` : `Temporada en ${p.clubName}, compitiendo contra adultos en Europa.`} />
      <div className="steps" style={{ marginBottom: 20 }}>{STEP_LABEL.map((s, i) => <span key={s} className={i <= idx ? 'on' : ''} title={s} />)}</div>
      <div className="grid two-col">
        <div className="stack" style={{ gap: 16 }}>
          {p.step === 'season' && sat && (
            <Card title={`${SATELLITES[sat.comp as 'NCAA' | 'EUR'].name} · ${sat.teamName}`} icon="calendar" action={<span className="chip">{sat.w}-{sat.l}</span>}>
              <SeasonBlock />
              <div className="divider" />
              <div className="row wrap between">
                <span className="small muted">Partidos jugados: {sat.w + sat.l}/{sat.gamesPlanned}. La liga NBA se simula en paralelo: sus resultados decidirán el orden del draft.</span>
                <AdvanceBar />
              </div>
            </Card>
          )}
          {p.step === 'decision' && <Decision />}
          {p.step === 'combine' && (
            <Card title="Draft Combine" icon="bolt">
              <p className="muted" style={{ marginBottom: 14 }}>Las franquicias medirán tu velocidad, salto, agilidad y tiro. Un gran combine puede hacerte subir; uno malo, caer. También puedes limitarte a las medidas o no participar.</p>
              <div className="tiles">
                <button className="tile" onClick={() => store.act((x) => api.doCombine(x, 'full'))}><span className="t">Participar en todo</span><span className="d">Máximo riesgo y máxima recompensa.</span></button>
                <button className="tile" onClick={() => store.act((x) => api.doCombine(x, 'measure'))}><span className="t">Solo medidas</span><span className="d">Evitas exponerte. Leve penalización de imagen.</span></button>
                <button className="tile" onClick={() => store.act((x) => api.doCombine(x, 'skip'))}><span className="t">No acudir</span><span className="d">Confías en tu temporada. Los equipos lo notarán.</span></button>
              </div>
            </Card>
          )}
          {p.step === 'interviews' && p.interviewQuestions && (() => {
            const i = p.interviews.length;
            const q = p.interviewQuestions[i];
            return (
              <Card title={`Entrevista ${i + 1}/${p.interviewQuestions.length}: ${teamName(c.league, q.teamId)}`} icon="people">
                {p.combine && p.combine.sprint > 0 && <CombineResults />}
                <p style={{ fontSize: '1.1rem', margin: '10px 0 16px' }}>«{q.question}»</p>
                <div className="stack">
                  {q.answers.map((a, k) => (
                    <button key={k} className="opt" onClick={() => store.act((x) => api.answerInterview(x, i, k))}><b>{a}</b></button>
                  ))}
                </div>
                {p.interviews.length > 0 && <p className="tiny dim" style={{ marginTop: 12 }}>Sensaciones: {p.interviews.map((it) => `${teamName(c.league, it.teamId)}: ${it.result === 'good' ? 'buena' : it.result === 'bad' ? 'mala' : 'neutra'}`).join(' · ')}</p>}
              </Card>
            );
          })()}
          {p.step === 'mock' && p.mock && (
            <>
              <Card title="Mock Draft" icon="target" className="hl">
                <div className="kpis" style={{ marginBottom: 12 }}>
                  <Kpi v={`${p.mock.pickLow}–${p.mock.pickHigh}`} l="Rango proyectado" tone="accent" />
                  <Kpi v={p.combine?.grade ?? '—'} l="Combine" />
                  <Kpi v={p.interviews.filter((x) => x.result === 'good').length + '/' + p.interviews.length} l="Entrevistas buenas" />
                </div>
                <p className="muted">{p.mock.text}</p>
                <button className="btn primary lg" style={{ marginTop: 14 }} onClick={() => store.act(api.revealLottery)}><Icon name="ball" /> Ver el sorteo de la lotería</button>
              </Card>
              <BigBoard />
            </>
          )}
          {p.step === 'lottery' && p.lottery && (
            <Card title={`Lotería del draft (${RULES.lotteryFormat === '321' ? 'formato 3-2-1, 16 equipos' : 'formato 2019'})`} icon="ball">
              <div className="table-wrap">
                <table className="t">
                  <thead><tr><th>Pick</th><th className="l">Equipo</th><th>Récord</th><th>Puesto previo</th><th>Cambio</th></tr></thead>
                  <tbody>
                    {[...p.lottery].sort((a, b) => a.to - b.to).map((m) => {
                      const t = c.league.teams[m.teamId];
                      const d = m.from - m.to;
                      return (
                        <tr key={m.teamId}>
                          <td><b>{m.to}</b></td>
                          <td className="l"><span className="row"><span className="team-dot" style={{ background: t.color }} />{teamName(c.league, m.teamId)}</span></td>
                          <td>{t.w}-{t.l}</td><td>{m.from}</td>
                          <td className={d > 0 ? 'good' : d < 0 ? 'bad' : 'dim'}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '='}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="tiny dim" style={{ marginTop: 10 }}>Se sortean los {RULES.lotteryPicksDrawn} primeros picks (suposición: las fuentes no especifican cuántos en el formato 3-2-1). Los tres peores récords no pueden caer por debajo del 12.</p>
              <button className="btn primary lg" style={{ marginTop: 14 }} onClick={() => store.actAsync('Celebrando el draft…', api.runUserDraft)}><Icon name="star" /> Comenzar la noche del draft</button>
            </Card>
          )}
          {p.step === 'draft' && <DraftNight />}
        </div>
        <aside className="stack">
          <PlayerCard c={c} p={u} teamColor={c.profile.look.accent} teamLabel={p.clubName} />
          <Card title="Informe de scouting" icon="target">
            <ScoutReport />
          </Card>
        </aside>
      </div>
    </>
  );
}

function SeasonBlock() {
  const c = useCareer()!;
  const s = c.satStats;
  const a = averages(s);
  const last = c.gameLog.filter((g) => g.line).slice(-6).reverse();
  return (
    <>
      <div className="kpis">
        <Kpi v={f1(a.ppg)} l="Puntos" tone="accent" /><Kpi v={f1(a.rpg)} l="Rebotes" /><Kpi v={f1(a.apg)} l="Asistencias" /><Kpi v={fpct(a.fgp)} l="TC%" /><Kpi v={fpct(a.tpp)} l="T3%" /><Kpi v={f1(a.mpg)} l="Minutos" />
      </div>
      {last.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="t">
            <thead><tr><th className="l">Rival</th><th>Resultado</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>TC</th></tr></thead>
            <tbody>{last.map((g, i) => (
              <tr key={i}><td className="l">{g.home ? 'vs' : '@'} {g.oppName}</td><td><span className={`wl ${g.teamScore > g.oppScore ? 'w' : 'l'}`}>{g.teamScore > g.oppScore ? 'V' : 'D'}</span> {g.teamScore}-{g.oppScore}</td><td>{Math.round(g.line!.min)}</td><td><b>{g.line!.pts}</b></td><td>{g.line!.oreb + g.line!.dreb}</td><td>{g.line!.ast}</td><td>{g.line!.fgm}/{g.line!.fga}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Decision() {
  const c = useCareer()!;
  const p = c.predraft!;
  const u = userOf(c);
  const sum = c.lastSummary;
  const canReturn = u.age <= 21 && p.seasonsPlayed < 3;
  return (
    <Card title="Fin de temporada: ¿te declaras para el draft?" icon="flag" className="hl">
      {sum && (
        <div className="grid g3" style={{ marginBottom: 14 }}>
          {sum.lines.slice(1, 7).map((l) => <div key={l.label} className="kpi"><span className="v" style={{ fontSize: '1.4rem' }}>{l.value}</span><span className="l">{l.label}</span></div>)}
        </div>
      )}
      <p className="muted">Los ojeadores han visto tu temporada. Puedes dar el salto ahora o volver un año más para mejorar tu cotización (y arriesgarte a que otros prospectos te adelanten).</p>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className="btn primary lg" onClick={() => store.act((x) => api.predraftDecision(x, true))}><Icon name="star" /> Declararme para el draft</button>
        <button className="btn lg" disabled={!canReturn} onClick={() => store.actAsync('Avanzando un año…', (x) => api.predraftDecision(x, false))}>Volver otra temporada</button>
      </div>
      {!canReturn && <p className="tiny dim" style={{ marginTop: 8 }}>Ya no tiene sentido esperar más: tu edad juega en contra.</p>}
    </Card>
  );
}

function CombineResults() {
  const c = useCareer()!;
  const k = c.predraft!.combine!;
  return (
    <div className="kpis" style={{ marginBottom: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 10 }}>
      <Kpi v={`${k.sprint}s`} l="Sprint 3/4" /><Kpi v={`${k.vertical}"`} l="Salto máx." /><Kpi v={`${k.lane}s`} l="Agilidad" /><Kpi v={`${k.shooting}/25`} l="Tiro" /><Kpi v={k.grade} l="Nota" tone="accent" />
    </div>
  );
}

function BigBoard() {
  const c = useCareer()!;
  const cls = c.predraft!.draftClass!;
  return (
    <Card title="Big Board (top 30 de la clase)" icon="table">
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>#</th><th className="l">Prospecto</th><th>Pos</th><th>Edad</th><th className="l">Arquetipo</th><th>OVR</th><th>POT</th></tr></thead>
          <tbody>
            {[...cls].sort((a, b) => b.value - a.value).slice(0, 30).map((pr, i) => (
              <tr key={pr.id} className={pr.isUser ? 'me' : ''}>
                <td>{i + 1}</td><td className="l">{flag(pr.nat)} {pr.name}{pr.isUser && ' (tú)'}</td><td>{pr.pos}</td><td>{pr.age}</td><td className="l">{archetypeDef(pr.arch).label}</td><td>{pr.ovr}</td><td className="accent">{pr.pot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny dim" style={{ marginTop: 8 }}>Cada franquicia ordena la clase según sus necesidades, su situación y sus propios informes: el orden real será distinto.</p>
    </Card>
  );
}

function DraftNight() {
  const c = useCareer()!;
  const nav = useNavigate();
  const p = c.predraft!;
  const picks = p.picks ?? [];
  const userIdx = picks.findIndex((x) => x.prospectId === 'user');
  const stopAt = userIdx >= 0 ? userIdx + 1 : picks.length;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= stopAt) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown < 5 ? 420 : 140);
    return () => clearTimeout(t);
  }, [shown, stopAt]);
  const done = shown >= stopAt;
  const cls = p.draftClass!;
  return (
    <Card title="Noche del draft" icon="star" action={!done && <button className="btn sm" onClick={() => setShown(stopAt)}>Saltar</button>}>
      <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }} aria-live="polite">
        {picks.slice(0, shown).map((pk) => {
          const pr = cls.find((x) => x.id === pk.prospectId)!;
          const t = c.league.teams[pk.teamId];
          return (
            <div key={pk.pick} className={`li reveal-pick`} style={pr.isUser ? { background: 'var(--accent-soft)', borderRadius: 10, padding: 12 } : undefined}>
              <span className="badge-num">{pk.pick}</span>
              <span className="team-dot" style={{ background: t.color }} />
              <div style={{ flex: 1 }}>
                <b>{pr.isUser ? `¡${pr.name}!` : pr.name}</b>
                <div className="tiny dim">{teamName(c.league, pk.teamId)} · {pr.pos} · {flag(pr.nat)} · {pk.pick <= RULES.roundSize ? '1.ª ronda' : '2.ª ronda'}</div>
              </div>
              <span className="chip">{pr.ovr}/{pr.pot}</span>
            </div>
          );
        })}
      </div>
      {done && (
        <div className="card hl pop" style={{ marginTop: 14 }}>
          {p.userPick ? (
            <>
              <h2>Pick {p.userPick.pick} · {teamName(c.league, p.userPick.teamId)}</h2>
              <p className="muted" style={{ marginTop: 6 }}>{p.userPick.round === 1 ? 'Primera ronda: contrato de escala de novato garantizado.' : 'Segunda ronda: tendrás que elegir entre contrato estándar o two-way.'}</p>
            </>
          ) : (
            <>
              <h2>Sin selección</h2>
              <p className="muted" style={{ marginTop: 6 }}>Nadie pronunció tu nombre. Aún quedan caminos: two-way, G League, Exhibit 10 o Europa.</p>
            </>
          )}
          <button className="btn primary lg" style={{ marginTop: 14 }} onClick={() => nav('/signing')}>Ver opciones de contrato <Icon name="arrow" /></button>
        </div>
      )}
    </Card>
  );
}

function ScoutReport() {
  const c = useCareer()!;
  const u = userOf(c);
  const a = u.attrs;
  const strengths = (Object.entries(a) as [string, number][]).sort((x, y) => y[1] - x[1]).slice(0, 3);
  const weak = (Object.entries(a) as [string, number][]).sort((x, y) => x[1] - y[1]).slice(0, 3);
  const L: Record<string, string> = { three: 'tiro exterior', mid: 'media distancia', ft: 'tiros libres', close: 'juego cerca del aro', layup: 'bandejas', dunk: 'mates', handle: 'manejo', pass: 'pase', vision: 'visión', speed: 'velocidad', accel: 'primer paso', strength: 'fuerza', vert: 'salto', stamina: 'resistencia', perD: 'defensa exterior', intD: 'defensa interior', steal: 'robos', block: 'tapones', oreb: 'rebote ofensivo', dreb: 'rebote defensivo', offIQ: 'lectura ofensiva', defIQ: 'lectura defensiva', consistency: 'regularidad' };
  return (
    <div className="stack small">
      <div><span className="good">Fortalezas:</span> {strengths.map(([k]) => L[k]).join(', ')}.</div>
      <div><span className="bad">A mejorar:</span> {weak.map(([k]) => L[k]).join(', ')}.</div>
      <div className="muted">Comparación de estilo: {archetypeDef(u.arch).label.toLowerCase()} con techo de {u.pot >= 88 ? 'franquicia' : u.pot >= 80 ? 'All-Star potencial' : u.pot >= 72 ? 'titular sólido' : 'jugador de rotación'}.</div>
    </div>
  );
}
