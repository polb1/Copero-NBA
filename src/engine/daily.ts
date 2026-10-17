import type { NewCareerInput } from './career';
import { dailySeed } from './career';
import { ARCHETYPES } from './attributes';
import { COUNTRIES, UNIVERSITY_SUGGESTIONS, EURO_CLUBS } from '../content/names';
import { HEIGHT_RANGE } from './players';
import { rngFor } from './rng';
import type { Pos } from './types';

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // UTC day: same challenge worldwide
}

/** The shared daily setup: everything that affects the simulation is fixed by the date. */
export function dailyPreset(key: string): { seed: number; input: Omit<NewCareerInput, 'first' | 'last' | 'jersey' | 'number' | 'look' | 'bio'> } {
  const seed = dailySeed(key);
  const rng = rngFor(seed, 'daily-preset');
  const pos = rng.pick(['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]);
  const arch = rng.pick(ARCHETYPES.filter((a) => a.positions.includes(pos))).id;
  const country = rng.weighted(COUNTRIES, (c) => Math.sqrt(c.weight));
  const route = rng.pick(['college', 'international', 'college', 'alternative'] as const);
  const [lo, hi] = HEIGHT_RANGE[pos];
  const height = rng.int(lo, hi);
  const areas = ['shooting', 'finishing', 'playmaking', 'defense', 'athleticism', 'rebounding'] as const;
  const focus: NewCareerInput['focus'] = {};
  let left = 10;
  while (left > 0) {
    const a = rng.pick(areas);
    if ((focus[a] ?? 0) < 4) { focus[a] = (focus[a] ?? 0) + 1; left--; }
  }
  return {
    seed,
    input: {
      nat: country.code,
      birthplace: country.name,
      age: route === 'alternative' ? 21 : rng.int(18, 20),
      height,
      weight: Math.round(height * 0.52 - 6 + rng.normal(0, 4)),
      hand: rng.chance(0.15) ? 'L' : 'R',
      pos,
      arch,
      origin: route === 'international' ? rng.pick(EURO_CLUBS) : route === 'college' ? rng.pick(UNIVERSITY_SUGGESTIONS) : 'Liga de verano',
      route,
      mode: 'daily',
      talent: rng.pick(['raw', 'balanced', 'ready'] as const),
      focus,
      dailyKey: key,
    },
  };
}

export function dailyShareText(key: string, name: string, score: number, tier: string, lines: string[]) {
  return [`🏀 NBA Legacy · Desafío diario ${key}`, `${name}: Legacy Score ${score} (${tier})`, ...lines, '¿Puedes superarlo con las mismas condiciones?'].join('\n');
}
