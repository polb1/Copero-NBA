// In-season flow: daily simulation with user hooks, weekly training and events, trade deadline,
// All-Star, postseason and the end-of-season report.
import type { BoxLine, Career, Player, SeasonRecord, SeasonSummary, UserGame } from './types';
import { addNews, currentComp, eventContext, onNbaRoster, openEvent, queueEvent, teamOf, userOf, userRole } from './career';
import { playPostseasonDay, playRegularDay, regularSeasonOver, startPostseason, teamPlayoffResult, type DayHooks } from './season';
import { computeAwards, finalsMvp, selectAllStars, snapshotNames, awardsFor, AWARD_LABEL } from './awards';
import { applyInjuryAftermath, injuryRisk, rollInjury } from './injuries';
import { trainWeek } from './progression';
import { pickEvent, instantiate, absDay, markEventSeen } from './events';
import { playSatelliteGame, SATELLITES } from './satellite';
import { opponentsFor } from '../data/clubs';
import { addBox, averages, f1, fpct, doubleCount } from './stats';
import { gameScore } from './gamesim';
import { goalDef, updateGoalProgress } from './goals';
import { newlyUnlocked, ACHIEVEMENTS } from './achievements';
import { teamName, makeCoach } from './league';
import { salaryIn, fmtMoney, yearsLeft } from './contracts';
import { generateTradeOffers, executeTrade } from './market';
import { emptyStats, fullName } from './players';
import { EVENT_RATE, RULES } from './config';
import { clamp, rngFor } from './rng';
import { fmtDate, seasonLabel } from './schedule';

export type AdvanceUnit = 'game' | 'week' | 'event' | 'season';

export const inSeason = (c: Career) =>
  c.phase === 'regular' || c.phase === 'postseason' || (c.phase === 'predraft' && c.predraft?.step === 'season');

function recordHighs(c: Career, b: BoxLine, opp: string, playoff: boolean) {
  const reb = b.oreb + b.dreb;
  const vals = { pts: b.pts, reb, ast: b.ast, stl: b.stl, blk: b.blk, tpm: b.tpm } as const;
  const target = playoff ? c.playoffHighs : c.highs;
  for (const [k, v] of Object.entries(vals)) {
    if (playoff && !['pts', 'reb', 'ast'].includes(k)) continue;
    const cur = (target as Record<string, { value: number } | undefined>)[k];
    if (!cur || v > cur.value) (target as Record<string, unknown>)[k] = { value: v, season: c.league.season, opp };
  }
}

function userGameEffects(c: Career, u: Player, b: BoxLine) {
  const gs = gameScore(b);
  const expected = Math.max(0, (u.ovr - 55) * 0.38) * (b.min / 34);
  c.trust = clamp(c.trust + clamp((gs - expected) * 0.12, -1.2, 1.2), 0, 100);
  if (gs >= 30) addNews(c, 'game', `Exhibición de ${fullName(u)}`, `${b.pts} puntos, ${b.oreb + b.dreb} rebotes y ${b.ast} asistencias. Actuación para el recuerdo.`, 'good');
  const d = doubleCount(b);
  if (d >= 3) addNews(c, 'milestone', d >= 4 ? '¡Cuádruple-doble!' : 'Triple-doble', `${fullName(u)} firma ${b.pts}/${b.oreb + b.dreb}/${b.ast}${d >= 4 ? ` con ${b.stl} robos y ${b.blk} tapones` : ''}.`, 'good');
}

export function userHooks(c: Career): DayHooks {
  const u = userOf(c);
  return {
    rotation: (teamId) => {
      if (teamId !== u.teamId) return {};
      const twoWayOk = u.contract?.kind !== 'two-way' || c.twoWayNbaGames < RULES.twoWayNbaGameLimit;
      return { userId: u.id, userTrust: c.trust, userAvailable: c.assignment === 'NBA' && twoWayOk };
    },
    onGame: (ctx, res, home, away) => {
      if (!u.teamId || (ctx.home !== u.teamId && ctx.away !== u.teamId)) return;
      if (!onNbaRoster(c) || c.assignment === 'GLG') return;
      const isHome = ctx.home === u.teamId;
      const box = isHome ? res.home : res.away;
      const line = box.find((b) => b.pid === u.id) ?? null;
      const oppId = isHome ? ctx.away : ctx.home;
      const oppName = teamName(c.league, oppId);
      const played = line && line.min > 0 ? line : null;
      const g: UserGame = {
        season: c.league.season, day: c.league.day, comp: 'NBA', kind: ctx.kind, teamId: u.teamId, oppName,
        home: isHome, teamScore: isHome ? res.hs : res.as, oppScore: isHome ? res.as : res.hs, ot: res.ot,
        line: played, dnp: played ? undefined : u.injury && !u.injury.playingThrough ? `Lesionado: ${u.injury.name}` : 'Decisión técnica',
      };
      c.gameLog.push(g);
      if (played) {
        recordHighs(c, played, oppName, ctx.kind === 'playoff');
        userGameEffects(c, u, played);
        if (u.contract?.kind === 'two-way') {
          c.twoWayNbaGames++;
          if (c.twoWayNbaGames >= RULES.twoWayNbaGameLimit) {
            c.assignment = 'GLG';
            addNews(c, 'contract', 'Límite two-way alcanzado', `Has jugado ${RULES.twoWayNbaGameLimit} partidos NBA con contrato two-way. Vuelves a la G League salvo que te ofrezcan un contrato estándar.`, 'neutral');
          }
        }
      }
      void home; void away;
    },
    onInjuryCheck: (p, minutes) => {
      if (!p.isUser) return false;
      const rng = rngFor(c.seed, 'user-injury', c.league.season, c.league.day);
      const extra = (c.flags.injuryRisk ?? 0) + (c.training.intensity === 'intense' ? 0.25 : c.training.focus === 'rest' ? -0.3 : 0);
      if (rng.chance(injuryRisk(p, minutes, c.flags.injHistory ?? 0, extra))) injureUser(c, p, rng);
      c.flags.injuryRisk = Math.max(0, (c.flags.injuryRisk ?? 0) - 0.05);
      return true;
    },
  };
}

function injureUser(c: Career, p: Player, rng: ReturnType<typeof rngFor>) {
  const wasPlayingThrough = p.injury?.playingThrough;
  let inj = rollInjury(rng);
  if (wasPlayingThrough && inj.severity === 'leve') inj = rollInjury(rng, 'moderada');
  if (p.injury && p.injury.daysLeft > inj.daysLeft) return;
  p.injury = inj;
  c.flags.injHistory = (c.flags.injHistory ?? 0) + 1;
  const notes = applyInjuryAftermath(p, inj, rng);
  addNews(c, 'injury', `Lesión: ${inj.name}`, `Baja estimada: ${inj.totalDays} días.${notes.length ? ' Secuelas: ' + notes.join(', ') + '.' : ''}`, 'bad');
  // Minor knocks are just news; only significant injuries ask for a decision.
  if (inj.severity !== 'leve') queueEvent(c, inj.severity === 'moderada' ? 'injury-moderate' : 'injury-severe');
}

/** Satellite game for the user (college, Europe, G League). */
function maybeSatelliteGame(c: Career, playedNbaTeamToday: boolean) {
  const u = userOf(c);
  if (u.injury && !u.injury.playingThrough) return;
  const day = c.league.day;
  let comp: 'NCAA' | 'EUR' | 'GLG' | null = null;
  if (!u.teamId && c.satellite) {
    const s = c.satellite;
    if (s.w + s.l < s.gamesPlanned && day % 5 === 2) comp = s.comp as 'NCAA' | 'EUR';
  } else if (u.teamId && c.assignment === 'GLG' && playedNbaTeamToday && c.phase === 'regular') {
    comp = 'GLG';
  }
  if (!comp) return;
  if (!c.satellite || c.satellite.comp !== comp) {
    const t = teamOf(c);
    c.satellite = { comp, teamName: t ? t.gLeagueName : 'Filial', level: SATELLITES[comp].level, league: 'NBA G League', gamesPlanned: SATELLITES[comp].games, w: 0, l: 0 };
  }
  const s = c.satellite;
  if (s.w + s.l >= s.gamesPlanned) return;
  const res = playSatelliteGame(c.seed, comp, c.league.season, s.w + s.l, u, s.level, (1 + (c.trust - 50) / 200) * (s.minutes ?? 1), opponentsFor(comp, s.teamName, u.teamId));
  if (res.teamScore > res.oppScore) s.w++;
  else s.l++;
  addBox(c.satStats, res.line);
  u.fatigue = clamp(u.fatigue + res.line.min * 0.34, 0, 100);
  const gs = gameScore(res.line);
  u.form = clamp(u.form * 0.82 + clamp((gs - Math.max(2, (u.ovr - 50) * 0.4)) * 0.2, -2.5, 2.5), -10, 10);
  c.gameLog.push({ season: c.league.season, day, comp, kind: 'regular', teamId: u.teamId ?? 'SAT', oppName: res.oppName, home: res.home, teamScore: res.teamScore, oppScore: res.oppScore, ot: res.ot, line: res.line });
  const rng = rngFor(c.seed, 'sat-injury', c.league.season, day);
  if (rng.chance(injuryRisk(u, res.line.min, c.flags.injHistory ?? 0))) injureUser(c, u, rng);
}

function weeklyTick(c: Career) {
  const u = userOf(c);
  const rng = rngFor(c.seed, 'week', c.league.season, c.league.day);
  const t = teamOf(c);
  const recent = c.gameLog.slice(-4).filter((g) => g.line);
  const minutesShare = recent.length ? recent.reduce((s, g) => s + (g.line?.min ?? 0), 0) / recent.length / 36 : 0.2;
  const res = trainWeek(u, c.devPoints, {
    focus: c.training.focus,
    intensity: c.training.intensity,
    workEthic: c.workEthic,
    coachRating: t?.coach.rating ?? 60,
    minutesShare,
    healthy: !u.injury,
  }, rng);
  u.fatigue = clamp(u.fatigue + res.fatigue, 0, 100);
  if (res.gains.length) {
    c.flags.trainingGains = (c.flags.trainingGains ?? 0) + res.gains.reduce((s, g) => s + g.amount, 0);
  }
  // Slow drifts
  const role = userRole(c);
  c.trust = clamp(c.trust + (50 - c.trust) * 0.015 + u.form * 0.08, 0, 100);
  const roleMorale = role.key === 'star' ? 1 : role.key === 'starter' ? 0.6 : role.key === 'rotation' ? 0.1 : -0.6;
  c.morale = clamp(c.morale + roleMorale + (65 - c.morale) * 0.03, 0, 100);
  c.chemistry = clamp(c.chemistry + (50 - c.chemistry) * 0.02 + (t && t.streak > 3 ? 0.6 : 0), 0, 100);
  c.pressure = clamp(c.pressure * 0.97, 0, 100);
  if (c.flags.newTeam) c.chemistry = clamp(c.chemistry + 0.8, 0, 100);
  updateGoalProgress(c, u, u.season);
  // G League assignments: standard contracts come back after a stint; two-way players get called up when needed.
  if (c.assignment === 'GLG' && u.contract && t && c.phase === 'regular' && onNbaRoster(c)) {
    c.flags.glgWeeks = (c.flags.glgWeeks ?? 0) + 1;
    const healthyBetter = t.roster.map((id) => c.league.players[id]).filter((p) => p && !p.isUser && !p.injury && p.contract?.kind !== 'two-way' && p.ovr > u.ovr).length;
    const twoWay = u.contract.kind === 'two-way';
    const recall = twoWay
      ? c.twoWayNbaGames < RULES.twoWayNbaGameLimit && (healthyBetter < 9 || u.form > 4) && rng.chance(0.5)
      : c.flags.glgWeeks >= 3 || healthyBetter < 10;
    if (recall) {
      c.assignment = 'NBA';
      c.flags.glgWeeks = 0;
      addNews(c, 'contract', twoWay ? 'Llamada al primer equipo' : 'De vuelta al primer equipo', twoWay ? `${t.city} te sube a la NBA (${c.twoWayNbaGames}/${RULES.twoWayNbaGameLimit} partidos two-way usados).` : 'Termina tu etapa en el filial: vuelves a la rotación NBA.', 'good');
    }
  }
  // Random narrative event
  const cfg = EVENT_RATE[c.mode];
  const countKey = `events${c.league.season}`;
  if (!c.pendingEvent && (c.flags[countKey] ?? 0) < cfg.maxPerSeason && rng.chance(cfg.perWeek)) {
    const ctx = eventContext(c);
    const def = pickEvent(ctx, rng);
    if (def) {
      c.pendingEvent = instantiate(def, ctx, rng);
      markEventSeen(c, def.id, ctx.absDay);
      c.flags[countKey] = (c.flags[countKey] ?? 0) + 1;
    }
  }
}

function processQueue(c: Career): boolean {
  if (c.pendingEvent) return true;
  const idx = c.eventQueue.findIndex((q) => q.season < c.league.season || (q.season === c.league.season && q.day <= c.league.day));
  if (idx < 0) return false;
  const [q] = c.eventQueue.splice(idx, 1);
  return openEvent(c, q.id);
}

function deadlineCheck(c: Career) {
  const L = c.league;
  if (c.phase !== 'regular' || !onNbaRoster(c) || L.day !== L.deadlineDay - 2) return;
  const u = userOf(c);
  const rng = rngFor(c.seed, 'deadline', L.season);
  const offers = c.tradeRequested || rng.chance(0.18) ? generateTradeOffers(c) : [];
  if (offers.length && c.tradeRequested) {
    c.offers = offers;
    c.pendingEvent = {
      defId: 'dyn:trade', category: 'trade', title: 'Fecha límite de traspasos',
      text: `Tu petición ha surtido efecto: ${offers.length} franquicia${offers.length > 1 ? 's han' : ' ha'} llegado a un acuerdo con ${teamName(L, u.teamId)}. La decisión final es tuya.`,
      options: [...offers.map((o) => ({ label: `Ir a ${teamName(L, o.teamId)}`, desc: `${o.role}. ${o.note}` })), { label: 'Quedarme', desc: 'Retirar la petición de traspaso.' }],
      vars: {},
    };
    return;
  }
  if (offers.length && !c.tradeRequested && c.trust < 35 && u.ovr < 80 && rng.chance(0.5)) {
    executeTrade(c, offers[0].teamId, `La directiva decide moverte sin consultarte antes de la fecha límite.`);
    return;
  }
  if (c.tradeRequested && !offers.length) {
    addNews(c, 'contract', 'Sin ofertas en la fecha límite', 'Ninguna franquicia presentó una propuesta aceptable. Seguirás en tu equipo.', 'bad');
    c.morale = clamp(c.morale - 6, 0, 100);
    c.tradeRequested = false;
  }
}

function allStarCheck(c: Career) {
  const L = c.league;
  if (L.allStarsSelected || L.day < L.allStarDay || c.phase !== 'regular') return;
  L.allStarsSelected = true;
  const u = userOf(c);
  const bonus = (p: Player) => (p.isUser ? c.fame : 40);
  L.allStars = selectAllStars(L, bonus);
  if (L.allStars.includes(u.id)) {
    c.allStarGames++;
    c.fame = clamp(c.fame + 8, 0, 100);
    c.reputation = clamp(c.reputation + 6, 0, 100);
    addNews(c, 'award', '¡Eres All-Star!', `${fullName(u)} ha sido elegido para el All-Star de ${seasonLabel(L.season)}.`, 'good');
  } else {
    addNews(c, 'league', 'Convocatorias del All-Star', `La liga anuncia los 24 All-Stars. Lidera la votación ${fullName(L.players[L.allStars[0]])}.`, 'neutral');
  }
}

function coachCheck(c: Career) {
  const L = c.league;
  if (c.phase !== 'regular' || (L.day !== 45 && L.day !== 90)) return;
  const rng = rngFor(c.seed, 'coach-fire', L.season, L.day);
  const u = userOf(c);
  for (const t of Object.values(L.teams)) {
    if (t.w + t.l < 15 || t.w / (t.w + t.l) > 0.3 || t.coach.hiredSeason >= L.season || !rng.chance(0.35)) continue;
    const old = t.coach.name;
    if (t.id === u.teamId && onNbaRoster(c)) openEvent(c, 'coach-fired');
    t.coach = makeCoach(rng, L.season);
    t.coach.hiredSeason = L.season;
    if (t.id === u.teamId) {
      c.trust = clamp(45 + (c.trust - 50) * 0.3, 0, 100);
      addNews(c, 'league', `${t.city} despide a ${old}`, `${t.coach.name} asume el banquillo con un estilo nuevo.`, 'neutral');
    }
  }
}

/** One calendar day. Returns whether the user played a game. */
function stepDay(c: Career): boolean {
  const L = c.league;
  const hooks = userHooks(c);
  const before = c.gameLog.length;
  if (c.phase === 'postseason') {
    const done = playPostseasonDay(L, c.seed, hooks);
    if (done) endSeason(c);
    return c.gameLog.length > before;
  }
  if (regularSeasonOver(L)) {
    startPostseason(L);
    addNews(c, 'league', 'Arranca la postemporada', 'Termina la temporada regular. Comienzan el Play-In y los playoffs.', 'neutral');
    if (c.phase === 'regular' && onNbaRoster(c)) {
      c.phase = 'postseason';
      return false;
    }
    // User not involved (college, Europe, G League contract): simulate the whole postseason now.
    while (!playPostseasonDay(L, c.seed, hooks));
    endSeason(c);
    return false;
  }
  const games = playRegularDay(L, c.seed, hooks);
  const u = userOf(c);
  const teamPlayed = !!u.teamId && games.some((g) => g.home === u.teamId || g.away === u.teamId);
  maybeSatelliteGame(c, teamPlayed);
  if (L.day % 7 === 0) weeklyTick(c);
  deadlineCheck(c);
  allStarCheck(c);
  coachCheck(c);
  return c.gameLog.length > before;
}

export function advance(c: Career, unit: AdvanceUnit) {
  if (!inSeason(c)) return;
  const startDay = c.league.day;
  const startPhase = c.phase;
  for (let i = 0; i < 400; i++) {
    if (c.pendingEvent) break;
    if (processQueue(c)) break;
    const played = stepDay(c);
    if (c.phase !== startPhase || !inSeason(c)) break;
    if (unit === 'game' && played) break;
    if (unit === 'week' && c.league.day - startDay >= 7) break;
    if (c.pendingEvent) break;
  }
  achievementsCheck(c);
}

export function achievementsCheck(c: Career) {
  for (const id of newlyUnlocked(c)) {
    c.achievements.push(id);
    const a = ACHIEVEMENTS.find((x) => x.id === id)!;
    addNews(c, 'milestone', `Logro desbloqueado: ${a.title}`, a.desc, 'good');
  }
}

// ---------------- End of season ----------------

function seasonRecord(c: Career, comp: SeasonRecord['comp'], stats: SeasonRecord['stats'], playoffs: SeasonRecord['playoffs'], teamId: string | null, teamNameStr: string, teamRecord: string, result: string, awards: string[], role: string): SeasonRecord {
  const u = userOf(c);
  return {
    season: c.league.season, age: u.age, comp, teamId, teamName: teamNameStr, stats, playoffs,
    ovrStart: c.seasonOvrStart, ovrEnd: u.ovr, pot: u.pot, salary: comp === 'NBA' || comp === 'GLG' ? salaryIn(u.contract, c.league.season) : 0,
    teamRecord, result, awards, role,
  };
}

export function endSeason(c: Career) {
  const L = c.league;
  const u = userOf(c);
  const awards = computeAwards(L);
  awards.allStars = L.allStars ?? [];
  awards.fmvp = finalsMvp(L);
  awards.champion = L.postseason?.champion;
  snapshotNames(L, awards);
  L.awards.push(awards);
  const ps = L.postseason!;
  const final = ps.series.find((s) => s.round === 4);
  if (ps.champion && final) L.champions.push({ season: L.season, team: ps.champion, runnerUp: final.winner === final.high ? final.low : final.high });
  for (const t of Object.values(L.teams)) {
    const seed = [...ps.seeds[t.conf]].indexOf(t.id) + 1;
    t.history.push({ season: L.season, w: t.w, l: t.l, seed, result: teamPlayoffResult(L, t.id).label });
  }
  // ---- User records
  const myAwards = awardsFor(awards, u.id);
  const t = teamOf(c);
  const onRoster = onNbaRoster(c);
  const champion = !!t && onRoster && ps.champion === t.id;
  if (c.flags[`trophy:threeContest:${L.season}`]) myAwards.push('threeContest');
  if (champion) {
    myAwards.push('champion');
    u.rings = (u.rings ?? 0) + 1;
  }
  // Season role from actual usage, not from the final-day rotation.
  const sa = averages(u.season);
  const role = !u.season.gp ? userRole(c).label : u.season.gs / u.season.gp >= 0.5 ? (u.ovr >= 80 && sa.mpg >= 32 ? 'Estrella' : 'Titular') : sa.mpg >= 16 ? 'Rotación' : 'Fondo de banquillo';
  const records: SeasonRecord[] = [];
  if (u.season.gp > 0 || (onRoster && t)) {
    records.push(seasonRecord(c, 'NBA', { ...u.season }, u.playoffs.gp ? { ...u.playoffs } : null, u.teamId, teamName(L, u.teamId), t ? `${t.w}-${t.l}` : '—', t ? teamPlayoffResult(L, t.id).label : '—', myAwards, role));
  }
  if (c.satStats.gp > 0 && c.satellite) {
    const s = c.satellite;
    const comp = s.comp;
    records.push(seasonRecord(c, comp, { ...c.satStats }, null, comp === 'GLG' ? u.teamId : null, s.teamName, `${s.w}-${s.l}`, comp === 'GLG' ? 'G League' : SATELLITES[comp as 'NCAA' | 'EUR'].name, records.length ? [] : myAwards, comp === 'GLG' ? 'G League' : 'Titular'));
  }
  c.seasons.push(...records);
  // Reputation / fame from awards and team success
  for (const a of myAwards) {
    const rep = { mvp: 15, fmvp: 10, champion: 8, allNba1: 8, allNba2: 6, allNba3: 4, dpoy: 8, roy: 6, smoy: 4, mip: 4, allStar: 0 }[a as string] ?? 2;
    c.reputation = clamp(c.reputation + rep, 0, 100);
    c.fame = clamp(c.fame + rep * 0.8, 0, 100);
    addNews(c, 'award', AWARD_LABEL[a] ?? a, `${fullName(u)} recibe el reconocimiento: ${AWARD_LABEL[a] ?? a} (${seasonLabel(L.season)}).`, 'good');
  }
  // Goals
  const mainStats = u.season.gp ? u.season : c.satStats;
  for (const g of c.goals) {
    if (g.status !== 'active') continue;
    const d = goalDef(g.id);
    const [ok, text] = d.check(mainStats, c, u);
    g.progress = text;
    g.status = ok ? 'done' : 'failed';
    const sign = ok ? 1 : -0.5;
    c.reputation = clamp(c.reputation + d.reward.reputation * sign, 0, 100);
    c.morale = clamp(c.morale + d.reward.morale * sign, 0, 100);
    c.trust = clamp(c.trust + d.reward.trust * sign, 0, 100);
    if (ok && d.reward.pot) u.pot = Math.min(99, u.pot + d.reward.pot);
  }
  // Money
  const salary = u.contract && (onRoster || u.contract.kind === 'gleague' || u.contract.kind === 'two-way') ? salaryIn(u.contract, L.season) : 0;
  const overseas = c.flags.overseasSalary ?? 0;
  c.earnings += salary + c.endorsement + overseas;
  delete c.flags.overseasSalary;
  // Summary
  const a = averages(mainStats);
  const comp = currentComp(c);
  const summary: SeasonSummary = {
    season: L.season,
    lines: [
      { label: 'Competición', value: u.season.gp ? 'NBA' : c.satellite ? SATELLITES[c.satellite.comp as 'NCAA' | 'EUR' | 'GLG'].name : comp },
      { label: 'Partidos', value: `${mainStats.gp} (${mainStats.gs} de titular)` },
      { label: 'Puntos', value: f1(a.ppg) },
      { label: 'Rebotes', value: f1(a.rpg) },
      { label: 'Asistencias', value: f1(a.apg) },
      { label: 'Tiro', value: `${fpct(a.fgp)} TC · ${fpct(a.tpp)} T3 · ${fpct(a.ftp)} TL` },
      { label: 'OVR', value: `${c.seasonOvrStart} → ${u.ovr}`, tone: u.ovr >= c.seasonOvrStart ? 'good' : 'bad' },
    ],
    highlights: [],
    awards: myAwards.map((x) => AWARD_LABEL[x] ?? x),
    goals: c.goals.map((g) => ({ ...g })),
    decisions: c.decisions.filter((d) => d.season === L.season).map((d) => `${d.title}: ${d.choice}`),
    ovrDelta: u.ovr - c.seasonOvrStart,
    teamResult: t && onRoster ? `${teamName(L, t.id)} ${t.w}-${t.l} · ${teamPlayoffResult(L, t.id).label}` : c.satellite ? `${c.satellite.teamName} ${c.satellite.w}-${c.satellite.l}` : '—',
    contract: u.contract ? `${fmtMoney(salaryIn(u.contract, L.season))} · ${yearsLeft(u.contract, L.season) - 1} año(s) restantes tras esta temporada` : 'Sin contrato',
  };
  const best = c.gameLog.filter((g) => g.season === L.season && g.line).sort((x, y) => gameScore(y.line!) - gameScore(x.line!)).slice(0, 3);
  summary.highlights = best.map((g) => `${g.line!.pts} PTS, ${g.line!.oreb + g.line!.dreb} REB, ${g.line!.ast} AST vs ${g.oppName} (${fmtDate(g.season, g.day)})`);
  if (ps.champion) summary.highlights.push(`Campeón de la liga: ${teamName(L, ps.champion)}.`);
  c.lastSummary = summary;
  addNews(c, 'league', `${teamName(L, ps.champion!)}, campeón ${seasonLabel(L.season)}`, `MVP: ${awards.mvp ? awards.names[awards.mvp] : '—'}. MVP de las Finales: ${awards.fmvp ? awards.names[awards.fmvp] : '—'}.`, 'neutral');
  if (c.phase === 'predraft' && c.predraft) {
    c.predraft.step = 'decision';
    c.predraft.seasonsPlayed++;
  } else {
    c.phase = 'season-end';
  }
  achievementsCheck(c);
  void absDay;
  void emptyStats;
}
