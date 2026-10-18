import { EURO_CLUBS, NCAA_PROGRAMS, type Club } from '../data/clubs';
import { countryByCode } from '../content/names';
import type { Rng } from './rng';

const regionOf = (code: string) => countryByCode(code).region;

/**
 * Three starting clubs for a player of nationality `nat`: clubs from their own country first, then from
 * the same region, then the big European leagues. Americans (and Canadians half the time) get NCAA programs.
 * Tries to offer one club per tier so the choice is meaningful (big club vs minutes).
 */
export function startingClubs(nat: string, rng: Rng): { club: Club; comp: 'NCAA' | 'EUR' }[] {
  if (nat === 'USA' || (nat === 'CAN' && rng.chance(0.5))) {
    return [1, 2, 3].map((tier) => ({ club: rng.pick(NCAA_PROGRAMS.filter((c) => c.tier === tier)), comp: 'NCAA' as const }));
  }
  const own = rng.shuffle(EURO_CLUBS.filter((c) => c.country === nat));
  const region = regionOf(nat);
  const near = rng.shuffle(EURO_CLUBS.filter((c) => c.country !== nat && regionOf(c.country) === region));
  const top = rng.shuffle(EURO_CLUBS.filter((c) => c.country !== nat && regionOf(c.country) !== region && c.tier <= 2));
  const picked: Club[] = [];
  const take = (pool: Club[], preferTier?: number) => {
    const c = pool.find((x) => !picked.includes(x) && (preferTier === undefined || x.tier === preferTier)) ?? pool.find((x) => !picked.includes(x));
    if (c && picked.length < 3) picked.push(c);
  };
  // Own country: try a spread of tiers.
  for (const tier of [1, 2, 3]) take(own.filter((c) => c.tier === tier));
  while (picked.length < 3 && own.some((c) => !picked.includes(c))) take(own);
  while (picked.length < 3 && near.some((c) => !picked.includes(c))) take(near);
  while (picked.length < 3) take(top);
  return picked.map((club) => ({ club, comp: 'EUR' as const }));
}
