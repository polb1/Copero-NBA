import type { Archetype, Career, Competition, Hand, Mode, NewsItem, Player, Pos, PreDraft, Team } from './types';
import { createLeague, teamName } from './league';
import { buildAttrs, computeOvr, TRAINING_AREAS, ATTR_KEYS } from './attributes';
import { applyPhysique, emptyStats, fullName } from './players';
import { buildRotation } from './gamesim';
import { fmtDate } from './schedule';
import { clamp, hashString, rngFor } from './rng';
import { RULES } from './config';
import { AGENT_NAMES, countryByCode } from '../content/names';
import { SATELLITES } from './satellite';
import { clubLevel, clubMinutes, findClub } from '../data/clubs';
import type { RoleKey } from '../content/events';
import { EVENTS } from '../content/events';
import { instantiate, absDay, markEventSeen } from './events';

export const SAVE_VERSION = 1;

export type Route = PreDraft['route'];
export type TalentProfile = 'raw' | 'balanced' | 'ready';

export interface NewCareerInput {
  first: string;
  last: string;
  jersey: string;
  number: number;
  nat: string;
  birthplace: string;
  age: number;
  height: number;
  weight: number;
  hand: Hand;
  pos: Pos;
  arch: Archetype;
  origin: string; // university / club / school
  bio: string;
  route: Route;
  draftedTier?: 'lottery' | 'first' | 'second';
  mode: Mode;
  talent: TalentProfile;
  /** Bonus points per training area (sum ≤ 10, max 4 per area). */
  focus: Partial<Record<keyof typeof TRAINING_AREAS, number>>;
  look: { skin: number; hair: number; accent: string };
  dailyKey?: string;
}

export const FOCUS_POINTS = 10;

const ROUTE_LEVEL: Record<Route, number> = { college: 60, international: 61, alternative: 58, drafted: 60 };
const TIER_LEVEL = { lottery: 4, first: 0, second: -3 } as const;

/** Builds the user player (also used by the creation screen preview). */
export function buildUserPlayer(input: NewCareerInput, seed: number, season: number): Player {
  const rng = rngFor(seed, 'user-attrs');
  const lvl = ROUTE_LEVEL[input.route] + (input.route === 'drafted' ? TIER_LEVEL[input.draftedTier ?? 'first'] : 0) + (input.talent === 'raw' ? -4 : input.talent === 'ready' ? 3 : 0) + (input.age - 19) * 0.6;
  const attrs = buildAttrs(lvl - 4, input.pos, input.arch, () => rng.normal(0, 3.5));
  applyPhysique(attrs, input.pos, input.height, input.weight);
  for (const [area, pts] of Object.entries(input.focus)) {
    const list = TRAINING_AREAS[area as keyof typeof TRAINING_AREAS].attrs;
    for (const k of list) attrs[k] = clamp(attrs[k] + (pts ?? 0) * 1.5, 20, 99);
  }
  for (const k of ATTR_KEYS) attrs[k] = Math.round(attrs[k]);
  const ovr = computeOvr(attrs, input.pos);
  const youth = Math.max(0, 23 - input.age);
  const potBase = input.talent === 'raw' ? 22 : input.talent === 'ready' ? 10 : 16;
  const pot = Math.round(clamp(ovr + potBase + youth * 1.2 + rng.normal(0, 2), ovr + 3, 97));
  // Scouts can be wrong: the real ceiling is hidden and revealed over time.
  const hiddenPot = Math.round(clamp(pot + rng.normal(-2, 6), ovr + 1, 99));
  return {
    id: 'user',
    first: input.first.trim() || 'Jugador',
    last: input.last.trim() || 'Novato',
    nat: input.nat,
    pos: input.pos,
    arch: input.arch,
    birthYear: season - input.age,
    age: input.age,
    height: input.height,
    weight: input.weight,
    hand: input.hand,
    attrs,
    pot,
    hiddenPot,
    ovr,
    teamId: null,
    contract: null,
    injury: null,
    fatigue: 0,
    form: 0,
    yearsPro: 0,
    season: emptyStats(),
    playoffs: emptyStats(),
    isUser: true,
    draft: null,
  };
}

export function createCareer(input: NewCareerInput, seed: number): Career {
  const season = RULES.baseSeason;
  const league = createLeague(seed, season);
  const u = buildUserPlayer(input, seed, season);
  league.players[u.id] = u;
  const rng = rngFor(seed, 'career-init');
  const c: Career = {
    version: SAVE_VERSION,
    id: `c${seed.toString(36)}${Date.now().toString(36)}`,
    seed,
    mode: input.mode,
    dailyKey: input.dailyKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userId: u.id,
    league,
    phase: 'predraft',
    trust: 50,
    morale: 65,
    chemistry: 50,
    reputation: input.route === 'drafted' ? 25 : 15,
    fame: 10,
    pressure: 10,
    loyalty: 50,
    workEthic: Math.round(rng.range(45, 75)),
    earnings: 0,
    endorsement: 0,
    agent: { name: rng.pick(AGENT_NAMES), quality: Math.round(rng.range(40, 70)) },
    training: { focus: 'balanced', intensity: 'normal' },
    devPoints: {},
    goals: [],
    pendingEvent: null,
    eventQueue: [],
    eventHistory: {},
    decisions: [],
    flags: {},
    news: [],
    nextNewsId: 1,
    gameLog: [],
    seasons: [],
    ovrHistory: [{ season, age: u.age, ovr: u.ovr, pot: u.pot }],
    highs: {},
    playoffHighs: {},
    achievements: [],
    predraft: null,
    satellite: null,
    satStats: emptyStats(),
    assignment: 'NBA',
    twoWayNbaGames: 0,
    offers: [],
    tradeRequested: false,
    seasonOvrStart: u.ovr,
    teamsPlayed: [],
    bestTeamPeak: null,
    retirement: null,
    lastSummary: null,
    settings: { autoPauseEvents: true },
    profile: { jersey: input.jersey || u.last.toUpperCase(), number: input.number, birthplace: input.birthplace, origin: input.origin, bio: input.bio, look: input.look },
    allStarGames: 0,
  };
  const country = countryByCode(input.nat).name;
  if (input.route === 'college' || input.route === 'international') {
    const comp: Competition = input.route === 'college' ? 'NCAA' : 'EUR';
    c.predraft = { route: input.route, step: 'season', userBoosts: {}, clubName: input.origin, satelliteDone: false, seasonsPlayed: 0, interviews: [], interviewTeams: [], stockBonus: 0, workouts: [] };
    const club = findClub(input.origin);
    c.satellite = { comp, teamName: input.origin, level: clubLevel(club, comp), minutes: clubMinutes(club), league: club?.league, gamesPlanned: SATELLITES[comp].games, w: 0, l: 0 };
    addNews(c, 'draft', `${fullName(u)} inicia su camino hacia la NBA`, `El ${input.pos} de ${country} jugará la temporada ${season}-${(season + 1) % 100} en ${input.origin} (${SATELLITES[comp].name}). Los ojeadores ya tienen su nombre apuntado.`, 'neutral');
    queueEvent(c, 'predraft-agent');
  } else if (input.route === 'alternative') {
    c.predraft = { route: 'alternative', step: 'done', userBoosts: {}, clubName: input.origin, satelliteDone: true, seasonsPlayed: 0, interviews: [], interviewTeams: [], stockBonus: 0, workouts: [], userPick: null };
    c.flags.undrafted = 1;
    c.phase = 'signing';
    addNews(c, 'draft', 'Sin draft, pero con hambre', `${fullName(u)} no figura en ninguna lista de draft. Tendrá que ganarse una oportunidad por una vía alternativa.`, 'neutral');
  } else {
    c.predraft = { route: 'drafted', step: 'done', userBoosts: {}, clubName: input.origin, satelliteDone: true, seasonsPlayed: 0, interviews: [], interviewTeams: [], stockBonus: 0, workouts: [] };
    c.phase = 'signing';
  }
  return c;
}

export const userOf = (c: Career): Player => c.league.players[c.userId];
export const teamOf = (c: Career): Team | null => {
  const u = userOf(c);
  return u.teamId ? c.league.teams[u.teamId] ?? null : null;
};
export const onNbaRoster = (c: Career) => {
  const u = userOf(c);
  return !!u.teamId && !!c.league.teams[u.teamId]?.roster.includes(u.id);
};

export function currentComp(c: Career): Competition {
  const u = userOf(c);
  if (!u.teamId) return c.satellite?.comp ?? 'NBA';
  return c.assignment === 'GLG' || !onNbaRoster(c) ? 'GLG' : 'NBA';
}

export const ROLE_LABEL: Record<RoleKey, string> = {
  star: 'Estrella', starter: 'Titular', rotation: 'Rotación', bench: 'Fondo de banquillo', out: 'Fuera de la rotación NBA',
};

export function userRole(c: Career): { key: RoleKey; label: string; slot: number; minutes: number } {
  const u = userOf(c);
  if (!onNbaRoster(c) || c.assignment === 'GLG') return { key: 'out', label: c.satellite || c.assignment === 'GLG' ? 'Jugando en ' + (c.assignment === 'GLG' ? 'la G League' : c.satellite?.teamName) : ROLE_LABEL.out, slot: -1, minutes: 0 };
  const rot = buildRotation(c.league, u.teamId!, { userId: u.id, userTrust: c.trust, userAvailable: true });
  const slot = rot.players.findIndex((p) => p.id === u.id);
  const minutes = slot >= 0 ? rot.players[slot].minutes : 0;
  let key: RoleKey = slot < 0 ? 'bench' : slot <= 1 && u.ovr >= 80 ? 'star' : slot < 5 ? 'starter' : slot < 9 ? 'rotation' : 'bench';
  if (u.injury && !u.injury.playingThrough) key = slot < 5 && slot >= 0 ? key : 'bench';
  return { key, label: ROLE_LABEL[key], slot, minutes };
}

export function addNews(c: Career, kind: NewsItem['kind'], title: string, body: string, tone: NewsItem['tone'] = 'neutral') {
  c.news.unshift({ id: c.nextNewsId++, season: c.league.season, day: c.league.day, date: fmtDate(c.league.season, Math.max(0, c.league.day)), kind, title, body, tone });
  if (c.news.length > 250) c.news.length = 250;
}

export function queueEvent(c: Career, id: string, inDays = 0) {
  c.eventQueue.push({ id, season: c.league.season, day: c.league.day + inDays });
}

export function eventContext(c: Career) {
  return { career: c, user: userOf(c), team: teamOf(c), role: userRole(c).key, absDay: absDay(c.league.season, c.league.day) };
}

/** Opens an event now (by id), bypassing random selection. */
export function openEvent(c: Career, id: string): boolean {
  const def = EVENTS.find((e) => e.id === id);
  if (!def) return false;
  const ctx = eventContext(c);
  const rng = rngFor(c.seed, 'event-inst', id, c.league.season, c.league.day);
  c.pendingEvent = instantiate(def, ctx, rng);
  markEventSeen(c, id, ctx.absDay);
  return true;
}

export const careerLabel = (c: Career) => {
  const u = userOf(c);
  return `${fullName(u)} · ${u.pos} · ${teamName(c.league, u.teamId)}`;
};

export const dailySeed = (key: string) => hashString('nba-legacy-daily|' + key);
