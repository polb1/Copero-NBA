// Typed access to the 2026-27 NBA snapshot (ESPN/Wikipedia facts, see sources in the JSON).
// The JSON is imported and cast once: the game only reads it, never writes it.

import type { Pos } from '../engine/types';
import roster from './nbaRoster2026.json';

export interface NbaStats {
  gp: number;
  gs: number;
  min: number;
  pts: number;
  reb: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  fgPct: number;
  tpPct: number;
  ftPct: number;
}

export interface NbaRosterPlayer {
  id: string;
  espnId: string;
  first: string;
  last: string;
  suffix?: string;
  pos: Pos;
  posGroup: 'G' | 'F' | 'C';
  posSource: string;
  heightCm: number;
  weightKg: number;
  birthDate: string;
  nat: string;
  yearsPro: number;
  stats?: NbaStats;
  salary?: number;
  contractYears?: number;
  twoWay: boolean;
  gLeague: boolean;
  source: string;
}

export interface NbaRosterTeam {
  teamId: string;
  players: string[];
}

export interface NbaRosterSource {
  id: string;
  name: string;
  url: string;
  retrievedAt: string;
  license: string;
}

export interface NbaRosterSnapshot {
  version: number;
  season: number;
  label: string;
  asOf: string;
  sources: NbaRosterSource[];
  teams: NbaRosterTeam[];
  players: Record<string, NbaRosterPlayer>;
  freeAgents: string[];
}

export const NBA_ROSTER = roster as unknown as NbaRosterSnapshot;

/** Full display name (suffixes such as "Jr." included when the snapshot has them). */
export function nbaName(p: NbaRosterPlayer): string {
  return [p.first, p.last, p.suffix].filter(Boolean).join(' ');
}

/** Age at the start of a season: season year minus birth year. */
export function nbaAge(p: NbaRosterPlayer, season: number): number {
  const year = Number(p.birthDate?.slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? season - year : 25;
}
