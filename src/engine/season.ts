import type { Game, League, Player, Postseason, Series, Team } from './types';
import { buildRotation, simulateGame, gameScore, type GameResult, type RotationOptions, type SimTeam } from './gamesim';
import { addBox } from './stats';
import { injuryRisk, rollInjury } from './injuries';
import { clamp, rngFor } from './rng';
import { RULES } from './config';

export interface GameContext {
  kind: 'regular' | 'playin' | 'playoff';
  home: string;
  away: string;
  label?: string;
  seriesId?: string;
  gameNo?: number;
}

export interface DayHooks {
  rotation?(teamId: string, playoff: boolean): RotationOptions;
  onGame?(ctx: GameContext, res: GameResult, home: SimTeam, away: SimTeam): void;
  /** Called for each player who might get injured; return true to let the hook handle it (user). */
  onInjuryCheck?(p: Player, minutes: number): boolean;
}

export function dailyRecovery(league: League) {
  for (const id in league.players) {
    const p = league.players[id];
    if (p.retired) continue;
    p.fatigue = Math.max(0, p.fatigue - 9);
    if (p.injury) {
      p.injury.daysLeft--;
      if (p.injury.daysLeft <= 0) p.injury = null;
    }
  }
}

function afterGameForPlayer(league: League, seed: number, ctx: GameContext, gameKey: string, b: { pid: string; min: number }, gs: number, hooks: DayHooks) {
  const p = league.players[b.pid];
  if (!p || b.min <= 0) return;
  p.fatigue = clamp(p.fatigue + b.min * 0.36, 0, 100);
  const expected = Math.max(0, (p.ovr - 55) * 0.38) * (b.min / 34);
  p.form = clamp(p.form * 0.82 + clamp((gs - expected) * 0.22, -2.5, 2.5), -10, 10);
  if (hooks.onInjuryCheck?.(p, b.min)) return;
  const rng = rngFor(seed, 'inj', gameKey, p.id);
  if (rng.chance(injuryRisk(p, b.min, 0))) {
    const inj = rollInjury(rng);
    if (!p.injury || p.injury.daysLeft < inj.daysLeft) p.injury = inj;
  }
}

export function playGame(league: League, seed: number, ctx: GameContext, gameKey: string, hooks: DayHooks): GameResult {
  const playoff = ctx.kind !== 'regular';
  const home = buildRotation(league, ctx.home, { playoff, ...(hooks.rotation?.(ctx.home, playoff) ?? {}) });
  const away = buildRotation(league, ctx.away, { playoff, ...(hooks.rotation?.(ctx.away, playoff) ?? {}) });
  const res = simulateGame(rngFor(seed, 'game', league.season, gameKey), home, away, { playoff });
  for (const box of [res.home, res.away])
    for (const b of box) {
      const p = league.players[b.pid];
      if (!p) continue;
      if (ctx.kind === 'regular') addBox(p.season, b);
      else if (ctx.kind === 'playoff') addBox(p.playoffs, b);
      if (ctx.seriesId === 'F4-0' && league.postseason && b.min > 0) {
        const fg = (league.postseason.finalsGmsc ??= {});
        fg[b.pid] = (fg[b.pid] ?? 0) + gameScore(b);
      }
      afterGameForPlayer(league, seed, ctx, gameKey, b, gameScore(b), hooks);
    }
  hooks.onGame?.(ctx, res, home, away);
  return res;
}

function recordResult(t: Team, won: boolean, home: boolean, pf: number, pa: number) {
  if (won) t.w++;
  else t.l++;
  if (home) won ? t.homeW++ : t.homeL++;
  else won ? t.awayW++ : t.awayL++;
  t.pf += pf;
  t.pa += pa;
  t.streak = won ? Math.max(1, t.streak + 1) : Math.min(-1, t.streak - 1);
  t.last10 = [...t.last10, won ? 'W' : 'L'].slice(-10) as ('W' | 'L')[];
}

export function playRegularDay(league: League, seed: number, hooks: DayHooks): Game[] {
  league.day++;
  dailyRecovery(league);
  const games = league.schedule.filter((g) => g.day === league.day && !g.played);
  for (const g of games) {
    const res = playGame(league, seed, { kind: 'regular', home: g.home, away: g.away }, String(g.id), hooks);
    g.played = true;
    g.hs = res.hs;
    g.as = res.as;
    g.ot = res.ot;
    recordResult(league.teams[g.home], res.hs > res.as, true, res.hs, res.as);
    recordResult(league.teams[g.away], res.as > res.hs, false, res.as, res.hs);
  }
  return games;
}

export const regularSeasonOver = (league: League) => league.day >= league.lastDay && league.schedule.every((g) => g.played);

export function standings(league: League, conf?: 'E' | 'W'): Team[] {
  return Object.values(league.teams)
    .filter((t) => !conf || t.conf === conf)
    .sort((a, b) => {
      const wa = a.w / Math.max(1, a.w + a.l);
      const wb = b.w / Math.max(1, b.w + b.l);
      if (wb !== wa) return wb - wa;
      const da = a.pf - a.pa;
      const db = b.pf - b.pa;
      if (db !== da) return db - da;
      return a.id.localeCompare(b.id);
    });
}

export const gamesBehind = (leader: Team, t: Team) => ((leader.w - t.w) + (t.l - leader.l)) / 2;

export function startPostseason(league: League) {
  const seeds = { E: standings(league, 'E').map((t) => t.id), W: standings(league, 'W').map((t) => t.id) };
  const ps: Postseason = { playIn: [], series: [], seeds };
  if (RULES.playIn) {
    for (const conf of ['E', 'W'] as const) {
      const s = seeds[conf];
      ps.playIn.push({ id: `${conf}-78`, conf, home: s[6], away: s[7], label: '7.º vs 8.º' });
      ps.playIn.push({ id: `${conf}-910`, conf, home: s[8], away: s[9], label: '9.º vs 10.º' });
    }
  }
  league.postseason = ps;
}

function finalSeeds(ps: Postseason, conf: 'E' | 'W'): string[] {
  const s = ps.seeds[conf].slice(0, RULES.directPlayoffSeeds);
  if (!RULES.playIn) return ps.seeds[conf].slice(0, 8);
  const g78 = ps.playIn.find((g) => g.id === `${conf}-78`)!;
  const g8 = ps.playIn.find((g) => g.id === `${conf}-8`)!;
  return [...s, g78.winner!, g8.winner!];
}

function createRound1(ps: Postseason) {
  for (const conf of ['E', 'W'] as const) {
    const s = finalSeeds(ps, conf);
    const pairs: [number, number][] = [[1, 8], [4, 5], [3, 6], [2, 7]];
    pairs.forEach(([a, b], i) => {
      ps.series.push({ id: `${conf}1-${i}`, round: 1, conf, high: s[a - 1], low: s[b - 1], highSeed: a, lowSeed: b, winsHigh: 0, winsLow: 0 });
    });
  }
}

function seedOf(ps: Postseason, conf: 'E' | 'W', teamId: string) {
  return finalSeeds(ps, conf).indexOf(teamId) + 1;
}

function nextRound(league: League, ps: Postseason, round: number) {
  const prev = ps.series.filter((s) => s.round === round);
  if (round === 3) {
    const e = prev.find((s) => s.conf === 'E')!.winner!;
    const w = prev.find((s) => s.conf === 'W')!.winner!;
    const te = league.teams[e];
    const tw = league.teams[w];
    const eBetter = te.w / (te.w + te.l) >= tw.w / (tw.w + tw.l);
    ps.series.push({ id: 'F4-0', round: 4, conf: 'F', high: eBetter ? e : w, low: eBetter ? w : e, highSeed: 0, lowSeed: 0, winsHigh: 0, winsLow: 0 });
    return;
  }
  for (const conf of ['E', 'W'] as const) {
    const list = prev.filter((s) => s.conf === conf).sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < list.length; i += 2) {
      const a = list[i].winner!;
      const b = list[i + 1].winner!;
      const sa = seedOf(ps, conf, a);
      const sb = seedOf(ps, conf, b);
      const [high, low, hs, ls] = sa <= sb ? [a, b, sa, sb] : [b, a, sb, sa];
      ps.series.push({ id: `${conf}${round + 1}-${i / 2}`, round: round + 1, conf, high, low, highSeed: hs, lowSeed: ls, winsHigh: 0, winsLow: 0 });
    }
  }
}

export const currentRound = (ps: Postseason) => Math.max(0, ...ps.series.map((s) => s.round));

/** Plays one postseason "day". Returns true when the champion has been decided. */
export function playPostseasonDay(league: League, seed: number, hooks: DayHooks): boolean {
  const ps = league.postseason!;
  if (ps.champion) return true;
  league.day++;
  dailyRecovery(league);
  // Play-In
  const pending = ps.playIn.filter((g) => !g.winner && g.home && g.away);
  if (pending.length) {
    for (const g of pending) {
      const res = playGame(league, seed, { kind: 'playin', home: g.home, away: g.away, label: g.label }, `pi-${g.id}`, hooks);
      g.winner = res.hs > res.as ? g.home : g.away;
    }
    for (const conf of ['E', 'W'] as const) {
      const g78 = ps.playIn.find((g) => g.id === `${conf}-78`);
      const g910 = ps.playIn.find((g) => g.id === `${conf}-910`);
      if (g78?.winner && g910?.winner && !ps.playIn.find((g) => g.id === `${conf}-8`)) {
        const loser78 = g78.winner === g78.home ? g78.away : g78.home;
        ps.playIn.push({ id: `${conf}-8`, conf, home: loser78, away: g910.winner, label: 'Por el 8.º puesto' });
      }
    }
    return false;
  }
  if (!ps.series.length) createRound1(ps);
  const round = currentRound(ps);
  const active = ps.series.filter((s) => s.round === round && !s.winner);
  for (const s of active) {
    const n = s.winsHigh + s.winsLow + 1;
    const highHome = [1, 2, 5, 7].includes(n);
    const res = playGame(league, seed, { kind: 'playoff', home: highHome ? s.high : s.low, away: highHome ? s.low : s.high, seriesId: s.id, gameNo: n }, `po-${s.id}-${n}`, hooks);
    const highWon = highHome ? res.hs > res.as : res.as > res.hs;
    if (highWon) s.winsHigh++;
    else s.winsLow++;
    if (s.winsHigh === 4) s.winner = s.high;
    if (s.winsLow === 4) s.winner = s.low;
  }
  if (ps.series.filter((s) => s.round === round).every((s) => s.winner)) {
    if (round === 4) {
      const f = ps.series.find((s) => s.round === 4)!;
      ps.champion = f.winner;
      return true;
    }
    nextRound(league, ps, round);
  }
  return false;
}

export function teamPlayoffResult(league: League, teamId: string): { label: string; round: number } {
  const ps = league.postseason;
  if (!ps) return { label: 'Temporada regular', round: -1 };
  if (ps.champion === teamId) return { label: 'Campeón de la NBA', round: 5 };
  const series = ps.series.filter((s) => s.high === teamId || s.low === teamId);
  if (series.length) {
    const last = series.sort((a, b) => b.round - a.round)[0];
    const names = ['', 'Primera ronda', 'Semifinales de conferencia', 'Final de conferencia', 'Finales NBA'];
    if (last.winner && last.winner !== teamId) return { label: `Eliminado en ${names[last.round]}`, round: last.round };
    return { label: `En juego: ${names[last.round]}`, round: last.round };
  }
  if (ps.playIn.some((g) => g.home === teamId || g.away === teamId)) return { label: 'Eliminado en el Play-In', round: 0 };
  return { label: 'Sin playoffs', round: -1 };
}

export function seriesFor(league: League, teamId: string): Series | undefined {
  const ps = league.postseason;
  if (!ps) return undefined;
  return ps.series.filter((s) => s.high === teamId || s.low === teamId).sort((a, b) => b.round - a.round)[0];
}
