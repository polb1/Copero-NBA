import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Career, Offer, SeasonRecord } from '../../engine/types';
import * as api from '../../engine/api';
import { teamOf, userOf } from '../../engine/career';
import { inSeason } from '../../engine/flow';
import { teamName } from '../../engine/league';
import { averages, f1, sumStats } from '../../engine/stats';
import { marketValue, fmtMoney, makeSalaries } from '../../engine/contracts';
import { AWARD_LABEL } from '../../engine/awards';
import { SATELLITES } from '../../engine/satellite';
import { seasonLabel } from '../../engine/schedule';
import { RULES } from '../../engine/config';
import { countryByCode } from '../../content/names';
import { store, useCareer, useStore } from '../../store/store';
import { EventModalInline } from './EventInline';
import { TeamBadge, ovrTone } from '../../ui/simple';
import { drawCard } from '../Retirement';
import { Icon } from '../../ui/icons';

const AWARD_ICON: Record<string, string> = { champion: '💍', mvp: '👑', fmvp: '🥇', dpoy: '🛡️', roy: '🌱', smoy: '🔋', mip: '📈', allStar: '⭐', allNba1: '🏅', allNba2: '🏅', allNba3: '🏅', allDef1: '🧱', allDef2: '🧱' };

export function Play() {
  const c = useCareer();
  const busy = useStore((s) => s.busy);
  const toasts = useStore((s) => s.toasts);
  if (!c) return <div className="simple-wrap"><div className="simple-panel"><p className="muted">No hay carrera activa. <Link to="/start" className="accent">Crear una</Link></p></div></div>;
  return (
    <div className="simple-wrap">
      <div className="play-grid anim-in">
        <div className="play-left">
          <TopCard c={c} />
          <div className="divider" style={{ margin: '18px 0' }} />
          <Decision c={c} />
        </div>
        <div className="play-right">
          <Timeline c={c} />
        </div>
      </div>
      <div className="play-tools">
        <Link to="/career" className="btn sm ghost" title="Vista detallada"><Icon name="dash" /> Vista detallada</Link>
        <Link to="/achievements" className="btn sm ghost" title="Logros" aria-label="Logros"><Icon name="medal" /></Link>
        <Link to="/saves" className="btn sm ghost" title="Partidas" aria-label="Partidas"><Icon name="save" /></Link>
        <Link to="/" className="btn sm ghost" title="Inicio" aria-label="Inicio"><Icon name="home" /></Link>
      </div>
      <p className="tiny dim" style={{ textAlign: 'center', maxWidth: 820, margin: '14px auto 0' }}>Los nombres de franquicias se usan solo como referencia dentro de la simulación. Proyecto sin afiliación con la NBA; jugadores, entrenadores y agentes son ficticios.</p>
      {busy && <div className="busy" role="status" aria-live="polite"><div className="stack" style={{ alignItems: 'center', gap: 18 }}><div className="ball" /><span className="muted">{busy}</span></div></div>}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </div>
  );
}

function TopCard({ c }: { c: Career }) {
  const u = userOf(c);
  const t = teamOf(c);
  const tot = sumStats(c.seasons.filter((s) => s.comp === 'NBA').map((s) => s.stats).concat(inSeason(c) || c.phase === 'preseason' ? [u.season] : []));
  const a = averages(tot);
  const awards: Record<string, number> = {};
  for (const s of c.seasons) for (const k of s.awards) awards[k] = (awards[k] ?? 0) + 1;
  const clubLabel = t ? teamName(c.league, t.id) : c.satellite?.teamName ?? (c.phase === 'signing' ? 'Agente libre' : c.predraft?.clubName ?? 'Agente libre');
  return (
    <>
      <div className="top-card">
        <div className="ovr-tile" style={{ background: ovrTone(u.ovr) }}>
          <small>OVR</small>
          <b>{u.ovr}</b>
        </div>
        <div className="id-box" style={{ ['--team' as string]: t?.color ?? '#334155' }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="chip">{u.nat}</span>
            <span className="chip accent">#{c.profile.number} {u.pos}</span>
            <span className="tiny dim">POT {u.pot}</span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 6, minWidth: 0 }}>
            {t && <TeamBadge id={t.id} color={t.color} size={26} />}
            <strong className="club">{clubLabel}</strong>
          </div>
          <div className="id-side">
            <div><small>EDAD</small><b>{u.age}</b></div>
            <div><small>VALOR</small><b>{fmtMoney(marketValue(u, c.league.season))}</b></div>
          </div>
        </div>
      </div>
      <div className="tot-row">
        <div><small>PJ NBA</small><b>{tot.gp}</b></div>
        <div><small>PTS</small><b>{f1(a.ppg)}</b></div>
        <div><small>REB</small><b>{f1(a.rpg)}</b></div>
        <div><small>AST</small><b>{f1(a.apg)}</b></div>
      </div>
      <div className="vitrina">
        {Object.keys(awards).length === 0 ? (
          <><span style={{ fontSize: '1.3rem', opacity: 0.5 }}>🏆</span><span className="tiny dim">VITRINA VACÍA</span></>
        ) : (
          <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
            {Object.entries(awards).sort((x, y) => y[1] - x[1]).map(([k, n]) => <span key={k} className="chip gold" title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'} {n > 1 ? `${n}× ` : ''}{AWARD_LABEL[k] ?? k}</span>)}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------- Decisions ----------------

function Choice({ title, top, icon, children, onClick, tone }: { title: string; top?: string; icon?: ReactNode; children?: ReactNode; onClick: () => void; tone?: 'stay' | 'danger' }) {
  return (
    <button className={`choice ${tone ?? ''}`} onClick={onClick}>
      {top && <span className="tiny dim">{top}</span>}
      <b className="choice-title">{title}</b>
      {icon && <span className="choice-icon">{icon}</span>}
      {children && <span className="choice-body">{children}</span>}
    </button>
  );
}

function Block({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <div className="decision">
      <h2>{title}</h2>
      {desc && <p className="small muted" style={{ marginTop: 4 }}>{desc}</p>}
      <div className="choices">{children}</div>
    </div>
  );
}

function OfferChoice({ c, o, onPick, top = 'Firmar con' }: { c: Career; o: Offer; onPick: () => void; top?: string }) {
  const t = c.league.teams[o.teamId];
  const total = makeSalaries(o.salary, o.years, o.raise).reduce((s, v) => s + v, 0);
  const name = t ? `${t.city} ${t.name}` : 'Liga Europea';
  return (
    <Choice top={o.id === 'opt-player' ? 'Ejercer opción' : o.id.startsWith('ext-') ? 'Extender con' : top} title={name} onClick={onPick} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : <span style={{ fontSize: '2.6rem' }}>🌍</span>}>
      <span className="choice-meta">{fmtMoney(o.salary)}{o.years > 1 ? ` · ${o.years} años (${fmtMoney(total)})` : ` · ${o.kind === 'two-way' ? 'two-way' : o.kind === 'gleague' ? 'G League' : '1 año'}`}</span>
      <span className="choice-meta dim">{o.role}{t ? ` · ${t.w + t.l ? `${t.w}-${t.l}` : t.status === 'contender' ? 'aspirante' : t.status === 'rebuild' ? 'reconstrucción' : 'zona media'}` : ''}</span>
    </Choice>
  );
}

function Decision({ c }: { c: Career }) {
  const nav = useNavigate();
  const u = userOf(c);
  const t = teamOf(c);
  if (c.pendingEvent) return <EventModalInline c={c} />;
  const sim = (label: string, fn: (x: Career) => void) => store.actAsync(label, fn);
  /** Apply an action, then keep simulating until the next real decision. */
  const go = (label: string, fn?: (x: Career) => void) => store.actAsync(label, (x) => { fn?.(x); api.runUntilDecision(x); });

  switch (c.phase) {
    case 'predraft': {
      const p = c.predraft!;
      if (p.step === 'season') {
        const s = c.satellite!;
        const comp = SATELLITES[s.comp as 'NCAA' | 'EUR'];
        return (
          <Block title={`Temporada en ${s.teamName}`} desc={`${comp.name} · ${s.w}-${s.l}. Los ojeadores NBA miran cada partido; la liga NBA se juega en paralelo y decidirá el orden del draft.`}>
            <Choice top="Jugar" title="La temporada completa" icon="🏀" onClick={() => go('Jugando la temporada…')}>Se detiene si surge una decisión.</Choice>
          </Block>
        );
      }
      if (p.step === 'decision') {
        const canReturn = u.age <= 21 && p.seasonsPlayed < 3;
        return (
          <Block title="¿Te declaras para el draft?" desc={c.lastSummary ? c.lastSummary.lines.slice(2, 5).map((l) => `${l.value} ${l.label.toLowerCase()}`).join(' · ') : undefined}>
            <Choice top="Dar el salto" title="Declararme" icon="🎓" onClick={() => store.act((x) => api.predraftDecision(x, true))}>Combine, entrevistas y draft.</Choice>
            {canReturn && <Choice top="Esperar" title="Otra temporada" icon="📚" tone="stay" onClick={() => go('Jugando otra temporada…', (x) => api.predraftDecision(x, false))}>Mejorar tu cotización.</Choice>}
          </Block>
        );
      }
      if (p.step === 'combine') {
        return (
          <Block title="Draft Combine" desc="Las franquicias miden velocidad, salto, agilidad y tiro.">
            <Choice top="Riesgo alto" title="Participar en todo" icon="⚡" onClick={() => store.act((x) => api.doCombine(x, 'full'))}>Puede subirte… o bajarte.</Choice>
            <Choice top="Prudente" title="Solo medidas" icon="📏" onClick={() => store.act((x) => api.doCombine(x, 'measure'))}>Leve penalización.</Choice>
            <Choice top="Confianza" title="No acudir" icon="🙅" onClick={() => store.act((x) => api.doCombine(x, 'skip'))}>Los equipos lo notarán.</Choice>
          </Block>
        );
      }
      if (p.step === 'interviews' && p.interviewQuestions) {
        const i = p.interviews.length;
        const q = p.interviewQuestions[i];
        return (
          <Block title={`Entrevista con ${teamName(c.league, q.teamId)}`} desc={`«${q.question}»`}>
            {q.answers.map((a, k) => <Choice key={k} title={a} onClick={() => store.act((x) => api.answerInterview(x, i, k))} />)}
          </Block>
        );
      }
      if ((p.step === 'mock' || p.step === 'lottery') && p.mock) {
        // Lottery and draft run together: one click from the mock draft to your pick.
        const draftNight = (x: Career) => {
          if (x.predraft!.step === 'mock') api.revealLottery(x);
          api.runUserDraft(x);
        };
        return (
          <Block title={`Mock draft: picks ${p.mock.pickLow}–${p.mock.pickHigh}`} desc={p.mock.text}>
            <Choice top="La gran noche" title="Noche del draft" icon="🎤" onClick={() => sim('Lotería y draft…', draftNight)}>Lotería 3-2-1 y dos rondas.</Choice>
          </Block>
        );
      }
      return null;
    }
    case 'signing': {
      const pk = c.predraft?.userPick;
      return (
        <Block title={pk ? `Pick ${pk.pick} · ${teamName(c.league, pk.teamId)}` : 'Busca tu oportunidad'} desc={pk ? (pk.round === 1 ? 'Primera ronda: contrato de escala de novato.' : 'Segunda ronda: estándar o two-way.') : 'Nadie te eligió en el draft. Elige tu camino.'}>
          {c.offers.map((o) => <OfferChoice key={o.id} c={c} o={o} onPick={() => go('Primera temporada…', (x) => api.acceptOffer(x, o.id))} />)}
        </Block>
      );
    }
    case 'preseason':
    case 'regular':
    case 'postseason': {
      const where = t && c.assignment === 'NBA' ? teamName(c.league, t.id) : c.satellite?.teamName ?? (t ? t.gLeagueName : 'Europa');
      const record = t ? `${t.w}-${t.l}` : c.satellite ? `${c.satellite.w}-${c.satellite.l}` : '';
      return (
        <Block title={`Temporada ${seasonLabel(c.league.season)}`} desc={`${where}${record ? ` · ${record}` : ''}${c.phase === 'postseason' ? ' · Postemporada' : ''}${u.injury ? ` · 🩹 ${u.injury.name} (${u.injury.daysLeft} días)` : ''}`}>
          <Choice top="Simular" title={c.phase === 'postseason' ? 'Los playoffs' : 'La temporada'} icon="🏀" onClick={() => go('Simulando…')}>Se detiene si surge una decisión.</Choice>
          <Choice top="Ir partido a partido" title="Vista detallada" icon="📊" tone="stay" onClick={() => nav('/career')}>Calendario, rotación y estadísticas.</Choice>
        </Block>
      );
    }
    case 'season-end': {
      const s = c.lastSummary!;
      return (
        <Block title={`Fin de temporada ${seasonLabel(s.season)}`} desc={<>{s.teamResult}<br />{s.lines.slice(2, 5).map((l) => `${l.value} ${l.label.toLowerCase()}`).join(' · ')} · OVR {s.ovrDelta >= 0 ? '+' : ''}{s.ovrDelta}{s.awards.length ? <><br /><span className="gold">🏆 {s.awards.join(' · ')}</span></> : null}</>}>
          <Choice top="Continuar" title="Siguiente temporada" icon="▶️" onClick={() => go('Verano y nueva temporada…', api.beginOffseason)}>Solo se detiene si hay algo que decidir.</Choice>
        </Block>
      );
    }
    case 'offseason': {
      const needs = api.needsContract(c);
      const canRetire = u.age >= 30 || (needs && c.offers.length === 0);
      const accept = (id: string) => go('Nueva temporada…', (x) => { api.acceptOffer(x, id); x.offers = []; });
      return (
        <Block title={needs ? 'Mercado de fichajes' : c.offers.length ? 'Propuestas sobre la mesa' : `Verano · ${u.age} años`} desc={needs ? (c.offers.length ? 'Tu contrato terminó. Elige tu próximo destino.' : 'Nadie te ha hecho una oferta.') : `OVR ${u.ovr} · bajo contrato con ${teamName(c.league, u.teamId)}.`}>
          {c.offers.map((o) => <OfferChoice key={o.id} c={c} o={o} onPick={() => accept(o.id)} />)}
          {!needs && <Choice top="Quedarse en" title={t ? teamName(c.league, t.id) : 'tu equipo'} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : '🏠'} tone="stay" onClick={() => go('Nueva temporada…', (x) => { x.offers = []; })}>Seguir con tu contrato.</Choice>}
          {canRetire && <Choice top="Colgar las botas" title="Retirarse" icon="🏁" tone="danger" onClick={() => { if (confirm('¿Anunciar la retirada?')) store.act((x) => api.retire(x, 'Retirada voluntaria.')); }}>Fin de la carrera.</Choice>}
        </Block>
      );
    }
    case 'retired':
      return <Retired c={c} />;
    default:
      return null;
  }
}

function Retired({ c }: { c: Career }) {
  const nav = useNavigate();
  const u = userOf(c);
  const r = c.retirement!;
  const a = averages(r.totals);
  const download = () => {
    const link = document.createElement('a');
    link.href = drawCard(c);
    link.download = `nba-legacy-${u.last.toLowerCase()}.png`;
    link.click();
  };
  const share = async () => {
    const text = `🏀 NBA Legacy\n${u.first} ${u.last} (${u.pos}, ${countryByCode(u.nat).name})\n${r.totals.gp} PJ · ${f1(a.ppg)} PTS ${f1(a.rpg)} REB ${f1(a.apg)} AST · ${r.titles} anillo(s)\nLegacy Score ${r.legacyScore} · ${r.tier}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); store.toast('Resumen copiado.'); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="decision">
      <h2>{r.tier}</h2>
      <p className="small muted" style={{ marginTop: 4 }}>Retirado a los {r.age} · Legacy Score <b className="accent">{r.legacyScore}</b> · Hall of Fame {Math.round(r.hofProbability * 100)}% · {fmtMoney(r.earnings)} ganados</p>
      <div className="choices">
        <Choice top="Tarjeta final" title="Descargar PNG" icon="🖼️" onClick={download} />
        <Choice top="Presumir" title="Compartir" icon="📣" onClick={share} />
        <Choice top="Otra vez" title="Nueva carrera" icon="⭐" tone="stay" onClick={() => nav('/start')} />
      </div>
    </div>
  );
}

// ---------------- Timeline ----------------

function pickRecord(list: SeasonRecord[]): SeasonRecord {
  return list.find((s) => s.comp === 'NBA' && s.stats.gp > 0) ?? list.find((s) => s.stats.gp > 0) ?? list[0];
}

function Timeline({ c }: { c: Career }) {
  const u = userOf(c);
  const byAge = new Map<number, SeasonRecord>();
  const groups = new Map<number, SeasonRecord[]>();
  for (const s of c.seasons) groups.set(s.season, [...(groups.get(s.season) ?? []), s]);
  for (const list of groups.values()) { const r = pickRecord(list); byAge.set(r.age, r); }
  const startAge = Math.min(c.ovrHistory[0]?.age ?? u.age, ...[...byAge.keys()]);
  const endAge = Math.max(40, u.age + 1);
  const pendingAge = c.phase === 'retired' ? null : byAge.has(u.age) ? u.age + 1 : u.age;
  const t = teamOf(c);
  const pendingLabel = () => {
    if (c.phase === 'predraft') return c.predraft?.clubName ?? 'Formación';
    if (c.phase === 'signing') return 'Eligiendo equipo…';
    if (c.phase === 'season-end' || (c.phase === 'offseason' && api.needsContract(c))) return 'Eligiendo club…';
    if (t) return teamName(c.league, t.id);
    return c.satellite?.teamName ?? 'Decisión de carrera…';
  };
  const live = c.phase === 'predraft' ? c.satStats : c.assignment === 'GLG' && c.satStats.gp ? c.satStats : u.season;
  const la = averages(live);
  const rows: ReactNode[] = [];
  for (let age = startAge; age <= endAge; age++) {
    const r = byAge.get(age);
    if (r) {
      const a = averages(r.stats);
      const tm = r.teamId ? c.league.teams[r.teamId] : null;
      const won = r.awards.includes('champion');
      rows.push(
        <div key={age} className="tl-row" title={`${seasonLabel(r.season)} · ${r.result}`}>
          <span className="age-badge" style={{ background: tm?.color ?? '#334155' }}>{age}</span>
          <span className="tl-club">{tm ? <TeamBadge id={tm.id} color={tm.color} size={16} /> : <span className="tiny">{r.comp === 'NCAA' ? '🎓' : r.comp === 'EUR' ? '🌍' : '🏀'}</span>}<span>{r.teamName}</span>{r.comp !== 'NBA' && <span className="tiny dim">{r.comp === 'GLG' ? 'G League' : r.comp}</span>}{won && <span title="Campeón">💍</span>}{r.awards.filter((k) => k !== 'champion').slice(0, 2).map((k) => <span key={k} title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'}</span>)}</span>
          <span className="ovr-pill" style={{ background: ovrTone(r.ovrEnd) }}>{r.ovrEnd}</span>
          <span className="tl-num">{r.stats.gp}</span>
          <span className="tl-num">{f1(a.ppg)}</span>
          <span className="tl-num">{f1(a.rpg)}</span>
          <span className="tl-num">{f1(a.apg)}</span>
        </div>,
      );
    } else if (age === pendingAge) {
      rows.push(
        <div key={age} className="tl-row current">
          <span className="age-badge" style={{ background: '#475569' }}>{age}</span>
          <span className="tl-club">
            {t && (c.phase === 'preseason' || inSeason(c)) ? <TeamBadge id={t.id} color={t.color} size={16} /> : <span className="q">?</span>}
            <span className="dim">{pendingLabel()}</span>
          </span>
          <span className="ovr-pill" style={{ background: ovrTone(u.ovr) }}>{u.ovr}</span>
          <span className="tl-num">{live.gp || ''}</span>
          <span className="tl-num">{live.gp ? f1(la.ppg) : ''}</span>
          <span className="tl-num">{live.gp ? f1(la.rpg) : ''}</span>
          <span className="tl-num">{live.gp ? f1(la.apg) : ''}</span>
        </div>,
      );
    } else {
      rows.push(<div key={age} className="tl-row empty"><span className="age-empty">{age}</span></div>);
    }
  }
  const nba = sumStats(c.seasons.filter((s) => s.comp === 'NBA').map((s) => s.stats));
  const country = countryByCode(u.nat);
  return (
    <div className="tl">
      <div className="tl-row head">
        <span>EDAD</span><span>EQUIPO</span><span>OVR</span><span className="tl-num">PJ</span><span className="tl-num">PTS</span><span className="tl-num">REB</span><span className="tl-num">AST</span>
      </div>
      <div className="tl-body">{rows}</div>
      <div className="tl-row foot">
        <span className="age-badge" style={{ background: '#1f2937' }}>🌍</span>
        <span className="tl-club"><span>{country.name}</span>{c.flags.nationalTeam ? <span className="tiny dim">Internacional{c.flags.medal ? ' · 🥇 medalla' : ''}</span> : <span className="tiny dim">Sin convocatorias</span>}</span>
        <span />
        <span className="tl-num">{nba.gp}</span>
        <span className="tl-num" title="Puntos totales NBA">{nba.pts}</span>
        <span className="tl-num">{nba.oreb + nba.dreb}</span>
        <span className="tl-num">{nba.ast}</span>
      </div>
      <p className="tiny dim" style={{ marginTop: 6 }}>Promedios por temporada (PTS/REB/AST por partido). La última fila suma tus totales NBA. Temporadas {RULES.label} en adelante.</p>
    </div>
  );
}
