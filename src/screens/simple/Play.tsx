import { Children, memo, useEffect, useState, type ReactNode } from 'react';
import { LEGACY_TIERS, legacyScore } from '../../engine/legacy';
import { ACHIEVEMENTS } from '../../engine/achievements';
import { challengeDone, challengeOf } from '../../engine/challenges';
import { Link, useNavigate } from 'react-router-dom';
import type { Career, Offer, SeasonRecord, SeasonSummary } from '../../engine/types';
import * as api from '../../engine/api';
import { teamOf, userOf } from '../../engine/career';
import { inSeason } from '../../engine/flow';
import { DRAFT_RULES } from '../../engine/config';
import { championOf, teamName } from '../../engine/league';
import { averages, f1, sumStats } from '../../engine/stats';
import { shownValue, fmtMoney, makeSalaries } from '../../engine/contracts';
import { agentCut, cashOf, fameSponsor, performancePct, startingSalary } from '../../engine/mindset';
import { AWARD_LABEL } from '../../engine/awards';
import { SATELLITES } from '../../engine/satellite';
import { seasonLabel } from '../../engine/schedule';
import { countryByCode } from '../../content/names';
import { annualUpkeep, financeOf, financeOn, lifestyleCost, netWorth } from '../../engine/finance';
import { assetById } from '../../content/assets';
import { careerHistory, store, useCareer, useStore } from '../../store/store';
import { EventModalInline } from './EventInline';
import { TeamBadge, ovrClass, ovrTone } from '../../ui/simple';
import { OvrTile, SimProgress, useCountUp } from '../../ui/life';
import { downloadPNG } from "../../ui/download";
import { Scene, type SceneKind } from '../../ui/Scene';
import { Icon, type IconName } from '../../ui/icons';
import { Flag } from '../../ui/Flag';
import { findClub } from '../../data/clubs';
import { ClubLogo } from '../../ui/ClubLogo';
import { LangSwitch } from '../../ui/LangSwitch';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { Minigame } from '../../ui/Minigame';
import { MINIGAME_TIER_LABEL } from '../../content/minigames';

const num = (n: number) => Math.round(n).toLocaleString('es-ES');

const AWARD_ICON: Record<string, string> = { champion: '💍', mvp: '👑', fmvp: '🥇', dpoy: '🛡️', roy: '🌱', smoy: '🔋', mip: '📈', allStar: '⭐', allNba1: '🏅', allNba2: '🏅', allNba3: '🏅', allDef1: '🧱', allDef2: '🧱', threeContest: '🎯', euroChampion: '🏆', euroMvp: '🌟', nationalMedal: '🥇' };
const AWARD_ICON_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(AWARD_LABEL).map(([id, label]) => [label, AWARD_ICON[id] ?? '🏆']),
);

export function Play() {
  const c = useCareer();
  const busy = useStore((s) => s.busy);
  const sim = useStore((s) => s.sim);
  const toasts = useStore((s) => s.toasts);
  // Phones: the timeline grows above the decision, so bring each new decision (or the live sim) into view.
  const decisionKey = c ? `${c.id}|${c.phase}|${c.league.season}|${c.predraft?.step}|${c.pendingEvent?.defId}|${!!c.pendingEvent?.resolved}|${c.offers.length}|${!!sim}` : '';
  useEffect(() => {
    if (!decisionKey || !window.matchMedia('(max-width: 960px)').matches) return;
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
          <MemoTopCard c={c} sig={viewSig(c)} />
          <div className="divider" style={{ margin: '12px 0' }} />
          {sim ? <SimProgress c={c} label={sim} /> : <Decision c={c} />}
          {!sim && <SeasonRecap c={c} />}
          {!sim && <DraftGatePopup c={c} />}
          {!sim && <UndraftedPopup c={c} />}
        </div>
        <div className="play-right">
          <MemoTimeline c={c} sig={viewSig(c)} />
        </div>
      </div>
      <div className="play-tools">
        <Link to="/careers" className="btn sm ghost"><Icon name="trophy" /> Mis carreras</Link>
        <LangSwitch />
        {c.phase !== 'retired' && <Link to="/start" className="btn sm ghost"><Icon name="history" /> Reiniciar</Link>}
      </div>
      {busy && <div className="busy" role="status" aria-live="polite"><div className="stack" style={{ alignItems: 'center', gap: 18 }}><div className="ball" /><span className="muted">{busy}</span></div></div>}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </div>
  );
}

/**
 * Everything the card and the timeline display. During a live simulation most slices change none of it,
 * so those (large) parts skip re-rendering — that redraw was most of the per-frame cost on phones.
 */
function viewSig(c: Career): string {
  const u = userOf(c);
  return [c.id, c.phase, c.seasons.length, c.ovrHistory.length, u.ovr, u.pot, u.age, u.teamId, u.injury?.daysLeft ?? '', c.satellite?.teamName ?? '', c.predraft?.clubName ?? '', c.predraft?.step ?? '', c.league.season, c.league.day > 0, c.offers.length, c.retirement ? 1 : 0, c.flags.challenge ?? '', c.flags.nationalCaps ?? 0, c.flags.medals ?? 0, Math.round(c.morale), Math.round(c.chemistry), Math.round(c.trust), Math.round(c.pressure), Math.round(c.fame), Math.round(c.reputation), Math.round(c.loyalty), Math.round(c.workEthic), Math.round(u.form), Math.round(u.fatigue / 5), cashOf(c), c.endorsement, u.contract?.startSeason ?? '', u.contract?.salaries.length ?? '', c.finance?.debt ?? 0, c.finance?.assets.length ?? 0, c.finance?.credit ?? 0, c.finance?.ruined ? 1 : 0, c.flags.cut ?? 0, c.flags.demoted ?? 0].join('|');
}
// The signature is computed when rendering and passed as a prop: actions mutate the career in place, so
// recomputing it from the previous props object would already see the new state and skip needed renders.
const sameView = (a: { sig: string }, b: { sig: string }) => a.sig === b.sig;
const MemoTopCard = memo(({ c }: { c: Career; sig: string }) => <TopCard c={c} />, sameView);
const MemoTimeline = memo(({ c }: { c: Career; sig: string }) => <Timeline c={c} />, sameView);

function FinanceLine({ c }: { c: Career }) {
  if (!financeOn(c)) return null;
  const u = userOf(c);
  const f = financeOf(c);
  const professional = !(c.predraft?.step === 'season') && (!!u.contract || (c.flags.overseasSalary ?? 0) > 0);
  const expenses = annualUpkeep(c, c.league.season) + lifestyleCost(c, c.league.season, professional);
  const assets = f.assets.map((a) => assetById(a.id)).filter((a): a is NonNullable<typeof a> => !!a);
  return (
    <div className={`finance-line ${f.debt > 0 ? 'in-debt' : ''}`} title={`Patrimonio neto: ${fmtMoney(netWorth(c))}`}>
      <span>Gastos fijos <b>{fmtMoney(expenses)}/año</b></span>
      <span>Deuda <b>{fmtMoney(f.debt)}</b></span>
      <span>Crédito <b>{Math.round(f.credit)}</b></span>
      {assets.length > 0 && (
        <span className="finance-assets">
          {assets.map((a) => <span key={a.id} className="chip"><span>{a.icon}</span> {a.short}</span>)}
        </span>
      )}
      {f.ruined && <span className="chip bad">En ruina</span>}
      {c.flags.cut ? <span className="chip bad">Cortado</span> : c.flags.demoted ? <span className="chip bad">En el mercado</span> : null}
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
          <strong className="player-name">{u.first} {u.last}</strong>
          <div className="row club-row">
            {t ? <TeamBadge id={t.id} color={t.color} size={22} /> : c.satellite ? <ClubLogo name={c.satellite.teamName} size={22} /> : null}
            <span className="club">{clubLabel}</span>
          </div>
        </div>
      </div>
      {/* Age, value and money get a row of their own: on phones they used to squeeze the club name. */}
      <div className="id-stats">
        <div><small>Edad</small><b>{u.age}</b></div>
        <div title="Sube poco a poco con tu experiencia y tu rendimiento"><small>Valor</small><b>{fmtMoney(shownValue(c, u))}</b></div>
        <div title="Tu dinero: cobras al final de cada temporada y pagas los gastos de tus decisiones"><small>Dinero</small><b className="cash">{fmtMoney(cashOf(c))}</b></div>
      </div>
      <FinanceLine c={c} />
      <CardTabs c={c} awards={awards} totals={
        <div className="tot-row">
          <div title={`${f1(a.ppg)} / ${f1(a.rpg)} / ${f1(a.apg)} por partido`}><small>PARTIDOS</small><b>{num(tot.gp)}</b></div>
          <div><small>PUNTOS</small><b>{num(tot.pts)}</b></div>
          <div><small>REBOTES</small><b>{num(tot.oreb + tot.dreb)}</b></div>
          <div><small>ASISTENCIAS</small><b>{num(tot.ast)}</b></div>
        </div>
      } />
    </>
  );
}

type CardTab = 'legacy' | 'goal' | 'trophies' | 'state';

/**
 * Secondary info (legacy, challenge, trophies, state) folds into four small tabs: one line by default,
 * one panel at a time when tapped, so the decision stays on screen without scrolling.
 */
function CardTabs({ c, awards, totals }: { c: Career; awards: Record<string, number>; totals: ReactNode }) {
  const [tab, setTab] = useState<CardTab | null>(() => { try { return (localStorage.getItem('nbalegacy:cardTab') as CardTab) || null; } catch { return null; } });
  const pick = (t: CardTab) => setTab((v) => {
    const next = v === t ? null : t;
    try { localStorage.setItem('nbalegacy:cardTab', next ?? ''); } catch { /* private mode */ }
    return next;
  });
  const score = legacyScore(c);
  const tier = TIERS.reduce((acc, t) => (score >= t[0] ? t : acc), TIERS[0])[1];
  const ch = challengeOf(c);
  const [v, target] = ch.progress(c);
  const perf = performancePct(c, userOf(c));
  const medals = c.flags.medals ?? 0;
  const trophies = Object.values(awards).reduce((x, y) => x + y, 0) + medals;
  const tabs: { id: CardTab; icon: string; label: string; value: ReactNode }[] = [
    { id: 'legacy', icon: '📈', label: 'Legado', value: tier },
    { id: 'goal', icon: v >= target ? '✅' : '🎯', label: 'Reto', value: v >= target ? '¡Hecho!' : target > 1 ? `${Math.min(v, target).toLocaleString('es-ES')} / ${target.toLocaleString('es-ES')}` : 'Pendiente' },
    { id: 'trophies', icon: '🏆', label: 'Vitrina', value: String(trophies) },
    { id: 'state', icon: '🧠', label: 'Estado', value: <span className={perf > 0 ? 'delta-up' : perf < 0 ? 'delta-down' : ''}>{perf > 0 ? '+' : ''}{perf} %</span> },
  ];
  return (
    <div className="card-tabs">
      <div className="card-tab-row" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`card-tab ${tab === t.id ? 'on' : ''}`} onClick={() => pick(t.id)}>
            <small>{t.icon} {t.label}</small>
            <b>{t.value}</b>
          </button>
        ))}
      </div>
      {tab === 'legacy' && <div className="card-panel anim-in"><LegacyMeter c={c} />{totals}</div>}
      {tab === 'goal' && <div className="card-panel anim-in"><ChallengeLine c={c} /></div>}
      {tab === 'trophies' && (
        <div className="card-panel anim-in">
          {trophies === 0 ? <p className="tiny dim" style={{ margin: 0, textAlign: 'center' }}>Aún no has ganado ningún trofeo.</p> : (
            <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
              {Object.entries(awards).sort((x, y) => y[1] - x[1]).map(([k, n]) => <span key={k} className="chip gold" title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'} {n > 1 ? `${n}× ` : ''}{AWARD_LABEL[k] ?? k}</span>)}
              {Array.from({ length: medals }, (_, i) => <span key={`medal-${i}`} className="chip gold" title="Medalla con la selección">🥇 Medalla</span>)}
            </div>
          )}
        </div>
      )}
      {tab === 'state' && <div className="card-panel anim-in"><StatePanel c={c} /></div>}
    </div>
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
      {best > 0 && c.phase !== 'retired' && (
        <div className={`legacy-best tiny ${score > best ? 'gold' : 'dim'}`}>{score > best ? `Superando tu récord (${best})` : `Tu récord: ${best} · te faltan ${best - score}`}</div>
      )}
    </div>
  );
}

const STATE_ROWS: { key: 'morale' | 'chemistry' | 'trust' | 'pressure' | 'fame' | 'reputation' | 'loyalty' | 'workEthic'; label: string; icon: IconName; what: string; invert?: boolean }[] = [
  { key: 'morale', label: 'Moral', icon: 'smile', what: 'Rendimiento en pista' },
  { key: 'chemistry', label: 'Química', icon: 'handshake', what: 'Rendimiento en pista' },
  { key: 'pressure', label: 'Presión', icon: 'gauge', what: 'Por encima de 55 resta rendimiento', invert: true },
  { key: 'trust', label: 'Confianza', icon: 'clipboard', what: 'Minutos que te da el entrenador' },
  { key: 'fame', label: 'Popularidad', icon: 'star', what: 'Patrocinios y votos All-Star' },
  { key: 'reputation', label: 'Reputación', icon: 'medal', what: 'Ofertas de contrato' },
  { key: 'loyalty', label: 'Lealtad', icon: 'heart', what: 'Ganas de tu equipo de renovarte' },
  { key: 'workEthic', label: 'Ética', icon: 'dumbbell', what: 'Cuánto mejoras cada verano' },
];

/** The numbers your choices move, and what each one does to your career. */
function StatePanel({ c }: { c: Career }) {
  const u = userOf(c);
  const perf = performancePct(c, u);
  const sponsor = c.endorsement + fameSponsor(c);
  return (
    <div className="state-panel">
      <div className="row between tiny">
        <b>Estado</b>
        <span className={`perf ${perf > 0 ? 'delta-up' : perf < 0 ? 'delta-down' : 'dim'}`} title="Moral, química, presión, forma y fatiga sobre tu juego">En pista {perf > 0 ? '+' : ''}{perf} %</span>
      </div>
      <div className="state-grid">
        {STATE_ROWS.map((r) => {
          const v = Math.round(c[r.key]);
          const good = r.invert ? v <= 45 : v >= 60;
          const bad = r.invert ? v >= 65 : v <= 35;
          return (
            <div key={r.key} className="state-item" title={`${r.label}: ${r.what}`}>
              <span className="state-label"><Icon name={r.icon} size={12} /> {r.label}</span>
              <span className="state-bar"><span key={v} className={good ? 'good' : bad ? 'bad' : ''} style={{ width: `${Math.max(3, v)}%` }} /></span>
              <b>{v}</b>
              <small className="state-what">{r.what}</small>
            </div>
          );
        })}
      </div>
      <p className="tiny dim state-notes">
        Patrocinios: {fmtMoney(sponsor)}/año · Comisión del agente: {Math.round(agentCut(c) * 100)} % del sueldo · Forma {u.form > 0 ? '+' : ''}{Math.round(u.form)} · Fatiga {Math.round(u.fatigue)}
      </p>
    </div>
  );
}

/** What the season paid: salary, sponsorship, assets, the agent's cut, expenses and the wallet after it. */
function MoneyLine({ m }: { m?: NonNullable<SeasonSummary['money']> }) {
  if (!m) return null;
  const expenses = (m.lifestyle ?? 0) + (m.upkeep ?? 0) + (m.interest ?? 0) + (m.payment ?? 0);
  return (
    <>
      <span className="money-line"><Icon name="coin" size={13} /> {m.salary ? `Sueldo +${fmtMoney(m.salary)}` : 'Sin sueldo'}{m.sponsor ? ` · Patrocinios +${fmtMoney(m.sponsor)}` : ''}{m.assetIncome ? ` · Activos +${fmtMoney(m.assetIncome)}` : ''}{m.agent ? ` · Agente −${fmtMoney(m.agent)}` : ''}{expenses ? ` · Gastos −${fmtMoney(expenses)}` : ''}{m.debt ? ` · Deuda ${fmtMoney(m.debt)}` : ''} → <b>{fmtMoney(m.cash)}</b></span>
      {m.sold?.length ? <span className="money-line">Vendido: {m.sold.map((id) => assetById(id)?.label ?? id).join(', ')}</span> : null}
    </>
  );
}

/** A number that counts up from zero when it appears (one decimal). */
function CountUp({ value }: { value: number }) {
  const { shown } = useCountUp(Math.round(value * 10), 1100);
  return <>{(shown / 10).toFixed(1)}</>;
}

/**
 * End-of-season celebration: the numbers count up and every trophy of the season pops in, one by one.
 * After a summer with a national-team medal, the medal gets its own moment. Each shows once.
 */
function ChampionLine({ c, season, size = 16, className = '' }: { c: Career; season: number; size?: number; className?: string }) {
  const champ = championOf(c.league, season);
  if (!champ || champ.season !== season) return null;
  return (
    <div className={`champ-line ${className}`.trim()}>
      <span aria-hidden="true" style={{ fontSize: size }}>💍</span>
      <b>Campeón NBA:</b>
      <span className="champ-team">{teamName(c.league, champ.team)}</span>
      <span className="champ-season">{` · ${seasonLabel(champ.season)}`}</span>
    </div>
  );
}

function SeasonRecap({ c }: { c: Career }) {
  const s = c.lastSummary;
  const medal = c.phase === 'offseason' && c.flags.medalSeason !== undefined && c.flags.medalSeen !== c.flags.medalSeason;
  const season = !!s && (c.phase === 'season-end' || c.phase === 'offseason') && c.flags.recapSeen !== s.season;
  if (!medal && !season) return null;
  const close = () => store.act((x) => {
    if (season && s) x.flags.recapSeen = s.season;
    if (medal) x.flags.medalSeen = x.flags.medalSeason;
  });
  if (medal) {
    const country = countryByCode(userOf(c).nat);
    return (
      <div className="recap" role="dialog" aria-label="Medalla con la selección" onClick={close}>
        <div className="recap-box" onClick={(e) => e.stopPropagation()}>
          <span className="recap-kicker">Verano con la selección</span>
          <div className="recap-trophies"><div className="recap-trophy" style={{ animationDelay: '0.2s' }}><span>🥇</span><b>Medalla con {country.name}</b></div></div>
          <p className="recap-line"><Flag code={userOf(c).nat} size={20} /> {c.flags.nationalCaps} convocatorias · {c.flags.medals} {c.flags.medals === 1 ? 'medalla' : 'medallas'}</p>
          <button type="button" className="btn pill light" onClick={close} autoFocus>Continuar</button>
        </div>
      </div>
    );
  }
  const recs = c.seasons.filter((r) => r.season === s!.season && r.stats.gp > 0);
  const r = recs.find((x) => x.comp === 'NBA') ?? recs[0];
  const a = r ? averages(r.stats) : null;
  const keys = [...new Set(recs.flatMap((x) => x.awards))];
  return (
    <div className="recap" role="dialog" aria-label={`Resumen de la temporada ${seasonLabel(s!.season)}`} onClick={close}>
      <div className="recap-box" onClick={(e) => e.stopPropagation()}>
        <span className="recap-kicker">Temporada {seasonLabel(s!.season)}</span>
        <h2>{keys.length ? (keys.includes('champion') || keys.includes('euroChampion') ? '¡Campeones!' : '¡Temporada de premios!') : 'Temporada terminada'}</h2>
        <ChampionLine c={c} season={s!.season} size={26} className="recap-champ" />
        <p className="recap-line">{s!.teamResult}</p>
        {a && (
          <div className="recap-stats">
            <div><b><CountUp value={a.ppg} /></b><span>PTS</span></div>
            <div><b><CountUp value={a.rpg} /></b><span>REB</span></div>
            <div><b><CountUp value={a.apg} /></b><span>AST</span></div>
            <div className={s!.ovrDelta > 0 ? 'up' : s!.ovrDelta < 0 ? 'down' : ''}><b>{s!.ovrDelta > 0 ? '+' : ''}{s!.ovrDelta}</b><span>OVR</span></div>
          </div>
        )}
        {keys.length > 0 && (
          <div className="recap-trophies">
            {keys.map((k, i) => (
              <div key={k} className="recap-trophy" style={{ animationDelay: `${0.5 + i * 0.35}s` }}>
                <span>{AWARD_ICON[k] ?? '🏆'}</span>
                <b>{AWARD_LABEL[k] ?? k}</b>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn pill light" onClick={close} autoFocus>Ver la temporada</button>
      </div>
    </div>
  );
}

/** The finished season at a glance: per-game numbers big, totals small, OVR change, awards and pay. */
function SeasonCard({ c, s }: { c: Career; s: SeasonSummary }) {
  const recs = c.seasons.filter((r) => r.season === s.season && r.stats.gp > 0);
  const r = recs.find((x) => x.comp === 'NBA') ?? recs[0];
  const records = seasonRecords(c, s.season);
  const best = s.highlights[0] && !s.highlights[0].startsWith('Campeón') ? s.highlights[0] : null;
  if (!r) return <><span>{s.teamResult}</span><ChampionLine c={c} season={s.season} size={16} className="sc-champ" /><MoneyLine m={s.money} /></>;
  const st = r.stats;
  const a = averages(st);
  const fg = st.fga ? Math.round((st.fgm / st.fga) * 1000) / 10 : 0;
  const tone = s.ovrDelta > 0 ? 'up' : s.ovrDelta < 0 ? 'down' : '';
  return (
    <div className="season-card">
      <div className="sc-head">{s.teamResult}</div>
      <ChampionLine c={c} season={s.season} size={16} className="sc-champ" />
      <div className="sc-tiles">
        <div><b>{f1(a.ppg)}</b><span>PTS</span><small>{num(st.pts)} en total</small></div>
        <div><b>{f1(a.rpg)}</b><span>REB</span><small>{num(st.oreb + st.dreb)} en total</small></div>
        <div><b>{f1(a.apg)}</b><span>AST</span><small>{num(st.ast)} en total</small></div>
        <div className={`ovr ${tone}`}><b>{s.ovrDelta > 0 ? '+' : ''}{s.ovrDelta}</b><span>OVR</span><small>{st.gp} PJ · {fg} % TC</small></div>
      </div>
      {(s.awards.length > 0 || best || records.length > 0) && (
        <div className="sc-notes">
          {s.awards.map((x) => <span key={x} className="chip gold" title={x}>{AWARD_ICON_BY_LABEL[x] ?? '🏆'} {x}</span>)}
          {records.length > 0 && <span className="chip accent sc-record"><Icon name="flame" size={13} /> Récord: {records.slice(0, 3).join(' · ')}{records.length > 3 ? '…' : ''}</span>}
          {best && <span className="sc-best"><Icon name="star" size={13} /> Mejor partido: {best}</span>}
        </div>
      )}
      <MoneyLine m={s.money} />
    </div>
  );
}

/** The career's random goal and how close it is. */
function ChallengeLine({ c }: { c: Career }) {
  const ch = challengeOf(c);
  const [v, target] = ch.progress(c);
  const done = v >= target;
  const mark = done ? 'check' : c.phase === 'retired' ? 'close' : 'target';
  return (
    <div className={`challenge tiny ${done ? 'done' : ''}`}>
      <span><Icon name={mark} size={13} /> <b>Reto:</b> {ch.label}</span>
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

function Choice({ title, top, icon, scene, children, onClick, tone, locked, lockNote }: { title: string; top?: string; icon?: ReactNode; scene?: SceneKind; children?: ReactNode; onClick: () => void; tone?: 'stay' | 'danger' | 'primary'; locked?: boolean; lockNote?: string }) {
  return (
    <button className={`choice ${tone ?? ''} ${scene ? 'with-img' : ''} ${locked ? 'locked' : ''}`} onClick={onClick} disabled={locked} aria-disabled={locked}>
      {scene && <Scene kind={scene} variant={title} height={64} still className="choice-img" />}
      {top && <span className="tiny dim">{top}</span>}
      <b className="choice-title">{title}</b>
      {!scene && icon && <span className="choice-icon">{icon}</span>}
      {children && <span className="choice-body">{children}</span>}
      {locked && <span className="choice-lock">🔒 {lockNote ?? 'No disponible'}</span>}
    </button>
  );
}

function Block({ title, desc, scene, meta, children }: { title: string; desc?: ReactNode; scene: SceneKind; meta?: ReactNode; children: ReactNode }) {
  // Many options (e.g. a busy transfer market): slim banner and compact cards so all fit on screen.
  const compact = Children.toArray(children).filter(Boolean).length > 3;
  // A season card carries the screen: the banner and option photos step back so the choices stay in view.
  const card = !!desc && typeof desc !== 'string';
  return (
    <div className={`decision anim-in ${compact ? 'is-compact' : ''} ${card ? 'has-card' : ''}`} key={title}>
      <Scene kind={scene} variant={title} height={compact || card ? 72 : 120}><h2>{title}</h2></Scene>
      {desc && (typeof desc === 'string' ? <p className="small muted desc">{desc}</p> : <div className="small muted desc">{desc}</div>)}
      {meta && <div className="decision-meta">{meta}</div>}
      <div className={`choices ${compact ? 'compact' : ''}`}>{children}</div>
    </div>
  );
}

function OfferChoice({ c, o, onPick, top = 'Firmar con' }: { c: Career; o: Offer; onPick: () => void; top?: string }) {
  const t = c.league.teams[o.teamId];
  const total = makeSalaries(o.salary, o.years, o.raise).reduce((s, v) => s + v, 0);
  const club = o.club ? findClub(o.club) : undefined;
  const name = t ? `${t.city} ${t.name}` : club ? club.name : 'Extranjero';
  const champ = championOf(c.league);
  const fromChamp = !!champ && !!c.league.teams[o.teamId] && champ.team === o.teamId;
  return (
    <Choice top={o.id === 'opt-player' ? 'Ejercer opción' : o.id.startsWith('ext-') ? 'Extender con' : o.note.startsWith('Renovar') ? 'Renovar con' : o.id.startsWith('eu-stay') ? 'Seguir en' : top} title={name} onClick={onPick} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : club ? <span className="club-crest"><ClubLogo name={club.name} size={50} /><small>{club.league}</small></span> : <span style={{ fontSize: '2.6rem' }}>🌍</span>}>
      <span className="choice-meta">{fmtMoney(o.salary)}{o.years > 1 ? ` · ${o.years} años (${fmtMoney(total)})` : ` · ${o.kind === 'two-way' ? 'two-way' : o.kind === 'gleague' ? 'G League' : '1 año'}`}</span>
      <span className="choice-meta dim">{o.role}{t ? ` · ${t.w + t.l ? `${t.w}-${t.l}` : t.status === 'contender' ? 'aspirante' : t.status === 'rebuild' ? 'reconstrucción' : 'zona media'}` : ''}</span>
      {fromChamp && champ && (
        <span className="chip gold offer-champ" title={`Campeón NBA · ${seasonLabel(champ.season)}`}>
          {`💍 Campeón · ${seasonLabel(champ.season)}`}
        </span>
      )}
    </Choice>
  );
}

function DraftGatePopup({ c }: { c: Career }) {
  const p = c.predraft;
  if (!p) return null;
  const outcome = p.lastOutcome;
  if (!outcome || p.outcomeSeen) return null;
  if (outcome === 'undrafted') return null;

  const title = outcome === 'no-interest'
    ? 'Los equipos no te ven listo'
    : outcome === 'combine-failed'
      ? 'El combine no convence'
      : 'No acudiste al combine';
  const reason = outcome === 'no-interest'
    ? 'Tu nivel actual no llega al corte del draft. Sigue trabajando y vuelve a intentarlo.'
    : outcome === 'combine-failed'
      ? 'Fallaste demasiadas pruebas o el acierto global fue demasiado bajo. No entras al draft.'
      : 'Los equipos notaron tu ausencia en el combine. Tu cotización baja.';

  const close = () => store.act((x) => { x.predraft!.outcomeSeen = true; });

  return (
    <div className="recap" role="dialog" aria-label="No entras al draft" onClick={close}>
      <div className="recap-box" onClick={(e) => e.stopPropagation()}>
        <span className="recap-kicker">No entras al draft</span>
        <h2>{title}</h2>
        <p className="recap-line">{reason}</p>
        <p className="recap-line small muted">Siguiente paso: vuelve al club, mejora tu cotización y vuelve a intentarlo el año que viene.</p>
        <button type="button" className="btn pill light" onClick={close} autoFocus>Continuar</button>
      </div>
    </div>
  );
}

function UndraftedPopup({ c }: { c: Career }) {
  if (c.phase !== 'signing') return null;
  if (!c.flags.undrafted || c.flags.undraftedSeen) return null;

  const close = () => store.act((x) => { x.flags.undraftedSeen = 1; });

  return (
    <div className="recap" role="dialog" aria-label="Sin llamada en el draft" onClick={close}>
      <div className="recap-box" onClick={(e) => e.stopPropagation()}>
        <span className="recap-kicker">Noche del draft</span>
        <h2>Nadie te eligió</h2>
        <p className="recap-line">Ninguna franquicia apostó por ti esta noche. No es el final: el mercado, Europa y la G League siguen abiertos.</p>
        <button type="button" className="btn pill light" onClick={close} autoFocus>Ver opciones</button>
      </div>
    </div>
  );
}

function Decision({ c }: { c: Career }) {
  const u = userOf(c);
  const t = teamOf(c);
  const [askRetire, setAskRetire] = useState(false);
  if (c.pendingEvent) return <EventModalInline c={c} />;
  const sim = (label: string, fn: (x: Career) => void) => store.actAsync(label, fn);
  /** Apply an action, then keep simulating (visibly, in slices) until the next real decision. */
  // Phones simulate one week per frame (shorter pauses, smoother screen); same results either way.
  const weeks = window.matchMedia('(max-width: 760px)').matches ? 1 : 2;
  const go = (label: string, fn?: (x: Career) => void) => store.actLive(label, weeks, fn);

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
                <Choice key={x.name} top={club?.league ?? (ncaa ? 'NCAA' : '')} title={x.name} icon={<span className="club-crest"><ClubLogo name={x.name} size={52} /></span>} onClick={() => store.act((y) => api.chooseStartingClub(y, x.name))}>
                  {club?.tier === 1 ? 'Gigante: más victorias, menos minutos.' : club?.tier === 2 ? 'Equilibrado: nivel y minutos.' : 'Modesto: el balón será tuyo.'}
                  <span className="choice-meta">{x.comp === 'NCAA' ? 'Beca (sin sueldo)' : `${fmtMoney(startingSalary(x.comp, club?.tier))}/año`}</span>
                </Choice>
              );
            })}
          </Block>
        );
      }
      if (p.step === 'season') {
        const s = c.satellite!;
        const comp = SATELLITES[s.comp as 'NCAA' | 'EUR'];
        const waits = p.waits ?? 0;
        const outcome = p.lastOutcome === 'no-interest'
          ? 'Los equipos NBA no muestran interés'
          : p.lastOutcome === 'combine-failed'
            ? 'Combine insuficiente: no entras al draft'
            : p.lastOutcome === 'skipped-combine'
              ? 'No acudiste al combine'
              : null;
        return (
          <Block
            scene={s.comp === 'NCAA' ? 'college' : 'europe'}
            title={`Temporada en ${s.teamName}`}
            desc={`${s.league ?? comp.name}. Los ojeadores NBA miran cada partido; la liga NBA se juega en paralelo y decidirá el orden del draft.`}
            meta={(outcome || waits > 0) ? (
              <div className="risk-row">
                {outcome && <span className="chip">{outcome}</span>}
                {waits > 0 && <span className="chip">{`Año de espera ${waits}/3`}</span>}
              </div>
            ) : undefined}
          >
            <Choice top="Jugar" title="La temporada completa" scene="arena" onClick={() => go('Jugando la temporada…')}>Se detiene si surge una decisión.</Choice>
          </Block>
        );
      }
      if (p.step === 'decision') {
        const interest = api.nbaInterest(c);
        const waits = p.waits ?? 0;
        const canReturn = !p.noNbaInterest && waits < 3 && u.age <= 21 && p.seasonsPlayed < 3;
        const outcome = p.lastOutcome === 'no-interest'
          ? 'Los equipos NBA no muestran interés'
          : p.lastOutcome === 'combine-failed'
            ? 'Combine insuficiente: no entras al draft'
            : p.lastOutcome === 'skipped-combine'
              ? 'No acudiste al combine'
              : null;
        return (
          <Block
            scene={'draft'}
            title="¿Te declaras para el draft?"
            desc={c.lastSummary ? <SeasonCard c={c} s={c.lastSummary} /> : undefined}
            meta={(outcome || waits > 0 || p.combineResult || p.noNbaInterest) ? (
              <div className="risk-row">
                {outcome && <span className="chip">{outcome}</span>}
                {p.combineResult && <span className="chip">{`Combine ${p.combineResult.grade} · ${p.combineResult.detail}`}</span>}
                {waits > 0 && <span className="chip">{`Año de espera ${waits}/3`}</span>}
                {p.noNbaInterest && <span className="chip">La puerta NBA se ha cerrado</span>}
              </div>
            ) : undefined}
          >
            <Choice
              top={interest.interested ? 'Dar el salto' : 'Sin interés NBA'}
              title="Declararme"
              scene="draft"
              locked={!interest.interested}
              lockNote={!interest.interested ? 'Los equipos no te ven listo para el draft.' : undefined}
              onClick={() => store.act((x) => api.predraftDecision(x, true))}
            >
              Combine, entrevistas y draft.
            </Choice>
            <Choice top="Sin NBA" title={p.noNbaInterest ? 'Carrera fuera de la NBA' : p.route === 'college' ? 'Jugar en el extranjero' : 'Carrera en Europa'} scene="europe" tone="stay" onClick={() => go('Mercado de clubes…', api.chooseEuroCareer)}>Clubes, títulos y la puerta de la NBA abierta.</Choice>
            {canReturn && <Choice top="Esperar" title="Otra temporada" scene="college" tone="stay" onClick={() => go('Jugando otra temporada…', (x) => api.predraftDecision(x, false))}>Volver al club y mejorar tu cotización.</Choice>}
          </Block>
        );
      }
      if (p.step === 'combine') {
        const rule = DRAFT_RULES[c.mode] ?? DRAFT_RULES.quick;
        if (!rule.plan) {
          return (
            <Block scene={'training'} title="Draft Combine" desc="Formato Exprés: una prueba y una entrevista para entrar al draft. Sin plan de combine.">
              <Choice top="Exprés" title="Empezar el combine" scene="clutch" onClick={() => store.act((x) => api.doCombine(x, 'full'))}>Una prueba según tu proyección y una entrevista.</Choice>
            </Block>
          );
        }
        const testsWord = rule.tests === 2 ? 'Dos' : 'Tres';
        return (
          <Block scene={'training'} title="Draft Combine" desc={`Formato ${c.mode === 'full' ? 'Larga' : 'Normal'}: plan, ${rule.interviews} entrevista${rule.interviews === 1 ? '' : 's'} y ${rule.tests} pruebas. Si fallas demasiadas pruebas o no acudes, no entrarás al draft.`}>
            <Choice top="Normal" title="Demostrar todo" scene="clutch" onClick={() => store.act((x) => api.doCombine(x, 'full'))}>{`${testsWord} pruebas a tu nivel. Bonus estándar.`}</Choice>
            <Choice top="Exigente" title="A lo bestia" scene="clutch" onClick={() => store.act((x) => api.doCombine(x, 'hard'))}>{`${testsWord} pruebas al máximo: bonus ×1.2 y riesgo real.`}</Choice>
            <Choice top="Fácil" title="Ir con calma" scene="training" onClick={() => store.act((x) => api.doCombine(x, 'safe'))}>{`${testsWord} pruebas sencillas: zona amplia, bonus ×0.85.`}</Choice>
            <Choice top="Confianza" title="No acudir" scene="rest" onClick={() => store.act((x) => api.doCombine(x, 'skip'))}>Los equipos lo notarán.</Choice>
          </Block>
        );
      }
      if (p.step === 'combineTests' && p.combineTests) {
        const test = p.combineTests.find((x) => x.made === undefined);
        if (!test) return null;
        const done = p.combineTests.filter((x) => x.made !== undefined).length;
        return (
          <div className="decision anim-in">
            <Scene kind="training" variant={test.id} height={120}>
              <span className="chip">Draft Combine</span>
              <h2>{test.label}</h2>
            </Scene>
            <p className="small muted desc">{test.desc}</p>
            <div className="risk-row">
              <span className="chip">Prueba {done + 1}/{p.combineTests.length}</span>
              <span className="chip">Dificultad: {MINIGAME_TIER_LABEL[test.spec.tier ?? 'normal']}</span>
            </div>
            <Minigame key={test.id + (test.spec.tier ?? '')} spec={test.spec} onDone={(made) => store.act((x) => api.playCombineTest(x, made))} onSimulate={() => store.act((x) => api.playCombineTest(x))} />
            <p className="small muted desc">El resultado mueve tu proyección en el draft.</p>
          </div>
        );
      }
      if (p.step === 'interviews' && p.interviewQuestions) {
        const i = p.interviews.length;
        const q = p.interviewQuestions[i];
        return (
          <Block
            scene={'press'}
            title={`Entrevista con ${teamName(c.league, q.teamId)}`}
            desc={`«${q.question}»`}
            meta={(
              <div className="risk-row">
                <span className="chip">Entrevista {i + 1}/{p.interviewQuestions.length}</span>
                {p.combineResult && <><span className="chip accent">Combine {p.combineResult.grade}</span><span className="chip">{p.combineResult.detail}</span><span className="chip">Bonus {p.combineResult.bonus >= 0 ? '+' : ''}{p.combineResult.bonus.toFixed(1)}</span></>}
              </div>
            )}
          >
            {q.answers.map((a, k) => <Choice key={k} title={a} scene="press" onClick={() => store.act((x) => api.answerInterview(x, i, k))} />)}
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
        <Block scene={c.phase === 'postseason' ? 'trophy' : 'arena'} title={`Temporada ${seasonLabel(c.league.season)}`} desc={`${where} · ${c.phase === 'postseason' ? 'Postemporada en curso' : c.phase === 'preseason' ? 'Pretemporada' : 'Temporada en curso'}${u.injury ? ` · ${u.injury.name} (${u.injury.daysLeft} días)` : ''}`}>
          <Choice top="Simular" title={c.phase === 'postseason' ? 'Los playoffs' : 'La temporada'} scene="arena" onClick={() => go('Simulando…')}>Se detiene si surge una decisión.</Choice>
        </Block>
      );
    }
    case 'season-end': {
      const s = c.lastSummary!;
      return (
        <Block scene={s.awards.length ? 'trophy' : 'arena'} title={`Fin de temporada ${seasonLabel(s.season)}`} desc={<SeasonCard c={c} s={s} />}>
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
            ? <Choice top="Sin firmar nada" title="Rechazar la extensión" scene="contract" tone="stay" onClick={() => go('Nueva temporada…', (x) => { x.offers = []; })}>Cumples el contrato que ya tienes.</Choice>
            : <Choice top="Quedarse en" title={t ? teamName(c.league, t.id) : 'tu equipo'} icon={t ? <TeamBadge id={t.id} color={t.color} size={58} /> : undefined} scene={t ? undefined : 'arena'} tone="stay" onClick={() => go('Nueva temporada…', (x) => { x.offers = []; })}>Seguir con tu contrato.</Choice>)}
          {canRetire && <Choice top="Colgar las botas" title="Retirarse" scene="trophy" tone="danger" onClick={() => setAskRetire(true)}>Fin de la carrera.</Choice>}
          {askRetire && <RetireModal c={c} onCancel={() => setAskRetire(false)} />}
        </Block>
      );
    }
    case 'retired':
      return <Retired c={c} />;
    default:
      return null;
  }
}

/** Retiring is final: the modal shows what the career leaves behind before confirming. */
function RetireModal({ c, onCancel }: { c: Career; onCancel: () => void }) {
  const u = userOf(c);
  const nba = c.seasons.filter((s) => s.comp === 'NBA');
  const seasons = new Set(nba.map((s) => s.season)).size;
  const rings = c.seasons.filter((s) => s.awards.includes('champion')).length;
  const score = legacyScore(c);
  const tier = TIERS.reduce((acc, x) => (score >= x[0] ? x : acc), TIERS[0])[1];
  return (
    <ConfirmModal icon={<Icon name="shoe" size={44} />} kicker="Colgar las botas" title="¿Anunciar tu retirada?" confirmLabel="Sí, me retiro" cancelLabel="Seguir jugando" danger
      onCancel={onCancel} onConfirm={() => { onCancel(); store.act((x) => api.retire(x, 'Retirada voluntaria.')); }}>
      <div className="confirm-stats">
        <div><b>{u.age}</b><span>Años</span></div>
        <div><b>{seasons}</b><span>Temporadas NBA</span></div>
        <div><b>{rings}</b><span>Anillos</span></div>
        <div><b>{score}</b><span>Legado</span></div>
      </div>
      <p>{`Te retiras como ${tier}.`}</p>
      <p>La carrera termina aquí y se guarda en Mis carreras.</p>
    </ConfirmModal>
  );
}

function Retired({ c }: { c: Career }) {
  const nav = useNavigate();
  const u = userOf(c);
  const r = c.retirement!;
  const a = averages(r.totals);
  // Where this career lands among the finished ones (it is already in the history once retired).
  const others = careerHistory().filter((h) => h.id !== c.id).map((h) => h.legacyScore);
  const earned = ACHIEVEMENTS.filter((x) => c.achievements.includes(x.id));
  const rank = { pos: others.filter((x) => x > r.legacyScore).length + 1, total: others.length + 1, best: Math.max(0, ...others), record: others.length > 0 && r.legacyScore > Math.max(...others) };
  const download = async () => {
    const out = await downloadPNG(c, `nba-legacy-${u.last.toLowerCase()}.png`);
    if (out.method === 'open') store.toast('Mantén pulsado para guardar la imagen.');
    else if (!out.ok) store.toast('No se pudo generar la imagen.');
  };
  const share = async () => {
    const text = `NBA Legacy\n${u.first} ${u.last} (${u.pos}, ${countryByCode(u.nat).name})\n${r.totals.gp} PJ · ${f1(a.ppg)} PTS ${f1(a.rpg)} REB ${f1(a.apg)} AST · ${r.titles} anillo(s)\nLegacy Score ${r.legacyScore} · ${r.tier}\n${challengeDone(c) ? 'Reto cumplido' : 'Reto no cumplido'}: ${challengeOf(c).label}\n¿Puedes superarlo? ${location.origin + location.pathname}`;
    // The link turns every shared career into an invitation to play.
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
          {rank.record ? <><Icon name="trophy" size={14} /> ¡Nuevo récord personal! Tu mejor carrera de {rank.total}</> : `Puesto #${rank.pos} de tus ${rank.total} carreras · récord ${rank.best}`}
        </p>
      )}
      {earned.length > 0 && (
        <div className="earned" title={earned.map((x) => x.title).join(' · ')}>
          <span className="tiny dim">Logros de esta carrera ({earned.length})</span>
          <div>{earned.map((x) => <span key={x.id} title={`${x.title}: ${x.desc}`}><span>{x.icon}</span></span>)}</div>
        </div>
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
  // Season totals or per-game averages (the header button switches; remembered on this device).
  const [perGame, setPerGame] = useState(() => { try { return localStorage.getItem('nbalegacy:perGame') === '1'; } catch { return false; } });
  const [showAll, setShowAll] = useState(false);
  const togglePerGame = () => setPerGame((v) => { try { localStorage.setItem('nbalegacy:perGame', v ? '0' : '1'); } catch { /* private mode */ } return !v; });
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
    if (c.phase === 'offseason' && api.needsContract(c)) return 'Eligiendo club…';
    if (c.phase === 'season-end') return 'Próxima temporada';
    if (t) return teamName(c.league, t.id);
    return c.satellite?.teamName ?? 'Decisión de carrera…';
  };
  const rows: ReactNode[] = [];
  // Phones hide the far-off empty years so the decision stays within reach.
  const lastAge = Math.max(pendingAge ?? 0, ...byAge.keys());
  const collapseFrom = Math.max(startAge, lastAge - 3);
  const hasOld = startAge < collapseFrom;
  for (let age = startAge; age <= endAge; age++) {
    const r = byAge.get(age);
    if (r) {
      const a = averages(r.stats);
      const tm = r.teamId ? c.league.teams[r.teamId] : null;
      const won = r.awards.includes('champion');
      rows.push(
        <div key={age} className={`tl-row in ${age < collapseFrom ? 'old' : ''}`} style={{ animationDelay: `${Math.min(12, age - startAge) * 45}ms` }} title={`${seasonLabel(r.season)} · ${r.result}`}>
          <span className="age-badge" style={{ background: tm?.color ?? '#334155' }}>{age}</span>
          <span className="tl-club">{tm && r.comp === 'NBA' ? <TeamBadge id={tm.id} color={tm.color} size={16} /> : r.comp === 'GLG' ? <span className="tiny"><Icon name="ball" size={13} /></span> : <ClubLogo name={r.teamName} size={16} />}<span>{r.teamName}</span>{r.comp !== 'NBA' && <span className="tiny dim">{r.comp === 'GLG' ? 'G League' : r.comp === 'EUR' ? findClub(r.teamName)?.league ?? 'Internacional' : 'NCAA'}</span>}{won && <span title="Campeón">💍</span>}{r.awards.filter((k) => k !== 'champion').slice(0, 2).map((k) => <span key={k} title={AWARD_LABEL[k]}>{AWARD_ICON[k] ?? '🏆'}</span>)}</span>
          <span className={`ovr-pill ${ovrClass(r.ovrEnd)}`} style={{ background: ovrTone(r.ovrEnd) }}>{r.ovrEnd}</span>
          <span className="tl-num">{r.stats.gp}</span>
          <span className="tl-num">{perGame ? f1(a.ppg) : num(r.stats.pts)}</span>
          <span className="tl-num">{perGame ? f1(a.rpg) : num(r.stats.oreb + r.stats.dreb)}</span>
          <span className="tl-num">{perGame ? f1(a.apg) : num(r.stats.ast)}</span>
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
          <span className={`ovr-pill ${ovrClass(u.ovr)}`} style={{ background: ovrTone(u.ovr) }}>{u.ovr}</span>
          <span className="tl-live" style={{ gridColumn: 'span 4' }}>{inSeason(c) && c.league.day > 0 ? 'Temporada en curso' : ''}</span>
        </div>,
      );
    } else {
      rows.push(<div key={age} className={`tl-row empty ${age > lastAge + 2 ? 'far' : ''} ${age < collapseFrom ? 'old' : ''}`}><span className="age-empty">{age}</span></div>);
    }
  }
  const nba = sumStats(c.seasons.filter((s) => s.comp === 'NBA').map((s) => s.stats));
  const abroad = sumStats(c.seasons.filter((s) => s.comp === 'EUR').map((s) => s.stats));
  const country = countryByCode(u.nat);
  return (
    <div className="tl-scroll">
      <div className={`tl ${showAll ? 'open' : ''}`}>
        <div className="tl-row head">
          <span>EDAD</span><span>EQUIPO <button type="button" className="tl-mode" onClick={togglePerGame} aria-pressed={perGame}>{perGame ? 'Por partido' : 'Totales'} ⇄</button></span><span>OVR</span><span className="tl-num">PJ</span><span className="tl-num">PTS</span><span className="tl-num">REB</span><span className="tl-num">AST</span>
        </div>
        {hasOld && (
          <button type="button" className="tl-more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Ver menos' : 'Ver toda la carrera'}
          </button>
        )}
        <div className="tl-body">{rows}</div>
        <div className="tl-row foot">
          <span className="age-badge" style={{ background: '#1f2937' }}>Σ</span>
          <span className="tl-club"><span>Total carrera NBA</span></span>
          <span />
          <span className="tl-num">{num(nba.gp)}</span>
          <span className="tl-num">{perGame ? f1(averages(nba).ppg) : num(nba.pts)}</span>
          <span className="tl-num">{perGame ? f1(averages(nba).rpg) : num(nba.oreb + nba.dreb)}</span>
          <span className="tl-num">{perGame ? f1(averages(nba).apg) : num(nba.ast)}</span>
        </div>
        {abroad.gp > 0 && (
          <div className="tl-row foot" style={{ marginTop: 2 }}>
            <span className="age-badge" style={{ background: '#1f2937' }}><Icon name="globe" size={13} /></span>
            <span className="tl-club"><span>Total fuera de la NBA</span></span>
            <span />
            <span className="tl-num">{num(abroad.gp)}</span>
            <span className="tl-num">{perGame ? f1(averages(abroad).ppg) : num(abroad.pts)}</span>
            <span className="tl-num">{perGame ? f1(averages(abroad).rpg) : num(abroad.oreb + abroad.dreb)}</span>
            <span className="tl-num">{perGame ? f1(averages(abroad).apg) : num(abroad.ast)}</span>
          </div>
        )}
        {(c.flags.nationalCaps ?? 0) > 0 && <div className="nat-row">
          <Flag code={u.nat} size={22} />
          <span><b>Selección de {country.name}</b> · {c.flags.nationalCaps ? `${c.flags.nationalCaps} convocatoria${c.flags.nationalCaps > 1 ? 's' : ''}` : c.flags.nationalTeam ? 'Internacional' : 'Aún sin convocatorias'}{c.flags.medals ? <> · <Icon name="medal" size={13} /> {c.flags.medals} medalla{c.flags.medals > 1 ? 's' : ''}</> : ''}</span>
        </div>}
      </div>
    </div>
  );
}
