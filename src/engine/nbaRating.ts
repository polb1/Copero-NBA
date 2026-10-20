// Builds game Players from the real 2026-27 NBA snapshot.
// Rating is driven by last season's production (per-36, efficiency) with an age/salary fallback.

import type { Archetype, AttrKey, Player } from './types';
import { ATTR_KEYS, archetypeDef, buildAttrs, computeOvr } from './attributes';
import { clamp } from './rng';
import { emptyStats } from './players';
import type { NbaRosterPlayer, NbaStats } from '../data/nbaRoster';
import { nbaAge } from '../data/nbaRoster';

const per36 = (v: number, min: number) => (v * 36) / Math.max(min, 1);

function upside(age: number): number {
  if (age <= 20) return 14;
  if (age === 21) return 11;
  if (age === 22) return 9;
  if (age === 23) return 7;
  if (age === 24) return 5;
  if (age === 25) return 4;
  if (age === 26) return 3;
  if (age === 27) return 2;
  if (age <= 29) return 1;
  return 0;
}

export function inferArchetype(entry: NbaRosterPlayer, stats?: NbaStats): Archetype {
  const pos = entry.pos;
  // An archetype the position cannot play degrades to all-around.
  const fit = (a: Archetype): Archetype => (archetypeDef(a).positions.includes(pos) ? a : 'allAround');
  if (!stats || stats.gp <= 0) return 'allAround';

  const h = entry.heightCm;
  const rPTS = per36(stats.pts, stats.min);
  const rAST = per36(stats.ast, stats.min);
  const rSTL = per36(stats.stl, stats.min);
  const rBLK = per36(stats.blk, stats.min);
  const rTPA = per36(stats.tpa, stats.min);
  const threeRate = stats.tpa / Math.max(stats.fga, 1);
  const ftRate = stats.fta / Math.max(stats.fga, 1);
  const twoPct = (stats.fgm - stats.tpm) / Math.max(stats.fga - stats.tpa, 0.01);
  const rebPts = stats.reb / Math.max(stats.pts, 1);
  const astPts = stats.ast / Math.max(stats.pts, 1);

  if (h >= 207 && rBLK >= 1.8) return fit('rimProtector');
  if (h >= 206 && threeRate >= 0.3 && rTPA >= 3 && stats.tpPct >= 0.3) return fit('stretchBig');
  if (h >= 203 && twoPct >= 0.5 && threeRate <= 0.3 && rPTS >= 14 && rebPts >= 0.35) return fit('postScorer');
  if (threeRate >= 0.45 && rTPA >= 5 && stats.tpPct >= 0.365) return fit('sharpshooter');
  if (threeRate >= 0.4 && rSTL >= 1 && h >= 193) return fit('threeAndD');
  if (rAST >= 6 && astPts >= 0.25) return fit('playmaker');
  if (ftRate >= 0.3 && threeRate <= 0.3 && twoPct >= 0.48 && rPTS >= 12) return fit('slasher');
  if (rSTL >= 1.3 && rPTS >= 12 && threeRate <= 0.5) return fit('twoWay');
  return 'allAround';
}

export function buildRealPlayer(entry: NbaRosterPlayer, season: number): Player {
  const age = nbaAge(entry, season);
  const pos = entry.pos;
  const stats = entry.stats && entry.stats.gp > 0 ? entry.stats : undefined;

  let target: number;
  if (stats) {
    const m = Math.max(stats.min, 1);
    const rPTS = per36(stats.pts, m);
    const rREB = per36(stats.reb, m);
    const rAST = per36(stats.ast, m);
    const rSTL = per36(stats.stl, m);
    const rBLK = per36(stats.blk, m);
    const rTOV = per36(stats.tov, m);
    const eFG = (stats.fgm + 0.5 * stats.tpm) / Math.max(stats.fga, 0.01);
    const tovRate = stats.tov / Math.max(stats.fga + 0.44 * stats.fta + stats.tov, 1);
    const impact =
      rPTS + 0.7 * rREB + 0.85 * rAST + 1.7 * rSTL + 1.7 * rBLK - 0.5 * rTOV +
      14 * (eFG - 0.54) + 8 * (stats.ftPct - 0.78) - 6 * (tovRate - 0.12);
    target = Math.round(clamp(44 + 0.95 * impact, 45, 95));
  } else {
    const salary = entry.salary ?? 0;
    if (salary > 0) {
      target = Math.round(clamp(55 + 25 * Math.log10(salary / 1e6) - Math.max(0, age - 30) * 0.5, 50, 88));
    } else {
      target = Math.round(clamp(62 - (age - 19) * 1.2, 50, 66));
    }
  }

  const arch = inferArchetype(entry, stats);
  const attrs = buildAttrs(target - 4, pos, arch, () => 0);

  if (stats) {
    const m = Math.max(stats.min, 1);
    const rOREB = per36(stats.oreb, m);
    const rDREB = per36(stats.dreb, m);
    const rAST = per36(stats.ast, m);
    const rSTL = per36(stats.stl, m);
    const rBLK = per36(stats.blk, m);
    const rTOV = per36(stats.tov, m);
    const rTPA = per36(stats.tpa, m);
    const rFGA = per36(stats.fga, m);
    const twoPct = (stats.fgm - stats.tpm) / Math.max(stats.fga - stats.tpa, 0.01);
    const set = (k: AttrKey, v: number) => {
      attrs[k] = Math.round(clamp(v, 20, 99));
    };

    set('three', 0.72 * (20 + 79 * clamp((stats.tpPct - 0.28) / 0.16, 0, 1)) + 0.28 * (100 * clamp(rTPA / 3.2, 0, 1)));
    set('mid', 20 + 79 * clamp((twoPct - 0.4) / 0.22, 0, 1));
    set('ft', 20 + 79 * clamp((stats.ftPct - 0.55) / 0.4, 0, 1));
    set('steal', 20 + 79 * clamp((rSTL - 0.9) / 2.2, 0, 1));
    set('block', 20 + 79 * clamp((rBLK - 0.2) / 2.2, 0, 1));
    set('oreb', 20 + 79 * clamp((rOREB - 1.4) / 3.4, 0, 1));
    set('dreb', 20 + 79 * clamp((rDREB - 5) / 7, 0, 1));
    set('pass', 20 + 79 * clamp((rAST - 1.5) / 7, 0, 1));
    set('vision', 20 + 79 * clamp((rAST - 1.5) / 6.5, 0, 1));
    set('handle', 20 + 79 * clamp(
      0.55 * (1 - clamp((rTOV - 1) / 4, 0, 1)) + 0.45 * clamp((rAST / Math.max(rFGA, 1)) / 0.5, 0, 1), 0, 1,
    ));

    const perDDrive = 0.5 * clamp((rSTL - 0.9) / 2.2, 0, 1) +
      0.3 * clamp((rDREB - 5) / 7, 0, 1) +
      0.2 * clamp((entry.heightCm - 190) / 40, 0, 1);
    set('perD', 20 + 79 * clamp(perDDrive, 0, 1));

    const intDDrive = 0.45 * clamp((rBLK - 0.2) / 2.2, 0, 1) +
      0.35 * clamp((rDREB - 5) / 7, 0, 1) +
      0.2 * clamp((entry.heightCm - 195) / 35, 0, 1);
    set('intD', 20 + 79 * clamp(intDDrive, 0, 1));
    set('defIQ', Math.round((attrs.perD + attrs.intD) / 2));
  }

  const diff = target - computeOvr(attrs, pos);
  if (Math.abs(diff) > 1) {
    for (const k of ATTR_KEYS) attrs[k] = Math.round(clamp(attrs[k] + diff * 0.85, 20, 99));
  }
  const ovr = computeOvr(attrs, pos);
  const pot = Math.round(clamp(ovr + upside(age), ovr, 99));

  return {
    id: entry.id,
    first: entry.first,
    last: entry.last,
    nat: entry.nat,
    pos,
    arch,
    birthYear: season - age,
    age,
    height: entry.heightCm,
    weight: entry.weightKg,
    hand: Number(entry.espnId) % 8 === 0 ? 'L' : 'R',
    attrs,
    pot,
    ovr,
    teamId: null,
    contract: null,
    injury: null,
    fatigue: 0,
    form: 0,
    yearsPro: entry.yearsPro,
    season: emptyStats(),
    playoffs: emptyStats(),
    draft: null,
  };
}
