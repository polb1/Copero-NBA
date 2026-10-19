import type { Archetype, Attrs, BoxLine, Coach, League, Player } from './types';
import { archetypeDef, composites } from './attributes';
import { MINUTES_TEMPLATE, PLAYOFF_MINUTES_TEMPLATE, SIM } from './config';
import { clamp, type Rng } from './rng';

export interface SimPlayer {
  id: string;
  attrs: Attrs;
  ovr: number;
  arch: Archetype;
  pos: string;
  form: number;
  fatigue: number;
  hurt: boolean; // playing through an injury
  /** Mental-state multiplier (morale, chemistry, pressure); only the user's player has one. */
  boost?: number;
  minutes: number;
  starter: boolean;
}

export interface SimTeam {
  id: string;
  pace: number;
  style: Coach['style'];
  players: SimPlayer[];
}

export interface GameResult {
  hs: number;
  as: number;
  ot: number;
  home: BoxLine[];
  away: BoxLine[];
}

export interface RotationOptions {
  playoff?: boolean;
  userId?: string;
  userTrust?: number;
  /** User currently allowed to play in the NBA (false when assigned to G League or out of two-way games). */
  userAvailable?: boolean;
  /** Extra minutes multiplier for the user from events (e.g., earned or lost role). */
  userMinutesBoost?: number;
  /** The user's mental-state performance boost (see mindset.ts). */
  userBoost?: number;
}

/** Coach's rotation: orders available players by effective rating and assigns minutes. */
export function buildRotation(league: League, teamId: string, o: RotationOptions = {}): SimTeam {
  const t = league.teams[teamId];
  const avail: Player[] = [];
  for (const pid of t.roster) {
    const p = league.players[pid];
    if (!p) continue;
    if (p.injury && !p.injury.playingThrough) continue;
    if (p.isUser) {
      if (o.userAvailable === false) continue;
    } else if (p.contract?.kind === 'two-way') continue;
    avail.push(p);
  }
  const eff = (p: Player) => {
    let e = p.ovr + p.form * 0.35 - p.fatigue * 0.04 - (p.injury ? 4 : 0);
    if (p.isUser) e += ((o.userTrust ?? 50) - 50) * 0.13;
    if (p.age <= 22) e -= Math.max(0, 55 - t.coach.patience) * 0.04;
    return e;
  };
  // Each player's rating is computed once, not on every comparison of the sort.
  const effOf = new Map(avail.map((p) => [p, eff(p)] as const));
  avail.sort((a, b) => effOf.get(b)! - effOf.get(a)!);
  // Positional sanity for the starting five: at least one guard and one big.
  const isGuard = (p: Player) => p.pos === 'PG' || p.pos === 'SG';
  const isBig = (p: Player) => p.pos === 'PF' || p.pos === 'C';
  const ensure = (test: (p: Player) => boolean) => {
    if (avail.slice(0, 5).some(test)) return;
    const idx = avail.findIndex((p, i) => i >= 5 && test(p));
    if (idx > 0) {
      const [p] = avail.splice(idx, 1);
      avail.splice(4, 0, p);
    }
  };
  ensure(isGuard);
  ensure(isBig);
  const template = o.playoff ? PLAYOFF_MINUTES_TEMPLATE : MINUTES_TEMPLATE;
  const raw = avail.map((p, i) => {
    let m = template[i] ?? 0;
    m *= 0.88 + (p.attrs.stamina / 100) * 0.2;
    if (p.injury?.playingThrough) m *= 0.85;
    if (p.isUser && o.userMinutesBoost) m *= o.userMinutesBoost;
    return Math.min(44, m);
  });
  const total = raw.reduce((s, v) => s + v, 0) || 1;
  const scale = 240 / total;
  const players: SimPlayer[] = avail.map((p, i) => ({
    id: p.id,
    attrs: p.attrs,
    ovr: p.ovr,
    arch: p.arch,
    pos: p.pos,
    form: p.form,
    fatigue: p.fatigue,
    hurt: !!p.injury?.playingThrough,
    boost: p.isUser ? o.userBoost : undefined,
    minutes: Math.min(46, raw[i] * scale),
    starter: i < 5,
  }));
  return { id: teamId, pace: t.pace, style: t.coach.style, players };
}

interface Acc extends BoxLine {}

function blank(p: SimPlayer): Acc {
  return { pid: p.id, min: 0, pts: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, pm: 0, starter: p.starter };
}

const sumOf = (w: number[]) => {
  let total = 0;
  for (const x of w) total += x;
  return total;
};

/**
 * Hands out `n` events by weight. Same draws and same float sums as a weighted pick that re-sums every time, but the
 * total is only recomputed when a cap zeroes a weight (this runs ~8 times per team per game).
 */
function distribute(rng: Rng, n: number, weights: number[], cap?: number[]): number[] {
  const out = weights.map(() => 0);
  if (!weights.some((w) => w > 0)) return out;
  const w = [...weights];
  let total = sumOf(w);
  for (let k = 0; k < n; k++) {
    let r = rng.next() * total;
    let i = w.length - 1;
    for (let j = 0; j < w.length; j++) {
      r -= w[j];
      if (r <= 0) { i = j; break; }
    }
    out[i]++;
    if (cap && out[i] >= cap[i]) {
      w[i] = 0;
      if (!w.some((x) => x > 0)) break;
      total = sumOf(w);
    }
  }
  return out;
}

const STYLE_THREE: Record<Coach['style'], number> = { pace: 1.08, motion: 1.06, iso: 0.92, defense: 0.95, balanced: 1 };

type Comp = ReturnType<typeof composites>;
interface Ctx {
  p: SimPlayer;
  c: Comp;
  mult: number;
  share: number; // minutes share (0-1 of 48)
}

function prepare(team: SimTeam, minutesOverride?: number[]): Ctx[] {
  return team.players.map((p, i) => {
    const c = composites(p.attrs);
    const mult = 1 + p.form * SIM.formEffect - p.fatigue * SIM.fatiguePenalty - (p.hurt ? 0.06 : 0) + (p.boost ?? 0);
    const min = minutesOverride ? minutesOverride[i] : p.minutes;
    return { p, c, mult, share: min / 48 };
  });
}

function talent(ctx: Ctx[]) {
  let off = 0, def = 0, perD = 0, intD = 0, stl = 0, blk = 0, reb = 0, sec = 0, w = 0;
  for (const x of ctx) {
    const m = x.share;
    off += x.p.ovr * x.mult * m;
    def += x.c.defense * x.mult * m;
    perD += x.c.perimeterD * m;
    intD += x.c.interiorD * m;
    stl += x.c.steal * m;
    blk += x.c.block * m;
    reb += x.c.rebound * m;
    sec += x.c.ballSecurity * m;
    w += m;
  }
  w = w || 1;
  return { off: off / w, def: def / w, perD: perD / w, intD: intD / w, stl: stl / w, blk: blk / w, reb: reb / w, sec: sec / w };
}

/** Offense of `o` against defense of `d` for `poss` possessions. Mutates the accumulators. */
function simulateOffense(rng: Rng, o: Ctx[], d: Ctx[], oa: Acc[], da: Acc[], poss: number, style: Coach['style'], home: boolean) {
  const to = talent(o);
  const td = talent(d);
  const luck = rng.normal(0, SIM.gameVariance);
  const talentDiff = to.off - td.off;
  const tovRate = clamp(SIM.tovRate * (1 + (62 - to.sec) * 0.006) * (1 + (td.stl - 58) * 0.004), 0.08, 0.2);
  const tov = rng.binomial(poss, tovRate);
  const ftWeights = o.map((x) => x.share * archetypeDef(x.p.arch).sim.ftRate * Math.pow(Math.max(30, x.c.inside) / 65, 2) * archetypeDef(x.p.arch).sim.usage);
  const ftFactor = ftWeights.reduce((s, v) => s + v, 0) / Math.max(0.01, o.reduce((s, x) => s + x.share, 0));
  const fta = Math.max(4, Math.round(poss * SIM.ftaPerPoss * clamp(ftFactor, 0.6, 1.5) + rng.normal(0, 3.5)));
  const shotPoss = Math.max(40, poss - tov - 0.44 * fta);
  const fga = Math.round(shotPoss * 1.13);

  const usage = o.map((x) => {
    const a = archetypeDef(x.p.arch).sim;
    const score = (0.45 * x.p.ovr + 0.3 * x.c.creation + 0.25 * Math.max(x.c.three, x.c.inside)) / 70;
    return x.share * Math.pow(Math.max(0.3, score * x.mult), SIM.usagePower) * a.usage;
  });
  const fgaBy = distribute(rng, fga, usage);
  const ftaBy = distribute(rng, fta, ftWeights);
  let misses2 = 0;
  let misses = 0;
  let fgmTeam = 0;
  o.forEach((x, i) => {
    const acc = oa[i];
    const a = archetypeDef(x.p.arch).sim;
    const n = fgaBy[i];
    const shooter = x.c.three;
    const threeRate = shooter < 42 ? 0.02 : clamp(a.threeRate * (0.55 + (shooter - 45) / 55) * STYLE_THREE[style] * 1.05, 0, 0.85);
    const tpa = rng.binomial(n, threeRate);
    const twoA = n - tpa;
    const playerLuck = rng.normal(0, 0.05 * (1.25 - x.p.attrs.consistency / 100));
    const adj = talentDiff * SIM.teamTalentEffect * 0.5 + luck + playerLuck + (home ? SIM.homeEdge : 0);
    const p3 = clamp(SIM.base3 + (shooter * x.mult - 72) * 0.0042 - (td.perD - 62) * SIM.defenseEffect * 0.5 + adj, 0.12, 0.52);
    const insideSkill = (x.c.inside * 0.62 + x.c.mid * 0.38) * x.mult;
    const p2 = clamp(SIM.base2 + (insideSkill - 68) * 0.0048 - (td.intD - 60) * SIM.defenseEffect * 0.6 + adj, 0.33, 0.7);
    const tpm = rng.binomial(tpa, p3);
    const twoM = rng.binomial(twoA, p2);
    const pft = clamp(SIM.baseFt + (x.c.ft - 64) * 0.006 + rng.normal(0, 0.03), 0.4, 0.95);
    const ftm = rng.binomial(ftaBy[i], pft);
    acc.fga += n;
    acc.tpa += tpa;
    acc.tpm += tpm;
    acc.fgm += tpm + twoM;
    acc.fta += ftaBy[i];
    acc.ftm += ftm;
    acc.pts += 2 * twoM + 3 * tpm + ftm;
    misses2 += twoA - twoM;
    misses += n - tpm - twoM;
    fgmTeam += tpm + twoM;
  });
  // Rebounds from real misses
  const orebRate = clamp(SIM.orebRate * (1 + (to.reb - td.reb) * 0.012), 0.15, 0.38);
  const oreb = rng.binomial(misses, orebRate);
  const dreb = misses - oreb;
  const orebBy = distribute(rng, oreb, o.map((x) => x.share * Math.pow(x.p.attrs.oreb / 60, 2.4) * archetypeDef(x.p.arch).sim.boards));
  const drebBy = distribute(rng, dreb, d.map((x) => x.share * Math.pow(x.p.attrs.dreb / 60, 1.8) * archetypeDef(x.p.arch).sim.boards));
  orebBy.forEach((v, i) => (oa[i].oreb += v));
  drebBy.forEach((v, i) => (da[i].dreb += v));
  // Assists
  const ast = rng.binomial(fgmTeam, SIM.astPerFgm);
  const astBy = distribute(rng, ast, o.map((x) => x.share * Math.pow(x.c.playmaking / 60, 3) * archetypeDef(x.p.arch).sim.creation));
  astBy.forEach((v, i) => (oa[i].ast += v));
  // Turnovers / steals / blocks
  const tovBy = distribute(rng, tov, o.map((x, i) => (usage[i] * 0.6 + x.share * 0.4) * Math.max(0.3, (112 - x.c.ballSecurity) / 50)));
  tovBy.forEach((v, i) => (oa[i].tov += v));
  const stl = rng.binomial(tov, clamp(SIM.stlPerTov * (td.stl / 58), 0.3, 0.75));
  distribute(rng, stl, d.map((x) => x.share * Math.pow(x.c.steal / 60, 2.5))).forEach((v, i) => (da[i].stl += v));
  const blk = rng.binomial(misses2, clamp(SIM.blkPer2Miss * (td.blk / 55), 0.05, 0.25));
  distribute(rng, blk, d.map((x) => x.share * Math.pow(x.c.block / 60, 4))).forEach((v, i) => (da[i].blk += v));
}

function chunk(rng: Rng, home: SimTeam, away: SimTeam, poss: number, hm: number[], am: number[], ha: Acc[], aa: Acc[]) {
  const h = prepare(home, hm);
  const a = prepare(away, am);
  simulateOffense(rng, h, a, ha, aa, poss, home.style, true);
  simulateOffense(rng, a, h, aa, ha, poss, away.style, false);
  hm.forEach((m, i) => (ha[i].min += m));
  am.forEach((m, i) => (aa[i].min += m));
}

function otMinutes(team: SimTeam): number[] {
  const order = team.players.map((p, i) => ({ i, m: p.minutes })).sort((x, y) => y.m - x.m);
  const out = team.players.map(() => 0);
  const shares = [4.6, 4.5, 4.4, 4.2, 4, 1.6, 1.0, 0.7];
  let total = 0;
  order.forEach((o, k) => {
    if (k < shares.length) {
      out[o.i] = shares[k];
      total += shares[k];
    }
  });
  return out.map((m) => (m * 25) / total);
}

export function simulateGame(rng: Rng, home: SimTeam, away: SimTeam, opts: { playoff?: boolean; length?: number; pace?: number } = {}): GameResult {
  const ha = home.players.map(blank);
  const aa = away.players.map(blank);
  const pace = opts.pace ?? (home.pace + away.pace) / 2 - (opts.playoff ? 2.5 : 0);
  const poss = Math.round(pace + rng.normal(0, SIM.paceSd));
  chunk(rng, home, away, poss, home.players.map((p) => p.minutes), away.players.map((p) => p.minutes), ha, aa);
  const total = (acc: Acc[]) => acc.reduce((s, x) => s + x.pts, 0);
  let ot = 0;
  while (total(ha) === total(aa)) {
    ot++;
    if (ot > 5) {
      // Extremely rare: settle with a final free throw for the home team's top player.
      ha[0].fta++;
      ha[0].ftm++;
      ha[0].pts++;
      break;
    }
    chunk(rng, home, away, Math.round(poss * 5 / 48 + rng.normal(0, 1)), otMinutes(home), otMinutes(away), ha, aa);
  }
  // Fouls (capped at 6), +/- (zero-sum noise around minutes-weighted margin)
  for (const [acc, team] of [[ha, home], [aa, away]] as const) {
    const fouls = Math.max(8, Math.round(rng.normal(SIM.foulsPerTeam + ot * 2, 3)));
    const w = team.players.map((p, i) => acc[i].min * (1 + (60 - p.attrs.defIQ) * 0.01) * (p.pos === 'C' || p.pos === 'PF' ? 1.25 : 1));
    distribute(rng, fouls, w, team.players.map(() => 6)).forEach((v, i) => (acc[i].pf = v));
  }
  const hs = total(ha);
  const as = total(aa);
  const gameMin = (opts.length ?? 48) + ot * 5;
  for (const [acc, margin] of [[ha, hs - as], [aa, as - hs]] as const) {
    const noise = acc.map((x) => (x.min > 0 ? rng.normal(0, 4) * (x.min / gameMin) : 0));
    const played = acc.filter((x) => x.min > 0);
    const meanNoise = noise.reduce((s, v) => s + v, 0) / Math.max(1, played.length);
    acc.forEach((x, i) => {
      if (x.min <= 0) return;
      const impact = ((acc === ha ? home : away).players[i].ovr - 72) * 0.12 * (x.min / gameMin);
      x.pm = Math.round(margin * (x.min / gameMin) + noise[i] - meanNoise + impact);
    });
  }
  for (const acc of [ha, aa]) for (const x of acc) x.min = Math.round(x.min * 10) / 10;
  return { hs, as, ot, home: ha, away: aa };
}

export function gameScore(b: BoxLine) {
  return b.pts + 0.4 * b.fgm - 0.7 * b.fga - 0.4 * (b.fta - b.ftm) + 0.7 * b.oreb + 0.3 * b.dreb + b.stl + 0.7 * b.ast + 0.7 * b.blk - 0.4 * b.pf - b.tov;
}

