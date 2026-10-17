import type { AttrKey, Player, TrainingFocus } from './types';
import { ATTR_KEYS, TRAINING_AREAS, archetypeDef, computeOvr } from './attributes';
import { clamp, type Rng } from './rng';
import { refreshOvr } from './players';

const ATHLETIC: AttrKey[] = ['speed', 'accel', 'vert', 'stamina'];
const MENTAL: AttrKey[] = ['offIQ', 'defIQ', 'consistency'];

export function ageGrowthFactor(age: number) {
  if (age <= 20) return 1.15;
  if (age <= 22) return 1.0;
  if (age <= 25) return 0.72;
  if (age <= 28) return 0.42;
  if (age <= 31) return 0.22;
  return 0.1;
}

export interface TrainingContext {
  focus: TrainingFocus;
  intensity: 'light' | 'normal' | 'intense';
  workEthic: number; // 0-100
  coachRating: number;
  minutesShare: number; // 0-1, recent minutes / 36
  healthy: boolean;
}

export interface TrainingResult {
  points: number;
  gains: { attr: AttrKey; amount: number }[];
  fatigue: number;
}

/** One week of individual training. Points accumulate; attributes only rise when enough work is banked. */
export function trainWeek(p: Player, bank: Partial<Record<TrainingFocus, number>>, ctx: TrainingContext, rng: Rng): TrainingResult {
  const res: TrainingResult = { points: 0, gains: [], fatigue: 0 };
  if (ctx.focus === 'rest') {
    res.fatigue = -14;
    return res;
  }
  const intensity = ctx.intensity === 'light' ? 0.6 : ctx.intensity === 'intense' ? 1.4 : 1;
  res.fatigue = ctx.intensity === 'light' ? -3 : ctx.intensity === 'intense' ? 9 : 3;
  const gap = clamp(((p.hiddenPot ?? p.pot) - p.ovr) / 14, 0.08, 1.5);
  const affinity = archetypeDef(p.arch).growth.includes(ctx.focus) ? 1.15 : 1;
  const ethic = 0.6 + ctx.workEthic / 125;
  const coach = 0.8 + ctx.coachRating / 250;
  const minutes = 0.85 + Math.min(1, ctx.minutesShare) * 0.3;
  const health = ctx.healthy ? 1 : 0.35;
  const fatiguePenalty = p.fatigue > 70 ? 0.6 : 1;
  const pts = ageGrowthFactor(p.age) * gap * intensity * affinity * ethic * coach * minutes * health * fatiguePenalty * rng.range(0.7, 1.3);
  res.points = pts;
  const key = ctx.focus;
  bank[key] = (bank[key] ?? 0) + pts;
  const area = TRAINING_AREAS[key].attrs;
  const threshold = key === 'balanced' ? 2 : 3.2;
  while ((bank[key] ?? 0) >= threshold) {
    bank[key]! -= threshold;
    // Prefer weaker attributes in the area; nothing grows past the realistic ceiling.
    const ceiling = Math.min(99, p.pot + 12);
    const candidates = area.filter((k) => p.attrs[k] < ceiling);
    if (!candidates.length) break;
    const attr = rng.weighted(candidates, (k) => 110 - p.attrs[k]);
    p.attrs[attr] = Math.min(99, p.attrs[attr] + 1);
    const g = res.gains.find((x) => x.attr === attr);
    if (g) g.amount++;
    else res.gains.push({ attr, amount: 1 });
  }
  refreshOvr(p);
  return res;
}

/** Shift attributes so that OVR moves by roughly `delta`, with age-appropriate patterns. */
export function shiftOvr(p: Player, delta: number, rng: Rng) {
  if (Math.abs(delta) < 0.3) return;
  const target = p.ovr + delta;
  for (let iter = 0; iter < 30; iter++) {
    const cur = computeOvr(p.attrs, p.pos);
    if (delta > 0 ? cur >= Math.round(target) : cur <= Math.round(target)) break;
    for (const k of ATTR_KEYS) {
      let w = 1;
      if (delta < 0) {
        if (ATHLETIC.includes(k)) w = p.age >= 30 ? 2.2 : 1.4;
        else if (MENTAL.includes(k)) w = p.age >= 34 ? 0.6 : 0.1;
      } else if (p.age <= 22 && ATHLETIC.includes(k)) w = 1.3;
      else if (MENTAL.includes(k)) w = 1.1;
      const step = Math.sign(delta) * w * rng.range(0.2, 1.1);
      p.attrs[k] = clamp(p.attrs[k] + step, 20, 99);
    }
  }
  for (const k of ATTR_KEYS) p.attrs[k] = Math.round(p.attrs[k]);
  refreshOvr(p);
}

export interface OffseasonDevContext {
  workEthic: number;
  minutesShare: number;
  coachRating: number;
  trainingBonus: number; // from in-season training volume
}

/** Main yearly development / decline step. Returns OVR delta applied. */
export function offseasonDevelopment(p: Player, rng: Rng, ctx?: OffseasonDevContext): number {
  const before = p.ovr;
  const ceiling = p.hiddenPot ?? p.pot;
  const gap = Math.max(0, ceiling - p.ovr);
  let delta: number;
  const a = p.age; // age for the coming season
  if (a <= 21) delta = gap * rng.range(0.06, 0.3);
  else if (a <= 24) delta = gap * rng.range(0.05, 0.26);
  else if (a <= 27) delta = gap * rng.range(0, 0.2) + rng.normal(0, 0.8);
  else if (a <= 30) delta = rng.normal(-0.4, 1.1);
  else if (a <= 33) delta = -rng.range(0.6, 3.2);
  else delta = -rng.range(2, 5.5);
  if (ctx) {
    const ethic = (ctx.workEthic - 50) / 50; // -1..1
    const mins = Math.min(1, ctx.minutesShare);
    if (delta > 0) delta *= 0.7 + ethic * 0.15 + mins * 0.15 + (ctx.coachRating - 60) / 400 + ctx.trainingBonus * 0.5;
    else delta *= 1 - ethic * 0.25 - ctx.trainingBonus * 0.5;
  }
  shiftOvr(p, delta, rng);
  if (p.hiddenPot !== undefined) {
    // The true ceiling drifts a little; the public estimate converges towards it.
    if (p.age <= 24) p.hiddenPot = Math.round(clamp(p.hiddenPot + rng.normal(0, 1.5), p.ovr, 99));
    else p.hiddenPot = Math.max(p.ovr, Math.round(p.hiddenPot - rng.range(0.5, 3)));
    p.pot = Math.max(p.ovr, Math.round(p.pot * 0.6 + p.hiddenPot * 0.4));
    return p.ovr - before;
  }
  // Potential converges with age; youngsters fluctuate.
  if (p.age <= 23) p.pot = Math.round(clamp(p.pot + rng.normal(0, 1.8), p.ovr, 99));
  else if (p.age <= 26) p.pot = Math.max(p.ovr, Math.round(p.pot - rng.range(0, 2)));
  else p.pot = Math.max(p.ovr, Math.round(p.pot - rng.range(1, 4)));
  return p.ovr - before;
}
