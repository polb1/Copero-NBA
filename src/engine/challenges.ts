// One random goal per career: a reason to play the next one differently.
import type { Career } from './types';
import { awardCounts, careerTotals } from './legacy';
import { rngFor } from './rng';

export interface Challenge {
  id: string;
  label: string;
  /** Current value and the target, for the progress text. */
  progress: (c: Career) => [number, number];
}

const nbaSeasons = (c: Career) => new Set(c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp > 0).map((s) => s.season)).size;
const award = (k: string) => (c: Career) => awardCounts(c)[k] ?? 0;
const peak = (c: Career) => Math.max(0, ...c.ovrHistory.map((o) => o.ovr));

export const CHALLENGES: Challenge[] = [
  { id: 'ring', label: 'Gana un anillo NBA', progress: (c) => [award('champion')(c), 1] },
  { id: 'allstar3', label: 'Sé All-Star 3 veces', progress: (c) => [award('allStar')(c), 3] },
  { id: 'ovr85', label: 'Alcanza 85 de OVR', progress: (c) => [peak(c), 85] },
  { id: 'mvp', label: 'Gana un MVP', progress: (c) => [award('mvp')(c), 1] },
  { id: 'seasons12', label: 'Juega 12 temporadas en la NBA', progress: (c) => [nbaSeasons(c), 12] },
  { id: 'pts15k', label: 'Anota 15.000 puntos en la NBA', progress: (c) => [careerTotals(c).pts, 15000] },
  { id: 'roy', label: 'Gana el Rookie del Año', progress: (c) => [award('roy')(c), 1] },
  { id: 'allnba', label: 'Entra en un quinteto All-NBA', progress: (c) => [award('allNba1')(c) + award('allNba2')(c) + award('allNba3')(c), 1] },
  { id: 'dpoy', label: 'Gana el Defensor del Año', progress: (c) => [award('dpoy')(c), 1] },
  { id: 'euro', label: 'Gana una liga fuera de la NBA', progress: (c) => [award('euroChampion')(c), 1] },
];

/** Picks the challenge for a new career from its seed. */
export function rollChallenge(seed: number): number {
  return rngFor(seed, 'challenge').int(0, CHALLENGES.length - 1);
}

/** The career's challenge (saves from before challenges get the same one their seed would roll). */
export function challengeOf(c: Career): Challenge {
  return CHALLENGES[(c.flags.challenge ?? rollChallenge(c.seed)) % CHALLENGES.length];
}

export function challengeDone(c: Career): boolean {
  const [v, target] = challengeOf(c).progress(c);
  return v >= target;
}
