import type { Coach, League, Player, Pos, Team, TeamStatus } from './types';
import { TEAM_SEEDS } from '../data/teams';
import { G_LEAGUE } from '../data/clubs';
import { COACH_FIRST, COACH_LAST } from '../content/names';
import { generatePlayer } from './players';
import { makeSalaries, marketValue } from './contracts';
import { clamp, rngFor, type Rng } from './rng';
import { minSalary, rookieScale } from './config';
import { buildSchedule } from './schedule';
import { NBA_ROSTER } from '../data/nbaRoster';
import { assignRealContracts, buildTeamPlayers, selectRoster, statusesByStrength } from './realroster';

const TIER_CURVES: Record<TeamStatus, number[]> = {
  contender: [90, 84, 79, 76, 74, 72, 70, 68, 66, 64, 62, 60, 58, 56],
  playoff: [86, 80, 77, 74, 72, 70, 68, 66, 64, 62, 60, 58, 57, 55],
  middle: [83, 78, 75, 73, 71, 69, 67, 65, 63, 61, 59, 57, 56, 54],
  rebuild: [80, 75, 73, 71, 69, 67, 65, 63, 61, 59, 57, 56, 55, 53],
};

export const STYLE_LABEL: Record<Coach['style'], string> = {
  pace: 'Ritmo alto y transición',
  motion: 'Movimiento de balón',
  iso: 'Aislamientos para sus estrellas',
  defense: 'Defensa y control del ritmo',
  balanced: 'Equilibrado',
};
const STYLE_PACE: Record<Coach['style'], number> = { pace: 102.5, motion: 100, iso: 97.5, defense: 97, balanced: 99.5 };

export const STATUS_LABEL: Record<TeamStatus, string> = {
  contender: 'Candidato al título',
  playoff: 'Aspirante a playoffs',
  middle: 'Zona media',
  rebuild: 'En reconstrucción',
};

export function makeCoach(rng: Rng, season: number): Coach {
  return {
    name: `${rng.pick(COACH_FIRST)} ${rng.pick(COACH_LAST)}`,
    rating: Math.round(rng.range(50, 92)),
    style: rng.pick(['pace', 'motion', 'iso', 'defense', 'balanced'] as const),
    patience: Math.round(rng.range(20, 90)),
    hiredSeason: season - rng.int(0, 4),
  };
}

export function newPlayerId(league: League) {
  return 'p' + league.nextPlayerId++;
}

function agedFor(tierIndex: number, status: TeamStatus, rng: Rng) {
  if (status === 'rebuild') return clamp(Math.round(rng.normal(tierIndex < 3 ? 23 : 25, 3)), 19, 35);
  if (tierIndex < 3) return clamp(Math.round(rng.normal(27.5, 3)), 21, 35);
  return clamp(Math.round(rng.normal(27, 4)), 19, 37);
}

export function createFictionalLeague(seed: number, season: number): League {
  const rng = rngFor(seed, 'league-create');
  const statuses: TeamStatus[] = rng.shuffle([
    ...Array(5).fill('contender'), ...Array(8).fill('playoff'), ...Array(9).fill('middle'), ...Array(8).fill('rebuild'),
  ] as TeamStatus[]);
  const league: League = {
    season,
    day: 0,
    teams: {},
    players: {},
    schedule: [],
    allStarDay: 0,
    deadlineDay: 0,
    lastDay: 0,
    postseason: null,
    awards: [],
    champions: [],
    freeAgents: [],
    lastNo1: null,
    nextPlayerId: 1,
    allStarsSelected: false,
    rosterSource: 'fictional',
  };
  TEAM_SEEDS.forEach((s, i) => {
    const status = statuses[i];
    const coach = makeCoach(rng, season);
    const team: Team = {
      ...s,
      coach,
      pace: STYLE_PACE[coach.style],
      status,
      reputation: Math.round(clamp((s.market === 'large' ? 65 : s.market === 'mid' ? 55 : 45) + (status === 'contender' ? 20 : status === 'playoff' ? 10 : status === 'rebuild' ? -10 : 0) + rng.normal(0, 6), 20, 99)),
      roster: [],
      w: 0, l: 0, homeW: 0, homeL: 0, awayW: 0, awayL: 0, pf: 0, pa: 0, streak: 0, last10: [],
      history: [],
      gLeagueName: G_LEAGUE[s.id] ?? `Filial G League de ${s.city}`,
    };
    league.teams[s.id] = team;
    const posOrder: Pos[] = [];
    for (let b = 0; b < 3; b++) posOrder.push(...rng.shuffle(['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]));
    TIER_CURVES[status].forEach((lvl, idx) => {
      const age = agedFor(idx, status, rng);
      const p = generatePlayer(rng, { id: newPlayerId(league), level: Math.round(lvl + rng.normal(0, 2.5)), age, season, pos: posOrder[idx] });
      signNpc(league, p, s.id, rng, season);
      league.players[p.id] = p;
      team.roster.push(p.id);
    });
  });
  for (let i = 0; i < 30; i++) {
    const p = generatePlayer(rng, { id: newPlayerId(league), level: Math.round(rng.range(54, 67)), age: rng.int(22, 33), season });
    league.players[p.id] = p;
    league.freeAgents.push(p.id);
  }
  setupSeasonSchedule(league, seed);
  return league;
}

export function createLeague(seed: number, season: number): League {
  return createFictionalLeague(seed, season);
}

export function createRealLeague(seed: number, season: number): League {
  if (season !== NBA_ROSTER.season) return createFictionalLeague(seed, season);
  const rng = rngFor(seed, 'real-league', season);
  const league: League = {
    season,
    day: 0,
    teams: {},
    players: {},
    schedule: [],
    allStarDay: 0,
    deadlineDay: 0,
    lastDay: 0,
    postseason: null,
    awards: [],
    champions: [],
    freeAgents: [],
    lastNo1: null,
    nextPlayerId: 1,
    allStarsSelected: false,
    rosterSource: 'real',
  };
  TEAM_SEEDS.forEach((s) => {
    const coach = makeCoach(rng, season);
    const team: Team = {
      ...s,
      coach,
      pace: STYLE_PACE[coach.style],
      status: 'middle',
      reputation: 50,
      roster: [],
      w: 0, l: 0, homeW: 0, homeL: 0, awayW: 0, awayL: 0, pf: 0, pa: 0, streak: 0, last10: [],
      history: [],
      gLeagueName: G_LEAGUE[s.id] ?? `Filial G League de ${s.city}`,
    };
    league.teams[s.id] = team;
  });
  const twoWayIds = new Set(Object.values(NBA_ROSTER.players).filter((p) => p.twoWay).map((p) => p.id));
  TEAM_SEEDS.forEach((s) => {
    const all = buildTeamPlayers(NBA_ROSTER, s.id, season);
    all.forEach((p) => { league.players[p.id] = p; });
    const { roster, extras } = selectRoster(all, twoWayIds);
    assignRealContracts(roster, extras, NBA_ROSTER, season);
    const team = league.teams[s.id];
    team.roster = roster.map((p) => p.id);
    extras.forEach((p) => league.freeAgents.push(p.id));
  });
  const strengths: Record<string, number> = {};
  TEAM_SEEDS.forEach((s) => { strengths[s.id] = teamStrength(league, s.id); });
  const statuses = statusesByStrength(strengths);
  TEAM_SEEDS.forEach((s) => {
    const t = league.teams[s.id];
    const status = statuses[s.id];
    t.status = status;
    t.reputation = Math.round(clamp((s.market === 'large' ? 65 : s.market === 'mid' ? 55 : 45) + (status === 'contender' ? 20 : status === 'playoff' ? 10 : status === 'rebuild' ? -10 : 0) + rng.normal(0, 6), 20, 99));
  });
  for (let i = 0; i < 30; i++) {
    const p = generatePlayer(rng, { id: newPlayerId(league), level: Math.round(rng.range(54, 67)), age: rng.int(22, 33), season });
    league.players[p.id] = p;
    league.freeAgents.push(p.id);
  }
  setupSeasonSchedule(league, seed);
  return league;
}

export function signNpc(league: League, p: Player, teamId: string, rng: Rng, season: number) {
  p.teamId = teamId;
  if (p.age <= 23 && p.yearsPro <= 3 && rng.chance(0.75)) {
    const pick = rng.int(1, 40);
    const first = pick <= 30 ? rookieScale(pick, season - p.yearsPro) : minSalary(0, season);
    const years = Math.max(1, 4 - p.yearsPro);
    p.contract = { teamId, salaries: makeSalaries(first, years, 0.05), startSeason: season, kind: 'rookie', rookieScale: pick <= 30 };
    p.draft = { season: season - p.yearsPro - 1 + 1, round: pick <= 30 ? 1 : 2, pick: pick <= 30 ? pick : pick - 30, teamId };
    return;
  }
  const mv = marketValue(p, season) * rng.range(0.75, 1.25);
  const years = p.age >= 33 ? rng.int(1, 2) : rng.int(1, 5);
  const first = Math.max(minSalary(p.yearsPro, season), Math.round(mv));
  p.contract = { teamId, salaries: makeSalaries(first, years, 0.05), startSeason: season, kind: first <= minSalary(p.yearsPro, season) * 1.01 ? 'minimum' : 'standard' };
}

export function setupSeasonSchedule(league: League, seed: number) {
  const { games, lastDay } = buildSchedule(Object.values(league.teams), rngFor(seed, 'schedule', league.season));
  league.schedule = games;
  league.lastDay = lastDay;
  league.allStarDay = 119;
  league.deadlineDay = Math.round(lastDay * 0.6);
  league.day = 0;
  league.postseason = null;
  league.allStarsSelected = false;
}

export function teamName(league: League, id: string | null | undefined) {
  if (!id) return 'Agente libre';
  const t = league.teams[id];
  return t ? `${t.city} ${t.name}` : id;
}

export function teamStrength(league: League, teamId: string): number {
  const t = league.teams[teamId];
  const ovrs = t.roster
    .map((id) => league.players[id])
    .filter((p) => p && !p.injury && p.contract?.kind !== 'two-way')
    .map((p) => p.ovr)
    .sort((a, b) => b - a)
    .slice(0, 10);
  const w = [0.17, 0.15, 0.13, 0.12, 0.11, 0.09, 0.08, 0.06, 0.05, 0.04];
  let s = 0;
  let ws = 0;
  ovrs.forEach((o, i) => {
    s += o * w[i];
    ws += w[i];
  });
  return ws ? s / ws : 60;
}
