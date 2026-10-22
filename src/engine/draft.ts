import type { League, Player, Pos, Prospect } from './types';
import { RULES, DRAFT_GATE, minSalary, rookieScale } from './config';
import { generatePlayer, fullName } from './players';
import { makeSalaries } from './contracts';
import { newPlayerId } from './league';
import { clamp, rngFor, type Rng } from './rng';
import { standings } from './season';

export function prospectValue(ovr: number, pot: number, age: number) {
  return pot * 0.62 + ovr * 0.48 - (age - 19) * 1.6;
}

const CLASS_SIZE = 72;

/** Each prospect has its own RNG stream, so any one can be regenerated exactly. */
function prospectPlayer(seed: number, season: number, i: number): { p: Player; value: number } {
  const strength = rngFor(seed, 'draft-strength', season).normal(0, 1.5); // some classes are deeper
  const rng = rngFor(seed, 'draft-class', season, i);
  const age = rng.weighted([19, 20, 21, 22, 23], (a) => [30, 26, 20, 16, 8][a - 19]);
  const tier = i / CLASS_SIZE;
  const ovr = Math.round(clamp(rng.normal(68 - tier * 13 + strength, 3), 48, 78));
  const pot = Math.round(clamp(ovr + rng.normal(16 - (age - 19) * 3 - tier * 4, 5), ovr + 1, 97));
  const p = generatePlayer(rng, { id: `dp-${season}-${i}`, level: ovr, age, season, pot });
  p.yearsPro = 0;
  return { p, value: prospectValue(p.ovr, p.pot, age) + rng.normal(0, 2) };
}

export function generateDraftClass(seed: number, season: number): Prospect[] {
  const out: Prospect[] = [];
  for (let i = 0; i < CLASS_SIZE; i++) {
    const { p, value } = prospectPlayer(seed, season, i);
    out.push({ id: p.id, name: fullName(p), nat: p.nat, pos: p.pos, age: p.age, ovr: p.ovr, pot: p.pot, arch: p.arch, value });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function draftCutoff(cls: Prospect[], picks = DRAFT_GATE.picks, margin = DRAFT_GATE.margin): number {
  const sorted = cls.filter((p) => !p.isUser).sort((a, b) => b.value - a.value);
  if (!sorted.length) return Number.POSITIVE_INFINITY;
  return sorted[clamp(picks - 3, 0, sorted.length - 1)].value + margin;
}

export interface DraftVerdict { value: number; cutoff: number; interested: boolean; rank: number; }

export function draftVerdict(cls: Prospect[], value: number, picks = DRAFT_GATE.picks, margin = DRAFT_GATE.margin): DraftVerdict {
  const cutoff = draftCutoff(cls, picks, margin);
  const sorted = cls.filter((p) => !p.isUser).sort((a, b) => b.value - a.value);
  return { value, cutoff, interested: Number.isFinite(value) && value >= cutoff, rank: sorted.filter((p) => p.value > value).length + 1 };
}

/** Recreates the full player for a drafted NPC prospect (deterministic). */
export function materializeProspect(seed: number, season: number, pr: Prospect, league: League): Player {
  const { p } = prospectPlayer(seed, season, Number(pr.id.split('-')[2]));
  p.id = newPlayerId(league);
  return p;
}

export interface LotteryEntry { teamId: string; balls: number; preRank: number }

export function lotteryPool(league: League): LotteryEntry[] {
  const ps = league.postseason;
  const all = standings(league).reverse(); // worst first
  if (RULES.lotteryFormat === 'classic2019' || !ps) {
    const playoffTeams = new Set(ps ? ps.series.filter((s) => s.round === 1).flatMap((s) => [s.high, s.low]) : []);
    const odds = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
    return all.filter((t) => !playoffTeams.has(t.id)).slice(0, 14).map((t, i) => ({ teamId: t.id, balls: odds[i], preRank: i + 1 }));
  }
  // 3-2-1 format (approved May 2026): 16 teams.
  const pool: LotteryEntry[] = [];
  const losers78 = ps.playIn.filter((g) => g.id.endsWith('-78')).map((g) => (g.winner === g.home ? g.away : g.home));
  const seeds910 = (['E', 'W'] as const).flatMap((c) => [ps.seeds[c][8], ps.seeds[c][9]]);
  const nonPlayIn = (['E', 'W'] as const).flatMap((c) => ps.seeds[c].slice(10));
  const ordered = all.map((t) => t.id);
  const worst3 = ordered.filter((id) => nonPlayIn.includes(id)).slice(0, 3);
  for (const id of ordered) {
    let balls = 0;
    if (nonPlayIn.includes(id)) balls = worst3.includes(id) ? 2 : 3;
    else if (seeds910.includes(id)) balls = 2;
    else if (losers78.includes(id)) balls = 1;
    if (balls) pool.push({ teamId: id, balls, preRank: pool.length + 1 });
  }
  return pool;
}

export function runLottery(league: League, seed: number): { order: string[]; moves: { teamId: string; from: number; to: number }[] } {
  const rng = rngFor(seed, 'lottery', league.season);
  const pool = lotteryPool(league);
  const drawn: string[] = [];
  const remaining = [...pool];
  for (let k = 0; k < RULES.lotteryPicksDrawn && remaining.length; k++) {
    let pick = rng.weighted(remaining, (e) => e.balls);
    if (k === 0 && RULES.lotteryFormat === '321' && pick.teamId === league.lastNo1 && remaining.length > 1) {
      pick = rng.weighted(remaining.filter((e) => e.teamId !== league.lastNo1), (e) => e.balls);
    }
    drawn.push(pick.teamId);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  let lotteryOrder = [...drawn, ...remaining.map((e) => e.teamId)];
  if (RULES.lotteryFormat === '321') {
    // The three worst records cannot fall below pick 12.
    const worst3 = pool.filter((e) => e.balls === 2 && e.preRank <= 3).map((e) => e.teamId);
    for (const id of worst3) {
      const idx = lotteryOrder.indexOf(id);
      if (idx > 11) {
        lotteryOrder.splice(idx, 1);
        lotteryOrder.splice(11, 0, id);
      }
    }
  }
  const lotterySet = new Set(lotteryOrder);
  const rest = standings(league).reverse().map((t) => t.id).filter((id) => !lotterySet.has(id));
  const round1 = [...lotteryOrder, ...rest];
  const round2 = standings(league).reverse().map((t) => t.id);
  league.lastNo1 = round1[0];
  const moves = pool.map((e) => ({ teamId: e.teamId, from: e.preRank, to: round1.indexOf(e.teamId) + 1 }));
  return { order: [...round1, ...round2], moves };
}

export function positionNeeds(league: League, teamId: string): Record<Pos, number> {
  const t = league.teams[teamId];
  const counts: Record<Pos, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  const quality: Record<Pos, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  for (const id of t.roster) {
    const p = league.players[id];
    if (!p) continue;
    counts[p.pos]++;
    quality[p.pos] = Math.max(quality[p.pos], p.ovr);
  }
  const needs = {} as Record<Pos, number>;
  for (const pos of Object.keys(counts) as Pos[]) needs[pos] = clamp((3 - counts[pos]) * 1.5 + (78 - quality[pos]) * 0.12, -2, 5);
  return needs;
}

/** Each team picks the best prospect on its own (noisy, need-adjusted) board. */
export function simulateDraft(league: League, seed: number, order: string[], prospects: Prospect[], userBoost = 0): { pick: number; teamId: string; prospectId: string }[] {
  const available = [...prospects];
  const picks: { pick: number; teamId: string; prospectId: string }[] = [];
  const total = Math.min(order.length, RULES.roundSize * RULES.rounds);
  for (let i = 0; i < total && available.length; i++) {
    const teamId = order[i];
    const needs = positionNeeds(league, teamId);
    const teamRng: Rng = rngFor(seed, 'board', league.season, teamId, i + 1);
    const rebuilding = league.teams[teamId].status === 'rebuild';
    const best = available
      .map((pr) => ({
        pr,
        s: pr.value + needs[pr.pos] * 0.8 + (rebuilding ? (pr.pot - pr.ovr) * 0.1 : (pr.ovr - 60) * 0.1) + teamRng.normal(0, 1.4) + (pr.isUser ? userBoost : 0),
      }))
      .sort((a, b) => b.s - a.s)[0];
    picks.push({ pick: i + 1, teamId, prospectId: best.pr.id });
    available.splice(available.indexOf(best.pr), 1);
  }
  return picks;
}

export function rookieContract(p: Player, teamId: string, pick: number, season: number) {
  if (pick <= RULES.roundSize) {
    const first = rookieScale(pick, season);
    p.contract = { teamId, salaries: makeSalaries(first, 4, 0.045), startSeason: season, kind: 'rookie', rookieScale: true, option: { type: 'team', season: season + 2 } };
  } else {
    p.contract = { teamId, salaries: makeSalaries(minSalary(0, season), 2, 0.04), startSeason: season, kind: 'minimum' };
  }
}

export function mockRange(prospects: Prospect[], userId: string, rng: Rng) {
  const sorted = [...prospects].sort((a, b) => b.value - a.value);
  const rank = sorted.findIndex((p) => p.id === userId) + 1;
  const spread = 3 + Math.round(rank / 8);
  const center = clamp(rank + Math.round(rng.normal(0, 1.5)), 1, 70);
  return { pickLow: clamp(center - spread, 1, 60), pickHigh: clamp(center + spread, 1, 61), rank };
}
