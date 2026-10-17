import type { Game, Team } from './types';
import type { Rng } from './rng';

/**
 * 82-game schedule using the NBA formula:
 * 4 x division rivals (16) + 4 x six conference rivals (24) + 3 x four conference rivals (12) + 2 x other conference (30).
 */
export function buildMatchups(teams: Team[], rng: Rng): { home: string; away: string }[] {
  const out: { home: string; away: string }[] = [];
  const add = (a: string, b: string, n: number) => {
    // split home/away as evenly as possible; odd game goes to a random side
    const aHome = Math.floor(n / 2) + (n % 2 === 1 && rng.chance(0.5) ? 1 : 0);
    for (let i = 0; i < n; i++) out.push(i < aHome ? { home: a, away: b } : { home: b, away: a });
  };
  const byDiv = new Map<string, Team[]>();
  for (const t of teams) byDiv.set(t.div, [...(byDiv.get(t.div) ?? []), t]);
  // three-game pairs: for each pair of divisions in a conference, a 2-regular cyclic bipartite pairing
  const threeGame = new Set<string>();
  const key = (a: string, b: string) => (a < b ? a + b : b + a);
  for (const conf of ['E', 'W'] as const) {
    const divs = [...byDiv.entries()].filter(([, ts]) => ts[0].conf === conf).map(([, ts]) => rng.shuffle([...ts]));
    for (let x = 0; x < divs.length; x++)
      for (let y = x + 1; y < divs.length; y++)
        for (let i = 0; i < 5; i++) {
          threeGame.add(key(divs[x][i].id, divs[y][i].id));
          threeGame.add(key(divs[x][i].id, divs[y][(i + 1) % 5].id));
        }
  }
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i];
      const b = teams[j];
      if (a.conf !== b.conf) add(a.id, b.id, 2);
      else if (a.div === b.div) add(a.id, b.id, 4);
      else add(a.id, b.id, threeGame.has(key(a.id, b.id)) ? 3 : 4);
    }
  return out;
}

export function buildSchedule(teams: Team[], rng: Rng): { games: Game[]; lastDay: number } {
  const queue = rng.shuffle(buildMatchups(teams, rng));
  const games: Game[] = [];
  const lastPlayed = new Map<string, number>();
  let day = 0;
  let id = 1;
  const breakStart = 116;
  while (queue.length && day < 400) {
    day++;
    if (day >= breakStart && day < breakStart + 6) continue; // All-Star break
    const busy = new Set<string>();
    const cap = 6 + rng.int(0, 3);
    let placed = 0;
    for (let i = 0; i < queue.length && placed < cap; i++) {
      const g = queue[i];
      if (busy.has(g.home) || busy.has(g.away)) continue;
      const b2b = lastPlayed.get(g.home) === day - 1 || lastPlayed.get(g.away) === day - 1;
      if (b2b && !rng.chance(0.2)) continue;
      busy.add(g.home);
      busy.add(g.away);
      lastPlayed.set(g.home, day);
      lastPlayed.set(g.away, day);
      games.push({ id: id++, day, home: g.home, away: g.away, played: false, kind: 'regular' });
      queue.splice(i, 1);
      i--;
      placed++;
    }
  }
  return { games, lastDay: day };
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Day 1 of the regular season = 21 October of the season's start year. */
export function dayToDate(season: number, day: number): Date {
  const d = new Date(Date.UTC(season, 9, 20));
  d.setUTCDate(d.getUTCDate() + day);
  return d;
}

export function fmtDate(season: number, day: number) {
  const d = dayToDate(season, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const seasonLabel = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
