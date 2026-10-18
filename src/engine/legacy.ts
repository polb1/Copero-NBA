import type { Career, StatLine } from './types';
import { sumStats } from './stats';
import { RULES } from './config';

export function careerTotals(c: Career, comp: 'NBA' | 'all' = 'NBA'): StatLine {
  return sumStats(c.seasons.filter((s) => comp === 'all' || s.comp === 'NBA').map((s) => s.stats));
}
export function playoffTotals(c: Career): StatLine {
  return sumStats(c.seasons.filter((s) => s.playoffs).map((s) => s.playoffs!));
}

export function awardCounts(c: Career): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of c.seasons) for (const a of s.awards) out[a] = (out[a] ?? 0) + 1;
  return out;
}

const AWARD_POINTS: Record<string, number> = {
  mvp: 40, fmvp: 30, champion: 25, allNba1: 15, allNba2: 10, allNba3: 6, allStar: 6, dpoy: 20, roy: 8, smoy: 6, mip: 5,
  allDef1: 5, allDef2: 3, threeContest: 3, euroChampion: 6, euroMvp: 5, ptsLeader: 6, rebLeader: 4, astLeader: 4, stlLeader: 3, blkLeader: 3,
};

export function legacyScore(c: Career): number {
  const t = careerTotals(c);
  const p = playoffTotals(c);
  const nbaSeasons = c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp > 0).length;
  const peak = Math.max(0, ...c.ovrHistory.map((o) => o.ovr));
  // Seasons abroad count too, at a lower weight than the NBA.
  const eu = sumStats(c.seasons.filter((s) => s.comp === 'EUR').map((s) => s.stats));
  const euSeasons = c.seasons.filter((s) => s.comp === 'EUR' && s.stats.gp > 0).length;
  let score = eu.pts / 600 + (eu.oreb + eu.dreb) / 1000 + eu.ast / 800 + euSeasons * 1 + t.pts / 250 + (t.oreb + t.dreb) / 450 + t.ast / 320 + (t.stl + t.blk) / 250 + nbaSeasons * 2 + Math.max(0, peak - 74) * 3 + p.gp * 0.2;
  const counts = awardCounts(c);
  for (const [k, n] of Object.entries(counts)) score += (AWARD_POINTS[k] ?? 0) * n;
  return Math.round(score);
}

export function hofProbability(score: number) {
  return 1 / (1 + Math.exp(-(score - 200) / 32));
}

export function legacyTier(score: number) {
  if (score >= 420) return 'Leyenda del juego';
  if (score >= 230) return 'Miembro del Hall of Fame';
  if (score >= 150) return 'Estrella de la liga';
  if (score >= 80) return 'Jugador sólido';
  if (score >= 30) return 'Jugador de rol';
  return 'Paso fugaz por el profesionalismo';
}

export function hofVerdict(prob: number) {
  const wait = `Elegible tras ${RULES.hofWaitSeasons} temporadas completas retirado (las fuentes discrepan entre 3 y 4).`;
  if (prob >= 0.9) return `Primera votación asegurada. ${wait}`;
  if (prob >= 0.6) return `Candidato firme al Hall of Fame. ${wait}`;
  if (prob >= 0.25) return `Caso debatible: dependerá del comité. ${wait}`;
  return 'Sin opciones realistas de Hall of Fame.';
}
