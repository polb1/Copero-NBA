import { describe, expect, test } from 'vitest';
import {
  CLUB_REAL_COACHES,
  CLUB_REAL_ROSTERS,
  DRAFT_REAL_PROSPECTS,
  NBA_REAL_COACHES,
  getClubRealCoach,
  getClubRealRoster,
  getRealPlayersStats,
  searchRealPlayers,
  realToSimPlayer,
} from '../../data/realPlayers';
import { EURO_CLUBS, NCAA_PROGRAMS } from '../../data/clubs';
import { rngFor } from '../rng';

describe('Real Players API', () => {
  test('returns stats with NBA, club rosters and draft prospects', () => {
    const stats = getRealPlayersStats();
    expect(stats.nbaTeams).toBe(30);
    expect(stats.nbaPlayers).toBeGreaterThan(450);
    expect(stats.clubTeams).toBeGreaterThan(15);
    expect(stats.clubPlayers).toBeGreaterThan(150);
    expect(stats.draftProspects).toBeGreaterThanOrEqual(30);
    expect(stats.totalRealPlayers).toBeGreaterThan(700);
  });

  test('club real rosters exist for European and NCAA powerhouses', () => {
    const madrid = getClubRealRoster('Real Madrid');
    expect(madrid).toBeDefined();
    expect(madrid?.some((p) => p.name === 'Facundo Campazzo')).toBe(true);
    expect(madrid?.some((p) => p.name === 'Walter Tavares')).toBe(true);

    const barca = getClubRealRoster('FC Barcelona');
    expect(barca).toBeDefined();
    expect(barca?.some((p) => p.name === 'Kevin Punter')).toBe(true);

    const pana = getClubRealRoster('Panathinaikos');
    expect(pana?.some((p) => p.name === 'Kendrick Nunn')).toBe(true);

    const oly = getClubRealRoster('Olympiacos');
    expect(oly?.some((p) => p.name === 'Sasha Vezenkov')).toBe(true);

    const fener = getClubRealRoster('Fenerbahçe');
    expect(fener?.some((p) => p.name === 'Shane Larkin')).toBe(true);

    const duke = getClubRealRoster('Duke');
    expect(duke?.some((p) => p.name === 'Deron Rippey Jr.')).toBe(true);
  });

  test('draft real prospects contain current consensus top picks', () => {
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Cooper Flagg')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Dylan Harper')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Ace Bailey')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'VJ Edgecombe')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Nolan Traore')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Hugo González')).toBe(true);
  });

  test('every club in the game has a real roster and a real coach', () => {
    const clubs = [...EURO_CLUBS, ...NCAA_PROGRAMS];
    expect(clubs.length).toBe(177);
    const missingRoster: string[] = [];
    const missingCoach: string[] = [];
    const tooSmall: string[] = [];
    const badData: string[] = [];

    for (const club of clubs) {
      const roster = getClubRealRoster(club.name);
      if (!roster || roster.length === 0) { missingRoster.push(club.name); continue; }
      if (!getClubRealCoach(club.name)) missingCoach.push(club.name);
      if (roster.length < 8) tooSmall.push(`${club.name} (${roster.length})`);
      const names = new Set<string>();
      for (const p of roster) {
        const key = p.name.toLowerCase();
        if (names.has(key)) badData.push(`${club.name}: duplicado ${p.name}`);
        names.add(key);
        if (!Number.isFinite(p.ovr) || p.ovr < 40 || p.ovr > 99) badData.push(`${club.name}: OVR ${p.name}`);
        const pot = p.pot ?? p.ovr;
        if (!Number.isFinite(pot) || pot < p.ovr || pot > 99) badData.push(`${club.name}: POT ${p.name}`);
        if (!Number.isFinite(p.age) || p.age < 15 || p.age > 45) badData.push(`${club.name}: edad ${p.name}`);
        if (p.heightCm !== undefined && (p.heightCm < 150 || p.heightCm > 230)) badData.push(`${club.name}: altura ${p.name}`);
      }
    }

    expect(missingRoster).toEqual([]);
    expect(missingCoach).toEqual([]);
    expect(tooSmall).toEqual([]);
    expect(badData).toEqual([]);
  });

  test('NBA real coaches cover all 30 teams', () => {
    expect(Object.keys(NBA_REAL_COACHES).length).toBe(30);
    expect(Object.keys(CLUB_REAL_COACHES).length).toBeGreaterThanOrEqual(176);
  });

  test('converts real player to sim player correctly', () => {
    const rng = rngFor(42, 'test-sim-real');
    const player = CLUB_REAL_ROSTERS['Real Madrid'][0];
    const sim = realToSimPlayer(player, 'test-1', rng);
    expect(sim.id).toBe('test-1');
    expect(sim.pos).toBe(player.pos);
    expect(sim.ovr).toBeGreaterThan(65);
    expect(sim.ovr).toBeLessThanOrEqual(99);
  });

  test('search finds real players across NBA, clubs and draft', () => {
    const resCampazzo = searchRealPlayers('Campazzo');
    expect(resCampazzo.length).toBeGreaterThan(0);
    expect(resCampazzo[0].name).toContain('Campazzo');

    const resFlagg = searchRealPlayers('Flagg');
    expect(resFlagg.length).toBeGreaterThan(0);
    expect(resFlagg[0].name).toContain('Flagg');

    const resLeBron = searchRealPlayers('LeBron');
    expect(resLeBron.length).toBeGreaterThan(0);
    expect(resLeBron[0].name).toContain('LeBron');
  });
});
