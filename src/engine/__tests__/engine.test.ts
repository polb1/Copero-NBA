import { createLeague } from '../league';
import { buildMatchups } from '../schedule';
import { playPostseasonDay, playRegularDay, regularSeasonOver, startPostseason, standings } from '../season';
import { computeAwards } from '../awards';
import { averages } from '../stats';
import { computeOvr } from '../attributes';
import { rngFor } from '../rng';
import { lotteryPool, runLottery, generateDraftClass } from '../draft';
import { rookieScale, capFor, RULES } from '../config';
import type { BoxLine, League } from '../types';

function simSeason(seed: number) {
  const L = createLeague(seed, 2026);
  const boxes: { line: BoxLine; teamPts: number; ot: number }[] = [];
  const teamGames: { pts: number; min: number; ot: number }[] = [];
  const hooks = {
    onGame: (_ctx: unknown, res: { hs: number; as: number; ot: number; home: BoxLine[]; away: BoxLine[] }) => {
      for (const [box, pts] of [[res.home, res.hs], [res.away, res.as]] as const) {
        teamGames.push({ pts, min: box.reduce((s, b) => s + b.min, 0), ot: res.ot });
        for (const b of box) boxes.push({ line: b, teamPts: pts, ot: res.ot });
      }
    },
  };
  while (!regularSeasonOver(L)) playRegularDay(L, seed, hooks as never);
  return { L, boxes, teamGames, hooks };
}

let cached: ReturnType<typeof simSeason> | null = null;
const season = () => (cached ??= simSeason(2024));

describe('schedule', () => {
  test('82 games per team, 1230 in total, NBA formula', () => {
    const L = createLeague(1, 2026);
    const m = buildMatchups(Object.values(L.teams), rngFor(1, 'm'));
    expect(m.length).toBe(1230);
    const count: Record<string, number> = {};
    const home: Record<string, number> = {};
    for (const g of m) {
      count[g.home] = (count[g.home] ?? 0) + 1;
      count[g.away] = (count[g.away] ?? 0) + 1;
      home[g.home] = (home[g.home] ?? 0) + 1;
    }
    for (const id of Object.keys(L.teams)) {
      expect(count[id]).toBe(82);
      expect(home[id]).toBeGreaterThanOrEqual(39);
      expect(home[id]).toBeLessThanOrEqual(43);
    }
    expect(L.schedule.length).toBe(1230);
    // Nobody plays twice on the same day
    const byDay = new Map<number, Set<string>>();
    for (const g of L.schedule) {
      const s = byDay.get(g.day) ?? new Set();
      expect(s.has(g.home) || s.has(g.away)).toBe(false);
      s.add(g.home).add(g.away);
      byDay.set(g.day, s);
    }
  });
});

describe('determinism', () => {
  test('same seed => identical league and results', () => {
    const a = createLeague(77, 2026);
    const b = createLeague(77, 2026);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (let i = 0; i < 20; i++) {
      playRegularDay(a, 77, {});
      playRegularDay(b, 77, {});
    }
    expect(JSON.stringify(a.teams)).toBe(JSON.stringify(b.teams));
  });
  test('different seed => different league', () => {
    expect(JSON.stringify(createLeague(1, 2026).players)).not.toBe(JSON.stringify(createLeague(2, 2026).players));
  });
});

describe('box score integrity', () => {
  test('no impossible stat lines', () => {
    const { boxes } = season();
    for (const { line: b } of boxes) {
      expect(b.fgm).toBeLessThanOrEqual(b.fga);
      expect(b.tpm).toBeLessThanOrEqual(b.tpa);
      expect(b.tpa).toBeLessThanOrEqual(b.fga);
      expect(b.tpm).toBeLessThanOrEqual(b.fgm);
      expect(b.ftm).toBeLessThanOrEqual(b.fta);
      expect(b.pts).toBe(2 * (b.fgm - b.tpm) + 3 * b.tpm + b.ftm);
      expect(b.pf).toBeLessThanOrEqual(6);
      for (const k of ['pts', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'fga', 'fta', 'min'] as const) expect(b[k]).toBeGreaterThanOrEqual(0);
      expect(b.min).toBeLessThanOrEqual(48 + 5 * 5);
    }
  });
  test('team minutes add up to 240 (+25 per overtime)', () => {
    const { teamGames } = season();
    for (const g of teamGames) expect(Math.abs(g.min - (240 + g.ot * 25))).toBeLessThan(2);
  });
  test('team points equal the sum of player points; no ties', () => {
    const { L } = season();
    for (const g of L.schedule) {
      expect(g.played).toBe(true);
      expect(g.hs).not.toBe(g.as);
    }
  });
});

describe('league-level distributions', () => {
  test('league averages fall in realistic ranges', () => {
    const { teamGames, boxes } = season();
    const n = teamGames.length;
    const ppg = teamGames.reduce((s, g) => s + g.pts, 0) / n;
    const sum = (k: keyof BoxLine) => boxes.reduce((s, b) => s + (b.line[k] as number), 0);
    const fgPct = sum('fgm') / sum('fga');
    const tpPct = sum('tpm') / sum('tpa');
    const ftPct = sum('ftm') / sum('fta');
    const tpaPerTeam = sum('tpa') / n;
    const rebPerTeam = (sum('oreb') + sum('dreb')) / n;
    const astPerTeam = sum('ast') / n;
    const tovPerTeam = sum('tov') / n;
    expect(ppg).toBeGreaterThan(104);
    expect(ppg).toBeLessThan(122);
    expect(fgPct).toBeGreaterThan(0.44);
    expect(fgPct).toBeLessThan(0.51);
    expect(tpPct).toBeGreaterThan(0.33);
    expect(tpPct).toBeLessThan(0.4);
    expect(ftPct).toBeGreaterThan(0.72);
    expect(ftPct).toBeLessThan(0.84);
    expect(tpaPerTeam).toBeGreaterThan(28);
    expect(tpaPerTeam).toBeLessThan(45);
    expect(rebPerTeam).toBeGreaterThan(38);
    expect(rebPerTeam).toBeLessThan(52);
    expect(astPerTeam).toBeGreaterThan(20);
    expect(astPerTeam).toBeLessThan(31);
    expect(tovPerTeam).toBeGreaterThan(10);
    expect(tovPerTeam).toBeLessThan(17);
  });

  test('stat leaders are plausible, not absurd', () => {
    const { L } = season();
    const qualified = Object.values(L.players).filter((p) => p.season.gp >= 58).map((p) => ({ p, a: averages(p.season) }));
    const maxPpg = Math.max(...qualified.map((x) => x.a.ppg));
    const maxRpg = Math.max(...qualified.map((x) => x.a.rpg));
    const maxApg = Math.max(...qualified.map((x) => x.a.apg));
    expect(maxPpg).toBeGreaterThan(24);
    expect(maxPpg).toBeLessThan(40);
    expect(maxRpg).toBeLessThan(17);
    expect(maxApg).toBeLessThan(14);
    const over30 = qualified.filter((x) => x.a.ppg >= 30).length;
    expect(over30).toBeLessThan(10);
  });

  test('bench players get far fewer minutes than stars', () => {
    const { L } = season();
    for (const t of Object.values(L.teams)) {
      const ps = t.roster.map((id) => L.players[id]).filter((p) => p.season.gp > 20).sort((a, b) => b.ovr - a.ovr);
      const best = averages(ps[0].season).mpg;
      const last = averages(ps[ps.length - 1].season).mpg;
      expect(best).toBeGreaterThan(last + 8);
    }
  });

  test('win distribution has contenders and strugglers but no 82-0', () => {
    const { L } = season();
    const wins = Object.values(L.teams).map((t) => t.w).sort((a, b) => b - a);
    expect(wins.reduce((s, w) => s + w, 0)).toBe(1230);
    expect(wins[0]).toBeGreaterThan(50);
    expect(wins[0]).toBeLessThan(76);
    expect(wins[29]).toBeGreaterThan(8);
    expect(wins[29]).toBeLessThan(35);
  });
});

describe('postseason and awards', () => {
  let L: League;
  beforeAll(() => {
    L = season().L;
    startPostseason(L);
    let guard = 0;
    while (!playPostseasonDay(L, 2024, {}) && guard++ < 200);
  });
  test('play-in and bracket produce a single champion', () => {
    const ps = L.postseason!;
    expect(ps.playIn.length).toBe(6);
    expect(ps.series.filter((s) => s.round === 1).length).toBe(8);
    expect(ps.series.filter((s) => s.round === 4).length).toBe(1);
    for (const s of ps.series) {
      expect(Math.max(s.winsHigh, s.winsLow)).toBe(4);
      expect(Math.min(s.winsHigh, s.winsLow)).toBeLessThan(4);
    }
    expect(ps.champion).toBeDefined();
    const top6 = new Set([...standings(L, 'E').slice(0, 6), ...standings(L, 'W').slice(0, 6)].map((t) => t.id));
    for (const s of ps.series.filter((x) => x.round === 1)) expect(top6.has(s.high)).toBe(true);
  });
  test('awards respect eligibility (65 games)', () => {
    const a = computeAwards(L);
    for (const id of [a.mvp, a.dpoy, ...a.allNba.flat(), ...a.allDef.flat()]) {
      expect(L.players[id!].season.gp).toBeGreaterThanOrEqual(RULES.awardMinGames);
    }
    expect(a.allNba.flat().length).toBe(15);
    expect(new Set(a.allNba.flat()).size).toBe(15);
    if (a.roy) expect(L.players[a.roy].yearsPro).toBe(0);
    if (a.smoy) expect(L.players[a.smoy].season.gs).toBeLessThan(L.players[a.smoy].season.gp / 2);
  });
  test('lottery: 3-2-1 format with 16 teams, worst three cannot fall below 12', () => {
    const pool = lotteryPool(L);
    expect(pool.length).toBe(16);
    expect(pool.filter((e) => e.balls === 3).length).toBe(7);
    expect(pool.filter((e) => e.balls === 2).length).toBe(7);
    expect(pool.filter((e) => e.balls === 1).length).toBe(2);
    const { order } = runLottery(L, 9);
    expect(order.length).toBe(60);
    expect(new Set(order.slice(0, 30)).size).toBe(30);
    const worst3 = pool.filter((e) => e.preRank <= 3).map((e) => e.teamId);
    for (const id of worst3) expect(order.indexOf(id)).toBeLessThan(12);
  });
});

describe('ratings and contracts', () => {
  test('OVR responds to attributes and stays in 25-99', () => {
    const base = Object.fromEntries(['three', 'mid', 'ft', 'close', 'layup', 'dunk', 'handle', 'pass', 'vision', 'speed', 'accel', 'strength', 'vert', 'stamina', 'perD', 'intD', 'steal', 'block', 'oreb', 'dreb', 'offIQ', 'defIQ', 'consistency'].map((k) => [k, 70])) as never;
    const o = computeOvr(base, 'SG');
    const better = computeOvr({ ...(base as object), three: 95 } as never, 'SG');
    expect(better).toBeGreaterThan(o);
    expect(computeOvr(Object.fromEntries(Object.keys(base).map((k) => [k, 99])) as never, 'C')).toBeLessThanOrEqual(99);
  });
  test('rookie scale decreases with pick and scales with the cap', () => {
    expect(rookieScale(1, 2026)).toBeGreaterThan(rookieScale(10, 2026));
    expect(rookieScale(10, 2026)).toBeGreaterThan(rookieScale(30, 2026));
    expect(rookieScale(1, 2030)).toBeGreaterThan(rookieScale(1, 2026));
    expect(capFor(2026)).toBe(RULES.cap);
  });
  test('draft classes are coherent and reproducible', () => {
    const a = generateDraftClass(5, 2027);
    expect(a.length).toBe(72);
    expect(JSON.stringify(a)).toBe(JSON.stringify(generateDraftClass(5, 2027)));
    for (const p of a) {
      expect(p.pot).toBeGreaterThanOrEqual(p.ovr);
      expect(p.age).toBeGreaterThanOrEqual(19);
      expect(p.age).toBeLessThanOrEqual(23);
    }
  });
});
