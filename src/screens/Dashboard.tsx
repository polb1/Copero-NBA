import { Link, useNavigate } from 'react-router-dom';
import { TeamBadge } from '../ui/simple';
import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { currentComp, onNbaRoster, teamOf, userOf, userRole } from '../engine/career';
import { teamName } from '../engine/league';
import { averages, f1, fpct } from '../engine/stats';
import { standings, gamesBehind, seriesFor, teamPlayoffResult } from '../engine/season';
import { salaryIn, yearsLeft, contractEnd, fmtMoney } from '../engine/contracts';
import { fmtDate, seasonLabel } from '../engine/schedule';
import { goalOptions } from '../engine/goals';
import { injuryLabel } from '../engine/injuries';
import { SATELLITES } from '../engine/satellite';
import { Card, Gauge, Kpi, PageHead, PHASE_LABEL } from '../ui/common';
import { PlayerCard } from '../ui/PlayerCard';
import { AdvanceBar, nextAction } from '../ui/Layout';
import { LineChart } from '../ui/charts';
import { Icon } from '../ui/icons';
import type { Career } from '../engine/types';

export function Dashboard() {
  const c = useCareer()!;
  const nav = useNavigate();
  const u = userOf(c);
  const t = teamOf(c);
  const role = userRole(c);
  const comp = currentComp(c);
  const stats = comp === 'NBA' ? u.season : c.satStats.gp ? c.satStats : u.season;
  const a = averages(stats);
  const na = nextAction(c);
  return (
    <>
      <PageHead eyebrow={`${PHASE_LABEL[c.phase]} · ${seasonLabel(c.league.season)}`} title="Panel principal" desc={t ? `${teamName(c.league, t.id)} · ${role.label}` : c.satellite ? `${c.satellite.teamName} · ${SATELLITES[c.satellite.comp as 'NCAA' | 'EUR' | 'GLG'].name}` : 'Sin equipo'}>
        <div className="show-sm"><AdvanceBar compact /></div>
      </PageHead>

      {na && (
        <div className="card hl anim-in" style={{ marginBottom: 16 }}>
          <div className="row between wrap">
            <div>
              <div className="eyebrow">Siguiente paso</div>
              <h2 style={{ marginTop: 4 }}>{na.label}</h2>
            </div>
            <button className="btn primary lg" onClick={() => (na.run ? na.run() : na.to && nav(na.to))}><Icon name={na.icon} /> Continuar</button>
          </div>
        </div>
      )}

      {c.phase === 'season-end' && c.lastSummary && <SeasonReport c={c} />}
      {c.phase === 'offseason' && <OffseasonPanel c={c} />}
      {c.phase === 'preseason' && <PreseasonPanel c={c} />}

      <div className="grid dash">
        <div className="stack pc">
          <PlayerCard c={c} p={u} teamColor={t?.color ?? c.profile.look.accent} teamLabel={t ? `${teamName(c.league, t.id)}${!onNbaRoster(c) ? ' (G League)' : ''}` : c.satellite?.teamName ?? 'Agente libre'} />
          <Card title="Estado" icon="heart">
            <div className="stack" style={{ gap: 12 }}>
              {u.injury ? <div className="chip bad" style={{ whiteSpace: 'normal' }}>🩹 {injuryLabel(u.injury)}{u.injury.playingThrough ? ' · jugando con molestias' : ''}</div> : <div className="chip good">Sano y disponible</div>}
              <Gauge label="Energía" value={100 - u.fatigue} />
              <Gauge label="Forma" value={(u.form + 10) * 5} hint="Rendimiento reciente respecto a lo esperado" />
              <Gauge label="Confianza del entrenador" value={c.trust} />
              <Gauge label="Moral" value={c.morale} />
              <Gauge label="Química" value={c.chemistry} />
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title={`Temporada ${seasonLabel(c.league.season)}${comp !== 'NBA' ? ` · ${comp === 'GLG' ? 'G League' : comp}` : ''}`} icon="chart" action={<Link to="/stats">Ver todo</Link>}>
            <div className="kpis">
              <Kpi v={stats.gp} l="Partidos" />
              <Kpi v={f1(a.ppg)} l="Puntos" tone="accent" />
              <Kpi v={f1(a.rpg)} l="Rebotes" />
              <Kpi v={f1(a.apg)} l="Asistencias" />
              <Kpi v={f1(a.mpg)} l="Minutos" />
              <Kpi v={fpct(a.ts)} l="TS%" />
            </div>
            <div className="row wrap small muted" style={{ gap: 14, marginTop: 12 }}>
              <span>{f1(a.spg)} ROB</span><span>{f1(a.bpg)} TAP</span><span>{fpct(a.fgp)} TC</span><span>{fpct(a.tpp)} T3</span><span>{a.pm >= 0 ? '+' : ''}{f1(a.pm)} +/-</span><span>{stats.dd} dobles-dobles</span>
            </div>
          </Card>
          <RecentGames c={c} />
          <UpcomingGames c={c} />
        </div>

        <div className="stack">
          <TeamSnapshot c={c} />
          <Card title="Objetivos" icon="target" action={<Link to="/training">Gestionar</Link>}>
            {c.goals.length === 0 ? <p className="small muted">Sin objetivos esta temporada. Elígelos en la pretemporada desde Desarrollo.</p> : (
              <div className="list">
                {c.goals.map((g) => (
                  <div key={g.id} className="li">
                    <span>{g.status === 'done' ? '✅' : g.status === 'failed' ? '❌' : '🎯'}</span>
                    <div style={{ flex: 1 }}><b className="small">{g.label}</b><div className="tiny dim">{g.desc}</div></div>
                    <span className="tiny muted">{g.progress ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Contrato" icon="contract" action={<Link to="/contracts">Detalles</Link>}>
            {u.contract ? (
              <div className="kpis">
                <Kpi v={fmtMoney(salaryIn(u.contract, c.league.season))} l="Salario" />
                <Kpi v={Math.max(0, yearsLeft(u.contract, c.league.season))} l="Años rest." />
                <Kpi v={fmtMoney(c.earnings)} l="Ganado" tone="gold" />
              </div>
            ) : <p className="small muted">{c.satellite ? `Compitiendo en ${c.satellite.teamName}.` : 'Sin contrato NBA.'}</p>}
            {u.contract && <p className="tiny dim" style={{ marginTop: 8 }}>Hasta {seasonLabel(contractEnd(u.contract))}{u.contract.option ? ` · opción de ${u.contract.option.type === 'player' ? 'jugador' : 'equipo'} en ${seasonLabel(u.contract.option.season)}` : ''}</p>}
          </Card>
          <LatestNews c={c} />
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title="Evolución del OVR" icon="chart">
          <LineChart labels={c.ovrHistory.map((o) => String(o.age))} series={[{ label: 'OVR', color: 'var(--accent)', values: c.ovrHistory.map((o) => o.ovr) }, { label: 'Potencial', color: '#60a5fa', values: c.ovrHistory.map((o) => o.pot) }]} />
        </Card>
        <Card title="Producción por temporada (NBA)" icon="chart">
          {(() => {
            const s = c.seasons.filter((x) => x.comp === 'NBA' && x.stats.gp > 0);
            return <LineChart labels={s.map((x) => seasonLabel(x.season).slice(2))} series={[{ label: 'PTS', color: 'var(--accent)', values: s.map((x) => averages(x.stats).ppg) }, { label: 'REB', color: '#34d399', values: s.map((x) => averages(x.stats).rpg) }, { label: 'AST', color: '#60a5fa', values: s.map((x) => averages(x.stats).apg) }]} format={(v) => v.toFixed(1)} />;
          })()}
        </Card>
      </div>
    </>
  );
}

function RecentGames({ c }: { c: Career }) {
  const games = c.gameLog.slice(-6).reverse();
  return (
    <Card title="Últimos partidos" icon="ball" action={<Link to="/schedule">Calendario</Link>}>
      {games.length === 0 ? <p className="small muted">Todavía no has jugado partidos esta temporada.</p> : (
        <div className="list">
          {games.map((g, i) => (
            <div key={i} className="li">
              <span className={`wl ${g.teamScore > g.oppScore ? 'w' : 'l'}`}>{g.teamScore > g.oppScore ? 'V' : 'D'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small" style={{ fontWeight: 600 }}>{g.home ? 'vs' : '@'} {g.oppName} <span className="dim">{g.teamScore}-{g.oppScore}{g.ot ? ` (${g.ot}OT)` : ''}</span></div>
                <div className="tiny dim">{fmtDate(g.season, g.day)} · {g.comp === 'NBA' ? (g.kind === 'playoff' ? 'Playoffs' : g.kind === 'playin' ? 'Play-In' : 'NBA') : g.comp}</div>
              </div>
              {g.line ? <span className="small num"><b>{g.line.pts}</b> pts · {g.line.oreb + g.line.dreb} reb · {g.line.ast} ast</span> : <span className="tiny dim">{g.dnp ?? 'No jugó'}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function UpcomingGames({ c }: { c: Career }) {
  const u = userOf(c);
  if (!u.teamId || c.phase === 'offseason' || c.phase === 'season-end') return null;
  const ps = c.league.postseason;
  if (ps) {
    const s = seriesFor(c.league, u.teamId);
    const res = teamPlayoffResult(c.league, u.teamId);
    return (
      <Card title="Postemporada" icon="trophy" action={<Link to="/standings">Cuadro</Link>}>
        {s ? <p className="small"><b>{teamName(c.league, s.high)}</b> {s.winsHigh} – {s.winsLow} <b>{teamName(c.league, s.low)}</b></p> : null}
        <p className="small muted" style={{ marginTop: 6 }}>{res.label}</p>
      </Card>
    );
  }
  const next = c.league.schedule.filter((g) => !g.played && (g.home === u.teamId || g.away === u.teamId)).slice(0, 4);
  return (
    <Card title="Próximos partidos" icon="calendar">
      {next.length === 0 ? <p className="small muted">No hay partidos programados.</p> : (
        <div className="list">
          {next.map((g) => {
            const opp = g.home === u.teamId ? g.away : g.home;
            const t = c.league.teams[opp];
            return (
              <div key={g.id} className="li">
                <TeamBadge id={t.id} color={t.color} size={20} />
                <div style={{ flex: 1 }} className="small">{g.home === u.teamId ? 'vs' : '@'} {teamName(c.league, opp)}</div>
                <span className="tiny dim">{t.w}-{t.l}</span>
                <span className="tiny muted">{fmtDate(c.league.season, g.day)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TeamSnapshot({ c }: { c: Career }) {
  const t = teamOf(c);
  if (!t) {
    const s = c.satellite;
    return (
      <Card title="Tu equipo" icon="people">
        {s ? <p className="small">{s.teamName}: <b>{s.w}-{s.l}</b> en {SATELLITES[s.comp as 'NCAA' | 'EUR' | 'GLG'].name}.</p> : <p className="small muted">Sin equipo.</p>}
        <p className="tiny dim" style={{ marginTop: 8 }}>Líder de la NBA: {teamName(c.league, standings(c.league)[0].id)} ({standings(c.league)[0].w}-{standings(c.league)[0].l})</p>
      </Card>
    );
  }
  const conf = standings(c.league, t.conf);
  const rank = conf.findIndex((x) => x.id === t.id) + 1;
  const window = conf.slice(Math.max(0, rank - 3), Math.max(0, rank - 3) + 5);
  return (
    <Card title={`${t.conf === 'E' ? 'Conferencia Este' : 'Conferencia Oeste'}`} icon="table" action={<Link to="/standings">Completa</Link>}>
      <div className="kpis" style={{ marginBottom: 10 }}>
        <Kpi v={`${t.w}-${t.l}`} l="Récord" />
        <Kpi v={`${rank}.º`} l="Puesto" tone={rank <= 6 ? 'good' : rank <= 10 ? 'accent' : 'bad'} />
        <Kpi v={t.streak > 0 ? `V${t.streak}` : t.streak < 0 ? `D${-t.streak}` : '—'} l="Racha" />
      </div>
      <table className="t">
        <tbody>
          {window.map((x) => {
            const r = conf.indexOf(x) + 1;
            return <tr key={x.id} className={x.id === t.id ? 'me' : ''}><td className="l">{r}. <TeamBadge id={x.id} color={x.color} size={20} /> {x.city}</td><td>{x.w}-{x.l}</td><td className="dim">{r === 1 ? '—' : gamesBehind(conf[0], x).toFixed(1)}</td></tr>;
          })}
        </tbody>
      </table>
    </Card>
  );
}

function LatestNews({ c }: { c: Career }) {
  const last = c.decisions[c.decisions.length - 1];
  const news = c.news.slice(0, 3);
  return (
    <Card title="Últimos acontecimientos" icon="news" action={<Link to="/news">Noticias</Link>}>
      {last && <div className="small" style={{ marginBottom: 8 }}><span className="chip accent">Decisión</span> <b>{last.title}</b> — <span className="muted">{last.choice}</span></div>}
      <div className="list">
        {news.map((n) => (
          <div key={n.id} className="li" style={{ alignItems: 'flex-start' }}>
            <span className={`team-dot`} style={{ marginTop: 7, background: n.tone === 'good' ? 'var(--good)' : n.tone === 'bad' ? 'var(--bad)' : 'var(--text-3)' }} />
            <div><div className="small" style={{ fontWeight: 600 }}>{n.title}</div><div className="tiny dim">{n.date}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeasonReport({ c }: { c: Career }) {
  const s = c.lastSummary!;
  return (
    <div className="card hl anim-in" style={{ marginBottom: 16 }}>
      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <div><div className="eyebrow">Informe de temporada</div><h2>{seasonLabel(s.season)}</h2></div>
        <span className={`chip ${s.ovrDelta >= 0 ? 'good' : 'bad'}`}>OVR {s.ovrDelta >= 0 ? '+' : ''}{s.ovrDelta}</span>
      </div>
      <div className="grid g3">
        <div className="stack">
          <h3 className="small">Estadísticas</h3>
          {s.lines.map((l) => <div key={l.label} className="row between small"><span className="muted">{l.label}</span><b className={l.tone ?? ''}>{l.value}</b></div>)}
        </div>
        <div className="stack">
          <h3 className="small">Equipo y contrato</h3>
          <p className="small">{s.teamResult}</p>
          <p className="small muted">{s.contract}</p>
          <h3 className="small" style={{ marginTop: 8 }}>Premios</h3>
          {s.awards.length ? <div className="row wrap">{s.awards.map((a) => <span key={a} className="chip gold">🏆 {a}</span>)}</div> : <p className="small dim">Sin premios individuales.</p>}
        </div>
        <div className="stack">
          <h3 className="small">Momentos destacados</h3>
          {s.highlights.length ? s.highlights.map((h) => <p key={h} className="small muted">• {h}</p>) : <p className="small dim">—</p>}
          <h3 className="small" style={{ marginTop: 8 }}>Objetivos</h3>
          {s.goals.length ? s.goals.map((g) => <p key={g.id} className="small">{g.status === 'done' ? '✅' : '❌'} {g.label} <span className="dim">({g.progress})</span></p>) : <p className="small dim">No fijaste objetivos.</p>}
        </div>
      </div>
      {s.decisions.length > 0 && <details style={{ marginTop: 12 }}><summary className="small muted" style={{ cursor: 'pointer' }}>Decisiones importantes ({s.decisions.length})</summary><ul className="small muted">{s.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></details>}
      <p className="small muted" style={{ marginTop: 12 }}>Próxima temporada: fija nuevos objetivos en la pretemporada y revisa tu situación contractual en la temporada baja.</p>
    </div>
  );
}

function OffseasonPanel({ c }: { c: Career }) {
  const u = userOf(c);
  const nav = useNavigate();
  const needs = api.needsContract(c);
  return (
    <div className="card anim-in" style={{ marginBottom: 16 }}>
      <div className="row between wrap">
        <div>
          <div className="eyebrow">Temporada baja {seasonLabel(c.league.season)}</div>
          <h2>{needs ? 'Necesitas equipo' : 'Bajo contrato'}</h2>
          <p className="small muted" style={{ marginTop: 6 }}>{needs ? `${c.offers.length} oferta(s) disponibles. Revisa contratos y agencia.` : c.offers.length ? 'Tienes propuestas pendientes (extensión u opción). Revísalas antes de empezar.' : 'Todo listo para la pretemporada.'} Edad: {u.age} · OVR {u.ovr}.</p>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => nav('/contracts')}><Icon name="contract" /> Contratos</button>
          {(u.age >= 30 || (needs && c.offers.length === 0)) && <button className="btn danger" onClick={() => { if (confirm('¿Seguro que quieres retirarte? La carrera terminará.')) { store.act((x) => api.retire(x, 'Retirada voluntaria.')); nav('/retirement'); } }}>Retirarse</button>}
        </div>
      </div>
    </div>
  );
}

function PreseasonPanel({ c }: { c: Career }) {
  const u = userOf(c);
  const opts = goalOptions(c, u);
  const chosen = c.goals.map((g) => g.id);
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-2);
    store.act((x) => api.setGoals(x, next));
  };
  return (
    <div className="card anim-in" style={{ marginBottom: 16 }}>
      <div className="eyebrow">Training camp</div>
      <h2 style={{ marginBottom: 6 }}>Fija hasta dos objetivos</h2>
      <p className="small muted" style={{ marginBottom: 12 }}>Se evalúan con tus estadísticas reales al final de la temporada. Cumplirlos mejora tu reputación, moral y confianza; fallarlos tiene coste.</p>
      <div className="tiles">
        {opts.map((g) => (
          <button key={g.id} className="tile" aria-pressed={chosen.includes(g.id)} onClick={() => toggle(g.id)}>
            <span className="t" style={{ fontSize: '1rem' }}>{g.label}</span><span className="d">{g.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
