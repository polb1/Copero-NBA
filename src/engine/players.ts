import type { Archetype, Attrs, Player, Pos, StatLine } from './types';
import { ARCHETYPES, buildAttrs, computeOvr } from './attributes';
import { COUNTRIES, type Country } from '../content/names';
import { clamp, type Rng } from './rng';

export function emptyStats(): StatLine {
  return { gp: 0, gs: 0, min: 0, pts: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, pm: 0, dd: 0, td: 0, qd: 0, gmsc: 0 };
}

export const HEIGHT_RANGE: Record<Pos, [number, number]> = {
  PG: [183, 196], SG: [191, 201], SF: [198, 206], PF: [203, 211], C: [208, 222],
};

export function physique(pos: Pos, rng: Rng) {
  const [lo, hi] = HEIGHT_RANGE[pos];
  const height = Math.round(rng.range(lo, hi));
  const weight = Math.round(height * 0.52 - 6 + rng.normal(0, 5));
  return { height, weight };
}

export function pickCountry(rng: Rng): Country {
  return rng.weighted(COUNTRIES, (c) => c.weight);
}

export function pickArchetype(pos: Pos, rng: Rng): Archetype {
  const options = ARCHETYPES.filter((a) => a.positions.includes(pos));
  return rng.weighted(options, (a) => (a.id === 'allAround' ? 0.4 : 1)).id;
}

/** Effect of height/weight relative to position average on physical attributes. */
export function applyPhysique(a: Attrs, pos: Pos, height: number, weight: number) {
  const [lo, hi] = HEIGHT_RANGE[pos];
  const rel = (height - (lo + hi) / 2) / ((hi - lo) / 2); // -1..1
  const heavy = (weight - (height * 0.52 - 6)) / 8;
  const adj = (k: keyof Attrs, v: number) => (a[k] = Math.round(clamp(a[k] + v, 20, 99)));
  adj('block', rel * 4);
  adj('dreb', rel * 3);
  adj('intD', rel * 2);
  adj('speed', -rel * 3 - heavy * 2);
  adj('accel', -rel * 2 - heavy * 2);
  adj('strength', heavy * 4 + rel * 1);
  adj('handle', -rel * 2);
}

export interface GenOptions {
  id: string;
  level: number; // target OVR-ish
  age: number;
  season: number;
  pos?: Pos;
  pot?: number;
  nat?: string;
}

export function generatePlayer(rng: Rng, o: GenOptions): Player {
  const pos = o.pos ?? rng.pick(['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]);
  const arch = pickArchetype(pos, rng);
  const country = o.nat ? COUNTRIES.find((c) => c.code === o.nat) ?? pickCountry(rng) : pickCountry(rng);
  const { height, weight } = physique(pos, rng);
  // Attribute level is lower than desired OVR because OVR stretches the elite tail.
  const base = o.level - 4;
  const attrs = buildAttrs(base, pos, arch, () => rng.normal(0, 5));
  applyPhysique(attrs, pos, height, weight);
  // Age shapes the profile: youngsters are athletic and raw, veterans smart and slower.
  const ageDelta = o.age - 26;
  for (const k of ['speed', 'accel', 'vert'] as const) attrs[k] = Math.round(clamp(attrs[k] - Math.max(0, ageDelta) * 1.2, 20, 99));
  for (const k of ['offIQ', 'defIQ', 'consistency'] as const) attrs[k] = Math.round(clamp(attrs[k] + ageDelta * 0.8, 20, 99));
  let ovr = computeOvr(attrs, pos);
  // Nudge towards target level.
  const diff = o.level - ovr;
  if (Math.abs(diff) > 1) {
    for (const k of Object.keys(attrs) as (keyof Attrs)[]) attrs[k] = Math.round(clamp(attrs[k] + diff * 0.85, 20, 99));
    ovr = computeOvr(attrs, pos);
  }
  const youth = Math.max(0, 25 - o.age);
  const pot = o.pot ?? Math.round(clamp(ovr + youth * rng.range(0.8, 2.8) + rng.normal(0, 3), ovr, 99));
  return {
    id: o.id,
    first: rng.pick(country.first),
    last: rng.pick(country.last),
    nat: country.code,
    pos,
    arch,
    birthYear: o.season - o.age,
    age: o.age,
    height,
    weight,
    hand: rng.chance(0.12) ? 'L' : 'R',
    attrs,
    pot: Math.max(pot, ovr),
    ovr,
    teamId: null,
    contract: null,
    injury: null,
    fatigue: 0,
    form: 0,
    yearsPro: Math.max(0, o.age - 20 - rng.int(0, 2)),
    season: emptyStats(),
    playoffs: emptyStats(),
    draft: null,
  };
}

// A player may go by a single name (first is empty then).
export const fullName = (p: { first: string; last: string }) => (p.first ? `${p.first} ${p.last}` : p.last);
export const shortName = (p: { first: string; last: string }) => (p.first ? `${p.first[0]}. ${p.last}` : p.last);

export function refreshOvr(p: Player) {
  p.ovr = computeOvr(p.attrs, p.pos);
  if (p.pot < p.ovr) p.pot = p.ovr;
}
