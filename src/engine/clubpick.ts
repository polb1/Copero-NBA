import { EURO_CLUBS, NCAA_PROGRAMS, type Club } from '../data/clubs';
import { countryByCode } from '../content/names';
import type { Rng } from './rng';

const regionOf = (code: string) => countryByCode(code).region;

/**
 * Three starting clubs for a player of nationality `nat`: clubs from their own country first, then from
 * the same region, then the big European leagues. Americans (and Canadians half the time) get NCAA programs.
 * Tries to offer one club per tier so the choice is meaningful (big club vs minutes). The giants only call
 * a teenager who is already good (ovr ≥ 66); everyone else starts at mid-sized and modest clubs.
 */
export function startingClubs(nat: string, rng: Rng, ovr = 99): { club: Club; comp: 'NCAA' | 'EUR' }[] {
  const big = ovr >= 66;
  const tiers = big ? [1, 2, 3] : [2, 3, 3];
  if (nat === 'USA' || (nat === 'CAN' && rng.chance(0.5))) {
    const chosen: Club[] = [];
    for (const tier of tiers) {
      const pool = NCAA_PROGRAMS.filter((c) => c.tier === tier && !chosen.includes(c));
      chosen.push(rng.pick(pool.length ? pool : NCAA_PROGRAMS.filter((c) => !chosen.includes(c))));
    }
    return chosen.map((club) => ({ club, comp: 'NCAA' as const }));
  }
  const open = (c: Club) => big || c.tier > 1;
  const own = rng.shuffle(EURO_CLUBS.filter((c) => c.country === nat && open(c)));
  const region = regionOf(nat);
  const near = rng.shuffle(EURO_CLUBS.filter((c) => c.country !== nat && regionOf(c.country) === region && open(c)));
  const top = rng.shuffle(EURO_CLUBS.filter((c) => c.country !== nat && regionOf(c.country) !== region && c.tier <= 2 && open(c)));
  const picked: Club[] = [];
  const take = (pool: Club[], preferTier?: number) => {
    const c = pool.find((x) => !picked.includes(x) && (preferTier === undefined || x.tier === preferTier)) ?? pool.find((x) => !picked.includes(x));
    if (c && picked.length < 3) picked.push(c);
  };
  // Own country: try a spread of tiers.
  for (const tier of tiers) take(own.filter((c) => c.tier === tier));
  while (picked.length < 3 && own.some((c) => !picked.includes(c))) take(own);
  while (picked.length < 3 && near.some((c) => !picked.includes(c))) take(near);
  while (picked.length < 3) take(top);
  return picked.map((club) => ({ club, comp: 'EUR' as const }));
}
