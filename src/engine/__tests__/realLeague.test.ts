import { createCareer } from '../career';
import { createLeague, createRealLeague } from '../league';
import { POSITIONS } from '../types';
import type { League } from '../types';
import { baseInput } from './autopilot';

describe('real league', () => {
  let L: League;
  beforeAll(() => {
    L = createRealLeague(42, 2026);
  });

  test('30 teams with realistic rosters built from the snapshot', () => {
    const teams = Object.values(L.teams);
    expect(teams.length).toBe(30);
    for (const t of teams) {
      expect(t.roster.length).toBeGreaterThanOrEqual(14);
      expect(t.roster.length).toBeLessThanOrEqual(16);
      const ps = t.roster.map((id) => L.players[id]);
      expect(ps.every(Boolean)).toBe(true);
      const standard = ps.filter((p) => p.contract?.kind !== 'two-way');
      const twoWay = ps.filter((p) => p.contract?.kind === 'two-way');
      expect(standard.length).toBe(14);
      expect(twoWay.length).toBeLessThanOrEqual(2);
      for (const pos of POSITIONS) expect(ps.some((p) => p.pos === pos)).toBe(true);
      for (const p of ps) expect(p.contract).toBeTruthy();
    }
  });

  test('league is marked as real, big enough and has free agents', () => {
    expect(L.rosterSource).toBe('real');
    expect(Object.keys(L.players).length).toBeGreaterThan(500);
    expect(L.freeAgents.length).toBeGreaterThanOrEqual(30);
  });

  test('deterministic for the same seed', () => {
    expect(JSON.stringify(createRealLeague(42, 2026))).toBe(JSON.stringify(createRealLeague(42, 2026)));
  });

  test('createLeague still builds the fictional league', () => {
    const F = createLeague(42, 2026);
    expect(F.rosterSource).toBe('fictional');
    for (const t of Object.values(F.teams)) expect(t.roster.length).toBe(14);
  });

  test('createCareer starts from the real league', () => {
    expect(createCareer(baseInput(), 42).league.rosterSource).toBe('real');
  });
});
