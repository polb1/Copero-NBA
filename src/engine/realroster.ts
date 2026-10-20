// Builds a team's roster from the real NBA snapshot: players, salaries, two-way deals and status.

import type { Contract, Player, TeamStatus } from './types';
import { POSITIONS } from './types';
import type { NbaRosterPlayer, NbaRosterSnapshot } from '../data/nbaRoster';
import { buildRealPlayer } from './nbaRating';
import { makeSalaries, marketValue } from './contracts';
import { RULES, maxSalary, minSalary, scaled } from './config';
import { clamp } from './rng';

/** Every player listed for `teamId` in the snapshot, rated for `season`. */
export function buildTeamPlayers(snap: NbaRosterSnapshot, teamId: string, season: number): Player[] {
  const team = snap.teams.find((t) => t.teamId === teamId);
  if (!team) return [];
  return team.players.map((id) => buildRealPlayer(snap.players[id], season));
}

const byQuality = (a: Player, b: Player) => b.ovr - a.ovr || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Picks up to `maxStandard` standard players and `maxTwoWay` two-way players by overall, then
 * guarantees at least one standard player per position by swapping the worst redundant player.
 */
export function selectRoster(
  players: Player[],
  twoWayIds: Set<string>,
  maxStandard = 14,
  maxTwoWay = 2,
): { roster: Player[]; extras: Player[] } {
  const isTwoWay = (p: Player) => twoWayIds.has(p.id);
  const sorted = [...players].sort(byQuality);

  const standard = sorted.filter((p) => !isTwoWay(p)).slice(0, maxStandard);
  const twoWay = sorted.filter(isTwoWay).slice(0, maxTwoWay);

  for (const pos of POSITIONS) {
    if (standard.some((p) => p.pos === pos)) continue;
    const best = sorted.find((p) => !isTwoWay(p) && p.pos === pos && !standard.includes(p));
    if (!best) continue;
    const replace = [...standard].reverse().find((p) => standard.filter((q) => q.pos === p.pos).length > 1);
    if (!replace) continue;
    standard[standard.indexOf(replace)] = best;
    standard.sort(byQuality);
  }

  const roster = [...standard, ...twoWay];
  const chosen = new Set(roster.map((p) => p.id));
  const extras = sorted.filter((p) => !chosen.has(p.id));
  return { roster, extras };
}

/** Contract for a snapshot player; the team is attached later by `assignRealContracts`. */
export function contractFromSnapshot(p: Player, entry: NbaRosterPlayer, season: number): Contract {
  if (entry.twoWay) {
    return {
      teamId: '',
      salaries: [scaled(RULES.twoWaySalary, season)],
      startSeason: season,
      kind: 'two-way',
    };
  }

  const salary = entry.salary ?? 0;
  if (salary > 0) {
    const years = clamp(entry.contractYears ?? 2, 1, 5);
    const first = salary;
    const max = maxSalary(p.yearsPro, season);
    const min = minSalary(p.yearsPro, season);
    let kind: Contract['kind'];
    if (p.yearsPro === 0) kind = 'rookie';
    else if (first >= 0.99 * max) kind = 'max';
    else if (first <= 1.01 * min) kind = 'minimum';
    else kind = 'standard';
    return {
      teamId: '',
      salaries: makeSalaries(first, years, 0.05),
      startSeason: season,
      kind,
      ...(kind === 'rookie' ? { rookieScale: true } : {}),
    };
  }

  const min = minSalary(p.yearsPro, season);
  const first = Math.max(min, marketValue(p, season));
  const kind: Contract['kind'] = first <= min * 1.01 ? 'minimum' : 'standard';
  return {
    teamId: '',
    salaries: makeSalaries(first, 2, 0.05),
    startSeason: season,
    kind,
  };
}

/** Strongest five are contenders, next eight playoff teams, next nine middle, the rest rebuild. */
export function statusesByStrength(strengths: Record<string, number>): Record<string, TeamStatus> {
  const ranked = Object.entries(strengths).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out: Record<string, TeamStatus> = {};
  ranked.forEach(([teamId], i) => {
    out[teamId] = i < 5 ? 'contender' : i < 13 ? 'playoff' : i < 22 ? 'middle' : 'rebuild';
  });
  return out;
}

/** Attaches team and contract to roster players (extras are left untouched). */
export function assignRealContracts(
  roster: Player[],
  extras: Player[],
  snap: NbaRosterSnapshot,
  season: number,
): { roster: Player[]; extras: Player[] } {
  const teamOf = new Map<string, string>();
  for (const team of snap.teams) {
    for (const id of team.players) teamOf.set(id, team.teamId);
  }

  for (const p of roster) {
    const teamId = teamOf.get(p.id) ?? p.teamId ?? '';
    const entry = snap.players[p.id];
    p.teamId = teamId;
    if (!entry) continue;
    const contract = contractFromSnapshot(p, entry, season);
    contract.teamId = teamId;
    p.contract = contract;
  }

  return { roster, extras };
}
