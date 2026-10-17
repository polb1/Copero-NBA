import type { BoxLine, Competition, Player } from './types';
import { generatePlayer } from './players';
import { simulateGame, type SimPlayer, type SimTeam } from './gamesim';
import { MINUTES_TEMPLATE } from './config';
import { rngFor } from './rng';

/** Competitions outside the fully simulated NBA. Adding a league = adding an entry here. */
export interface SatelliteDef {
  id: Competition;
  name: string;
  games: number;
  level: number; // average OVR of rotation players on the NBA scale
  minutes: number; // game length
  pace: number;
  opponents: string[];
}

export const SATELLITES: Record<Exclude<Competition, 'NBA'>, SatelliteDef> = {
  NCAA: { id: 'NCAA', name: 'NCAA División I', games: 32, level: 57, minutes: 40, pace: 69,
    opponents: ['Bayview State', 'Northern Plains', 'Coastal Tech', 'Midland University', 'Ridgewood College', 'Granite State', 'Lakeshore A&M', 'Desert Valley', 'Pinecrest', 'Redstone University'] },
  EUR: { id: 'EUR', name: 'Liga Europea (ficticia)', games: 34, level: 62, minutes: 40, pace: 72,
    opponents: ['Helios Basket', 'Olimpia Adriatica', 'Panthers Belgrade', 'Dynamo Kaunas', 'Galata Istanbul', 'Paris Lumière BC', 'Bavaria Ballers', 'Ionian Athens', 'Ljubljana Dragons', 'Real Club Cantábrico'] },
  GLG: { id: 'GLG', name: 'NBA G League', games: 50, level: 61, minutes: 48, pace: 101,
    opponents: ['Capital City Rush', 'Lakeside Storm', 'Mountain Peaks', 'Gulf Coast Pelicans', 'Prairie Wolves', 'Bay Area Surge', 'Delta Kings', 'Iron Range', 'Sunbelt Suns', 'Harbor Hawks'] },
};

function synthPlayer(seed: number, key: string, idx: number, level: number): SimPlayer {
  const rng = rngFor(seed, 'synth', key, idx);
  const p = generatePlayer(rng, { id: `s-${key}-${idx}`, level: Math.round(level + rng.normal(0, 3)), age: rng.int(20, 29), season: 2026 });
  return { id: p.id, attrs: p.attrs, ovr: p.ovr, arch: p.arch, pos: p.pos, form: 0, fatigue: 0, hurt: false, minutes: 0, starter: false };
}

function assignMinutes(players: SimPlayer[], total: number) {
  players.sort((a, b) => b.ovr - a.ovr);
  const raw = players.map((_, i) => MINUTES_TEMPLATE[i] ?? 0);
  const sum = raw.reduce((s, v) => s + v, 0);
  players.forEach((p, i) => {
    p.minutes = (raw[i] * total) / sum;
    p.starter = i < 5;
  });
}

export interface SatelliteGameResult {
  line: BoxLine;
  teamScore: number;
  oppScore: number;
  oppName: string;
  home: boolean;
  ot: number;
}

/** User's satellite game: user + synthetic teammates vs synthetic opponent around the competition level. */
export function playSatelliteGame(seed: number, comp: Exclude<Competition, 'NBA'>, season: number, gameNo: number, user: Player, teamLevel: number, minutesBoost = 1): SatelliteGameResult {
  const def = SATELLITES[comp];
  const key = `${comp}-${season}-${gameNo}`;
  const rng = rngFor(seed, 'sat', key);
  const oppName = def.opponents[gameNo % def.opponents.length];
  const oppLevel = def.level + rng.normal(0, 3.5);
  const mates = Array.from({ length: 9 }, (_, i) => synthPlayer(seed, `${comp}-${season}-team`, i, teamLevel));
  const me: SimPlayer = { id: user.id, attrs: user.attrs, ovr: user.ovr, arch: user.arch, pos: user.pos, form: user.form, fatigue: user.fatigue, hurt: !!user.injury?.playingThrough, minutes: 0, starter: false };
  const team = [me, ...mates];
  const totalMin = def.minutes * 5;
  assignMinutes(team, totalMin);
  if (minutesBoost !== 1) {
    me.minutes = Math.min(def.minutes - 2, me.minutes * minutesBoost);
  }
  const opp = Array.from({ length: 10 }, (_, i) => synthPlayer(seed, key + '-opp', i, oppLevel));
  assignMinutes(opp, totalMin);
  const home = rng.chance(0.5);
  const mine: SimTeam = { id: 'U', pace: def.pace, style: 'balanced', players: team };
  const theirs: SimTeam = { id: 'O', pace: def.pace, style: 'balanced', players: opp };
  const res = simulateGame(rng, home ? mine : theirs, home ? theirs : mine, { length: def.minutes, pace: def.pace });
  const myBox = home ? res.home : res.away;
  const line = myBox.find((b) => b.pid === user.id)!;
  return { line, teamScore: home ? res.hs : res.as, oppScore: home ? res.as : res.hs, oppName, home, ot: res.ot };
}
