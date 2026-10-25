import { describe, expect, test } from 'vitest';
import {
  CLUB_REAL_ROSTERS,
  DRAFT_REAL_PROSPECTS,
  getClubRealRoster,
  getRealPlayersStats,
  searchRealPlayers,
  realToSimPlayer,
} from '../../data/realPlayers';
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
    expect(fener?.some((p) => p.name === 'Nigel Hayes-Davis')).toBe(true);

    const duke = getClubRealRoster('Duke');
    expect(duke?.some((p) => p.name === 'Cooper Flagg')).toBe(true);
  });

  test('draft real prospects contain current consensus top picks', () => {
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Cooper Flagg')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Dylan Harper')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Ace Bailey')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'VJ Edgecombe')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Nolan Traore')).toBe(true);
    expect(DRAFT_REAL_PROSPECTS.some((p) => p.name === 'Hugo González')).toBe(true);
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
