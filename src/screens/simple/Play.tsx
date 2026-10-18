import { Children, useEffect, type ReactNode } from 'react';
import { LEGACY_TIERS, legacyScore } from '../../engine/legacy';
import { challengeOf } from '../../engine/challenges';
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
import { careerHistory, store, useCareer, useStore } from '../../store/store';
import { EventModalInline } from './EventInline';
import { TeamBadge, ovrTone } from '../../ui/simple';
import { OvrTile, SimProgress } from '../../ui/life';
import { drawCard } from '../../ui/card';
import { Scene, type SceneKind } from '../../ui/Scene';
import { Icon } from '../../ui/icons';
import { Flag } from '../../ui/Flag';
import { findClub } from '../../data/clubs';
import { ClubLogo } from '../../ui/ClubLogo';

const num = (n: number) => Math.round(n).toLocaleString('es-ES');

/** "541 puntos · 140 rebotes · 82 asistencias en 82 partidos" for a finished season. */
function seasonTotals(c: Career, season: number): string {
  const recs = c.seasons.filter((r) => r.season === season && r.stats.gp > 0);
  const r = recs.find((x) => x.comp === 'NBA') ?? recs[0];
  if (!r) return '';
  const st = r.stats;
  return `${num(st.pts)} puntos · ${num(st.oreb + st.dreb)} rebotes · ${num(st.ast)} asistencias en ${st.gp} partidos`;
}

const AWARD_ICON: Record<string, string> = { champion: '💍', mvp: '👑', fmvp: '🥇', dpoy: '🛡️', roy: '🌱', smoy: '🔋', mip: '📈', allStar: '⭐', allNba1: '🏅', allNba2: '🏅', allNba3: '🏅', allDef1: '🧱', allDef2: '🧱', threeContest: '🎯', euroChampion: '🏆', euroMvp: '🌟' };

export function Play() {
  const c = useCareer();
  const busy = useStore((s) => s.busy);
  const sim = useStore((s) => s.sim);
  const toasts = useStore((s) => s.toasts);
  // Phones: the timeline grows above the decision, so bring each new decision (or the live sim) into view.
  const decisionKey = c ? `${c.id}|${c.phase}|${c.league.season}|${c.predraft?.step}|${c.pendingEvent?.defId}|${!!c.pendingEvent?.resolved}|${c.offers.length}|${!!sim}` : '';
  useEffect(() => {
    if (!decisionKey || !window.matchMedia('(max-width: 560px)').matches) return;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('.play-left > .decision');
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight - 160 || r.bottom < 0) window.scrollTo({ top: window.scrollY + r.top - 12, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [decisionKey]);
  if (!c) return <div className="simple-wrap"><div className="simple-panel"><p className="muted">No hay carrera activa. <Link to="/start" className="accent">Crear una</Link></p></div></div>;
  return (
    <div className="simple-wrap">
      <div className="play-grid anim-in">
        <div className="play-left">
          <TopCard c={c} />
          <div className="divider" style={{ margin: '18px 0' }} />
          {sim ? <SimProgress c={c} label={sim} /> : <Decision c={c} />}
        </div>
        <div className="play-right">
          <Timeline c={c} />
        </div>
      </div>
      <div className="play-tools">
        <Link to="/careers" className="btn sm ghost"><Icon name="trophy" /> Mis carreras</Link>
        {c.phase !== 'retired' && <Link to="/start" className="btn sm ghost"><Icon name="history" /> Reiniciar</Link>}
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
  // Only finished seasons: results stay hidden until the season is over.
  const tot = sumStats(c.seasons.filter((s) => s.comp !== 'NCAA').map((s) => s.stats));
  const a = averages(tot);
  const awards: Record<string, number> = {};
  for (const s of c.seasons) for (const k of s.awards) awards[k] = (awards[k] ?? 0) + 1;
  const clubLabel = t ? teamName(c.league, t.id) : c.satellite?.teamName ?? (c.phase === 'signing' ? 'Agente libre' : c.predraft?.clubName || 'Libre');
  return (
    <>
      <div className="top-card">
        <OvrTile ovr={u.ovr} />
        <div className="id-box" style={{ ['--team' as string]: t?.color ?? '#334155' }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="chip"><Flag code={u.nat} size={18} /> {u.nat}</span>
            <span className="chip accent">#{c.profile.number} {u.pos}</span>
            <span className="tiny dim">POT {u.pot}</span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 6, minWidth: 0 }}>
            {t ? <TeamBadge id={t.id} color={t.color} size={26} /> : c.satellite ? <ClubLogo name={c.satellite.teamName} size={26} /> : null}
            <strong className="club">{clubLabel}</strong>
          </div>
          <div className="id-side">
            <div><small>EDAD</small><b>{u.age}</b></div>
            <div><small>VALOR</small><b>{fmtMoney(marketValue(u, c.league.season))}</b></div>
          </div>
        </div>
      </div>
      <div className="tot-row">
        <div title={`${f1(a.ppg)} / ${f1(a.rpg)} / ${f1(a.apg)} por partido`}><small>PARTIDOS</small><b>{num(tot.gp)}</b></div>
        <div><small>PUNTOS</small><b>{num(tot.pts)}</b></div>
        <div><small>REBOTES</small><b>{num(tot.oreb + tot.dreb)}</b></div>
        <div><small>ASISTENCIAS</small><b>{num(tot.ast)}</b></div>
      </div>
      <div className={`vitrina ${Object.keys(awards).length ? '' : 'empty'}`}>
        {Object.keys(awards).length === 0 ? (
          <><span style={{ fontSize: '1.3rem', opacity: 0.5 }}>🏆</span><span className="tiny dim">VITRINA VACÍA</span></>
        ) : (
          <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
            {Object.entries(awards).sort((x, y) => y[1] - x[1]).map(([k, n]) => <span key={k} className="chip gold" title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'} {n > 1 ? `${n}× ` : ''}{AWARD_LABEL[k] ?? k}</span>)}
          </div>
        )}
      </div>
      <LegacyMeter c={c} />
    </>
  );
}

const TIERS: [number, string][] = [[0, 'Debutante'], [LEGACY_TIERS.role, 'Jugador de rol'], [LEGACY_TIERS.solid, 'Jugador sólido'], [LEGACY_TIERS.star, 'Estrella'], [LEGACY_TIERS.hof, 'Hall of Fame'], [LEGACY_TIERS.legend, 'Leyenda']];

/** Long-term goal: progress of the legacy score towards the next tier. */
function LegacyMeter({ c }: { c: Career }) {
  const score = legacyScore(c);
  const idx = TIERS.reduce((acc, t, i) => (score >= t[0] ? i : acc), 0);
  const cur = TIERS[idx];
  const next = TIERS[idx + 1];
  const pct = next ? ((score - cur[0]) / (next[0] - cur[0])) * 100 : 100;
  // The best finished career is the target to beat.
  const best = Math.max(0, ...careerHistory().filter((h) => h.id !== c.id).map((h) => h.legacyScore));
  return (
    <div className="legacy" title="Legacy Score: producción, premios, anillos y longevidad">
      <div className="row between tiny"><span><b>Legado</b> · {cur[1]}</span><span className="dim">{next ? `${score} / ${next[0]} → ${next[1]}` : `${score} · nivel máximo`}</span></div>
      <div className="legacy-bar"><span style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} /></div>
      <ChallengeLine c={c} />
      {best > 0 && c.phase !== 'retired' && (
        <div className={`legacy-best tiny ${score > best ? 'gold' : 'dim'}`}>{score > best ? `🔥 Superando tu récord (${best})` : `Tu récord: ${best} · te faltan ${best - score}`}</div>
      )}
    </div>
  );
}

/** The career's random goal and how close it is. */
function ChallengeLine({ c }: { c: Career }) {
  const ch = challengeOf(c);
  const [v, target] = ch.progress(c);
  const done = v >= target;
  return (
    <div className={`challenge tiny ${done ? 'done' : ''}`}>
      <span>{done ? '✅' : c.phase === 'retired' ? '❌' : '🎯'} <b>Reto:</b> {ch.label}</span>
      <span className="dim">{done ? '¡Cumplido!' : c.phase === 'retired' ? 'No cumplido' : target > 1 ? `${Math.min(v, target).toLocaleString('es-ES')} / ${target.toLocaleString('es-ES')}` : 'Pendiente'}</span>
    </div>
  );
}

/** New personal bests set in a given season, as short lines. */
function seasonRecords(c: Career, season: number): string[] {
  const label: Record<string, string> = { pts: 'puntos', reb: 'rebotes', ast: 'asistencias', stl: 'robos', blk: 'tapones', tpm: 'triples' };
  return Object.entries(c.highs).filter(([, h]) => h && h.season === season).map(([k, h]) => `${h!.value} ${label[k] ?? k}`);
}

// ---------------- Decisions ----------------

function Choice({ title, top, icon, scene, children, onClick, tone }: { title: string; top?: string; icon?: ReactNode; scene?: SceneKind; children?: ReactNode; onClick: () => void; tone?: 'stay' | 'danger' | 'primary' }) {
  return (
    <button className={`choice ${tone ?? ''} ${scene ? 'with-img' : ''}`} onClick={onClick}>
      {scene && <Scene kind={scene} variant={title} height={96} still className="choice-img" />}
      {top && <span className="tiny dim">{top}</span>}
      <b className="choice-title">{title}</b>
      {icon && <span className="choice-icon">{icon}</span>}
      {children && <span className="choice-body">{children}</span>}
    </button>
  );
}

function Block({ title, desc, scene, children }: { title: string; desc?: ReactNode; scene: SceneKind; children: ReactNode }) {
  // Many options (e.g. a busy transfer market): slim banner and compact cards so all fit on screen.
  const compact = Children.toArray(children).filter(Boolean).length > 3;
  return (
    <div className={`decision anim-in ${compact ? 'is-compact' : ''}`} key={title}>
      <Scene kind={scene} variant={title} height={compact ? 84 : 170}><h2>{title}</h2></Scene>
      {desc && <p className="small muted desc">{desc}</p>}
      <div className={`choices ${compact ? 'compact' : ''}`}>{children}</div>
    </div>
  );
}

function OfferChoice({ c, o, onPick, top = 'Firmar con' }: { c: Career; o: Offer; onPick: () => void; top?: string }) {
  const t = c.league.teams[o.teamId];
  const total = makeSalaries(o.salary, o.years, o.raise).reduce((s, v) => s + v, 0);
  const club = o.club ? findClub(o.club) : undefined;
  const name = t ? `${t.city} ${t.name}` : club ? club.name : 'Extranjero';
  return (
    <Choice top={o.id === 'opt-player' ? 'Ejercer opción' : o.id.startsWith('ext-') ? 'Extender con' : o.note.startsWith('Renovar') ? 'Renovar con' : o.id.startsWith('eu-stay') ? 'Seguir en' : top} title={name} onClick={onPick} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : club ? <span className="club-crest"><ClubLogo name={club.name} size={50} /><small>{club.league}</small></span> : <span style={{ fontSize: '2.6rem' }}>🌍</span>}>
      <span className="choice-meta">{fmtMoney(o.salary)}{o.years > 1 ? ` · ${o.years} años (${fmtMoney(total)})` : ` · ${o.kind === 'two-way' ? 'two-way' : o.kind === 'gleague' ? 'G League' : '1 año'}`}</span>
      <span className="choice-meta dim">{o.role}{t ? ` · ${t.w + t.l ? `${t.w}-${t.l}` : t.status === 'contender' ? 'aspirante' : t.status === 'rebuild' ? 'reconstrucción' : 'zona media'}` : ''}</span>
    </Choice>
  );
}

function Decision({ c }: { c: Career }) {
  const u = userOf(c);
  const t = teamOf(c);
  if (c.pendingEvent) return <EventModalInline c={c} />;
  const sim = (label: string, fn: (x: Career) => void) => store.actAsync(label, fn);
  /** Apply an action, then keep simulating (visibly, in slices) until the next real decision. */
  const go = (label: string, fn?: (x: Career) => void) => store.actLive(label, api.runChunk, fn);

  switch (c.phase) {
    case 'predraft': {
      const p = c.predraft!;
      if (p.step === 'club' && p.clubChoices) {
        const country = countryByCode(u.nat).name;
        const ncaa = p.clubChoices[0]?.comp === 'NCAA';
        return (
          <Block scene={ncaa ? 'college' : 'contract'} title="Elige tu primer club" desc={ncaa ? 'Tres universidades te ofrecen una beca. Elige dónde empieza tu carrera.' : `Tres clubes quieren ficharte${p.clubChoices.some((x) => findClub(x.name)?.country === u.nat) ? ` en ${country}` : ''}. Elige dónde empieza tu carrera.`}>
            {p.clubChoices.map((x) => {
              const club = findClub(x.name);
              return (
                <Choice key={x.name} top={club?.league ?? (ncaa ? 'NCAA' : '')} title={x.name} icon={<span className="club-crest"><ClubLogo name={x.name} size={52} /><small>{club ? '★'.repeat(4 - club.tier) : ''}</small></span>} onClick={() => store.act((y) => api.chooseStartingClub(y, x.name))}>
                  {club?.tier === 1 ? 'Gigante: más victorias, menos minutos.' : club?.tier === 2 ? 'Equilibrado: nivel y minutos.' : 'Modesto: el balón será tuyo.'}
                </Choice>
              );
            })}
          </Block>
        );
      }
      if (p.step === 'season') {
        const s = c.satellite!;
        const comp = SATELLITES[s.comp as 'NCAA' | 'EUR'];
        return (
          <Block scene={s.comp === 'NCAA' ? 'college' : 'europe'} title={`Temporada en ${s.teamName}`} desc={`${s.league ?? comp.name}. Los ojeadores NBA miran cada partido; la liga NBA se juega en paralelo y decidirá el orden del draft.`}>
            <Choice top="Jugar" title="La temporada completa" scene="arena" onClick={() => go('Jugando la temporada…')}>Se detiene si surge una decisión.</Choice>
          </Block>
        );
      }
      if (p.step === 'decision') {
        const canReturn = u.age <= 21 && p.seasonsPlayed < 3;
        return (
          <Block scene={'draft'} title="¿Te declaras para el draft?" desc={c.lastSummary ? seasonTotals(c, c.lastSummary.season) : undefined}>
            <Choice top="Dar el salto" title="Declararme" scene="draft" onClick={() => store.act((x) => api.predraftDecision(x, true))}>Combine, entrevistas y draft.</Choice>
            <Choice top="Sin NBA" title={p.route === 'college' ? 'Jugar en el extranjero' : 'Carrera en Europa'} scene="europe" tone="stay" onClick={() => go('Mercado de clubes…', api.chooseEuroCareer)}>Clubes, títulos y la puerta de la NBA abierta.</Choice>
            {canReturn && <Choice top="Esperar" title="Otra temporada" scene="college" tone="stay" onClick={() => go('Jugando otra temporada…', (x) => api.predraftDecision(x, false))}>Mejorar tu cotización.</Choice>}
          </Block>
        );
      }
      if (p.step === 'combine') {
        return (
          <Block scene={'training'} title="Draft Combine" desc="Las franquicias miden velocidad, salto, agilidad y tiro.">
            <Choice top="Riesgo alto" title="Participar en todo" scene="clutch" onClick={() => store.act((x) => api.doCombine(x, 'full'))}>Puede subirte… o bajarte.</Choice>
            <Choice top="Prudente" title="Solo medidas" scene="training" onClick={() => store.act((x) => api.doCombine(x, 'measure'))}>Leve penalización.</Choice>
            <Choice top="Confianza" title="No acudir" scene="rest" onClick={() => store.act((x) => api.doCombine(x, 'skip'))}>Los equipos lo notarán.</Choice>
          </Block>
        );
      }
      if (p.step === 'interviews' && p.interviewQuestions) {
        const i = p.interviews.length;
        const q = p.interviewQuestions[i];
        return (
          <Block scene={'press'} title={`Entrevista con ${teamName(c.league, q.teamId)}`} desc={`«${q.question}»`}>
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
          <Block scene={'draft'} title={`Mock draft: picks ${p.mock.pickLow}–${p.mock.pickHigh}`} desc={p.mock.text}>
            <Choice top="La gran noche" title="Noche del draft" scene="draft" onClick={() => sim('Lotería y draft…', draftNight)}>Lotería 3-2-1 y dos rondas.</Choice>
          </Block>
        );
      }
      return null;
    }
    case 'signing': {
      const pk = c.predraft?.userPick;
      return (
        <Block scene={'contract'} title={pk ? `Pick ${pk.pick} · ${teamName(c.league, pk.teamId)}` : 'Busca tu oportunidad'} desc={pk ? (pk.round === 1 ? 'Primera ronda: contrato de escala de novato.' : 'Segunda ronda: estándar o two-way.') : 'Nadie te eligió en el draft. Elige tu camino.'}>
          {c.offers.map((o) => <OfferChoice key={o.id} c={c} o={o} onPick={() => go('Primera temporada…', (x) => api.acceptOffer(x, o.id))} />)}
        </Block>
      );
    }
    case 'preseason':
    case 'regular':
    case 'postseason': {
      const where = t && c.assignment === 'NBA' ? teamName(c.league, t.id) : c.satellite?.teamName ?? (t ? t.gLeagueName : 'Europa');
      return (
        <Block scene={c.phase === 'postseason' ? 'trophy' : 'arena'} title={`Temporada ${seasonLabel(c.league.season)}`} desc={`${where} · ${c.phase === 'postseason' ? 'Postemporada en curso' : c.phase === 'preseason' ? 'Pretemporada' : 'Temporada en curso'}${u.injury ? ` · 🩹 ${u.injury.name} (${u.injury.daysLeft} días)` : ''}`}>
          <Choice top="Simular" title={c.phase === 'postseason' ? 'Los playoffs' : 'La temporada'} scene="arena" onClick={() => go('Simulando…')}>Se detiene si surge una decisión.</Choice>
        </Block>
      );
    }
    case 'season-end': {
      const s = c.lastSummary!;
      return (
        <Block scene={s.awards.length ? 'trophy' : 'arena'} title={`Fin de temporada ${seasonLabel(s.season)}`} desc={<>{s.teamResult}<br />{seasonTotals(c, s.season)} · OVR {s.ovrDelta >= 0 ? '+' : ''}{s.ovrDelta}{s.awards.length ? <><br /><span className="gold">🏆 {s.awards.join(' · ')}</span></> : null}{s.highlights[0] && !s.highlights[0].startsWith('Campeón') ? <><br /><span>⭐ Mejor partido: {s.highlights[0]}</span></> : null}{seasonRecords(c, s.season).length ? <><br /><span className="accent">🔥 Récord personal: {seasonRecords(c, s.season).join(' · ')}</span></> : null}</>}>
          <Choice top="Continuar" title="Siguiente temporada" scene="summer" onClick={() => go('Verano y nueva temporada…', api.beginOffseason)}>Solo se detiene si hay algo que decidir.</Choice>
        </Block>
      );
    }
    case 'offseason': {
      const needs = api.needsContract(c);
      const canRetire = u.age >= 30 || (needs && c.offers.length === 0);
      const accept = (id: string) => go('Nueva temporada…', (x) => { api.acceptOffer(x, id); x.offers = []; });
      return (
        <Block scene={needs ? 'contract' : 'summer'} title={needs ? 'Mercado de fichajes' : c.offers.length ? 'Propuestas sobre la mesa' : `Verano · ${u.age} años`} desc={needs ? (c.offers.length ? (c.flags.euroCareer ? 'Estos clubes te quieren la próxima temporada.' : 'Tu contrato terminó. Elige tu próximo destino.') : 'Nadie te ha hecho una oferta.') : `OVR ${u.ovr} · bajo contrato con ${teamName(c.league, u.teamId)}.`}>
          {c.offers.map((o) => <OfferChoice key={o.id} c={c} o={o} onPick={() => accept(o.id)} />)}
          {!needs && !c.offers.some((o) => o.id === 'opt-player') && (c.offers.some((o) => o.id.startsWith('ext-'))
            // The extension already shows this team: the alternative is just keeping the current deal, not a second offer from it.
            ? <Choice top="Sin firmar nada" title="Rechazar la extensión" icon="📝" tone="stay" onClick={() => go('Nueva temporada…', (x) => { x.offers = []; })}>Cumples el contrato que ya tienes.</Choice>
            : <Choice top="Quedarse en" title={t ? teamName(c.league, t.id) : 'tu equipo'} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : '🏠'} tone="stay" onClick={() => go('Nueva temporada…', (x) => { x.offers = []; })}>Seguir con tu contrato.</Choice>)}
          {canRetire && <Choice top="Colgar las botas" title="Retirarse" scene="trophy" tone="danger" onClick={() => { if (confirm('¿Anunciar la retirada?')) store.act((x) => api.retire(x, 'Retirada voluntaria.')); }}>Fin de la carrera.</Choice>}
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
  // Where this career lands among the finished ones (it is already in the history once retired).
  const others = careerHistory().filter((h) => h.id !== c.id).map((h) => h.legacyScore);
  const rank = { pos: others.filter((x) => x > r.legacyScore).length + 1, total: others.length + 1, best: Math.max(0, ...others), record: others.length > 0 && r.legacyScore > Math.max(...others) };
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
      <Scene kind="trophy" height={170}><h2>{r.tier}</h2></Scene>
      <p className="small muted desc">Retirado a los {r.age} · Legacy Score <b className="accent">{r.legacyScore}</b> · Hall of Fame {Math.round(r.hofProbability * 100)}% · {fmtMoney(r.earnings)} ganados</p>
      {rank.total > 1 && (
        <p className={`career-rank-line ${rank.record ? 'record' : ''}`}>
          {rank.record ? `🏆 ¡Nuevo récord personal! Tu mejor carrera de ${rank.total}` : `Puesto #${rank.pos} de tus ${rank.total} carreras · récord ${rank.best}`}
        </p>
      )}
      <div className="choices">
        <Choice top="Otra vez" title="Jugar otra carrera" scene="arena" tone="primary" onClick={() => nav('/start')} />
        <Choice top="Comparar" title="Mis carreras" scene="trophy" onClick={() => nav('/careers')} />
        <Choice top="Presumir" title="Compartir" scene="phone" onClick={share} />
        <Choice top="Tarjeta final" title="Descargar PNG" scene="trophy" onClick={download} />
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
    if (c.phase === 'predraft') return c.predraft?.clubName || 'Eligiendo club…';
    if (c.phase === 'signing') return 'Eligiendo equipo…';
    if (c.phase === 'season-end' || (c.phase === 'offseason' && api.needsContract(c))) return 'Eligiendo club…';
    if (t) return teamName(c.league, t.id);
    return c.satellite?.teamName ?? 'Decisión de carrera…';
  };
  const rows: ReactNode[] = [];
  // Phones hide the far-off empty years so the decision stays within reach.
  const lastAge = Math.max(pendingAge ?? 0, ...byAge.keys());
  for (let age = startAge; age <= endAge; age++) {
    const r = byAge.get(age);
    if (r) {
      const a = averages(r.stats);
      const tm = r.teamId ? c.league.teams[r.teamId] : null;
      const won = r.awards.includes('champion');
      rows.push(
        <div key={age} className="tl-row in" style={{ animationDelay: `${Math.min(12, age - startAge) * 45}ms` }} title={`${seasonLabel(r.season)} · ${r.result}`}>
          <span className="age-badge" style={{ background: tm?.color ?? '#334155' }}>{age}</span>
          <span className="tl-club">{tm && r.comp === 'NBA' ? <TeamBadge id={tm.id} color={tm.color} size={16} /> : r.comp === 'GLG' ? <span className="tiny">🏀</span> : <ClubLogo name={r.teamName} size={16} />}<span>{r.teamName}</span>{r.comp !== 'NBA' && <span className="tiny dim">{r.comp === 'GLG' ? 'G League' : r.comp === 'EUR' ? findClub(r.teamName)?.league ?? 'Internacional' : 'NCAA'}</span>}{won && <span title="Campeón">💍</span>}{r.awards.filter((k) => k !== 'champion').slice(0, 2).map((k) => <span key={k} title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'}</span>)}</span>
          <span className={`ovr-pill ${r.ovrEnd >= 80 ? 'gold' : ''}`} style={{ background: ovrTone(r.ovrEnd) }}>{r.ovrEnd}</span>
          <span className="tl-num">{r.stats.gp}</span>
          <span className="tl-num" title={`${f1(a.ppg)} por partido`}>{num(r.stats.pts)}</span>
          <span className="tl-num" title={`${f1(a.rpg)} por partido`}>{num(r.stats.oreb + r.stats.dreb)}</span>
          <span className="tl-num" title={`${f1(a.apg)} por partido`}>{num(r.stats.ast)}</span>
        </div>,
      );
    } else if (age === pendingAge) {
      rows.push(
        <div key={age} className="tl-row current">
          <span className="age-badge" style={{ background: '#475569' }}>{age}</span>
          <span className="tl-club">
            {t && (c.phase === 'preseason' || inSeason(c)) ? <TeamBadge id={t.id} color={t.color} size={16} /> : c.satellite ? <ClubLogo name={c.satellite.teamName} size={16} /> : <span className="q">?</span>}
            <span className="dim">{pendingLabel()}</span>
          </span>
          <span className={`ovr-pill ${u.ovr >= 80 ? 'gold' : ''}`} style={{ background: ovrTone(u.ovr) }}>{u.ovr}</span>
          <span className="tl-live" style={{ gridColumn: 'span 4' }}>{inSeason(c) ? 'Temporada en curso' : ''}</span>
        </div>,
      );
    } else {
      rows.push(<div key={age} className={`tl-row empty ${age > lastAge + 4 ? 'far' : ''}`}><span className="age-empty">{age}</span></div>);
    }
  }
  const nba = sumStats(c.seasons.filter((s) => s.comp === 'NBA').map((s) => s.stats));
  const abroad = sumStats(c.seasons.filter((s) => s.comp === 'EUR').map((s) => s.stats));
  const country = countryByCode(u.nat);
  return (
    <div className="tl">
      <div className="tl-row head">
        <span>EDAD</span><span>EQUIPO</span><span>OVR</span><span className="tl-num">PJ</span><span className="tl-num">PTS</span><span className="tl-num">REB</span><span className="tl-num">AST</span>
      </div>
      <div className="tl-body">{rows}</div>
      <div className="tl-row foot">
        <span className="age-badge" style={{ background: '#1f2937' }}>Σ</span>
        <span className="tl-club"><span>Total carrera NBA</span></span>
        <span />
        <span className="tl-num">{num(nba.gp)}</span>
        <span className="tl-num">{num(nba.pts)}</span>
        <span className="tl-num">{num(nba.oreb + nba.dreb)}</span>
        <span className="tl-num">{num(nba.ast)}</span>
      </div>
      {abroad.gp > 0 && (
        <div className="tl-row foot" style={{ marginTop: 2 }}>
          <span className="age-badge" style={{ background: '#1f2937' }}>🌍</span>
          <span className="tl-club"><span>Total fuera de la NBA</span></span>
          <span />
          <span className="tl-num">{num(abroad.gp)}</span>
          <span className="tl-num">{num(abroad.pts)}</span>
          <span className="tl-num">{num(abroad.oreb + abroad.dreb)}</span>
          <span className="tl-num">{num(abroad.ast)}</span>
        </div>
      )}
      <div className="nat-row">
        <Flag code={u.nat} size={22} />
        <span><b>Selección de {country.name}</b> · {c.flags.nationalCaps ? `${c.flags.nationalCaps} convocatoria${c.flags.nationalCaps > 1 ? 's' : ''}` : c.flags.nationalTeam ? 'Internacional' : 'Aún sin convocatorias'}{c.flags.medals ? ` · 🥇 ${c.flags.medals} medalla${c.flags.medals > 1 ? 's' : ''}` : ''}</span>
      </div>
      <p className="tiny dim tl-hint" style={{ marginTop: 6 }}>Totales de cada temporada (pasa el ratón para ver la media por partido). Temporadas {RULES.label} en adelante.</p>
    </div>
  );
}
