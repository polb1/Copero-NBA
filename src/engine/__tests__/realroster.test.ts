import { NBA_ROSTER } from '../../data/nbaRoster';
import type { NbaRosterSnapshot } from '../../data/nbaRoster';
import {
  assignRealContracts,
  buildTeamPlayers,
  contractFromSnapshot,
  selectRoster,
  statusesByStrength,
} from '../realroster';
import { RULES, scaled } from '../config';
import { POSITIONS } from '../types';

const SEASON = NBA_ROSTER.season;

function twoWayIdsOf(snap: NbaRosterSnapshot, teamId: string): Set<string> {
  const team = snap.teams.find((t) => t.teamId === teamId)!;
  return new Set(team.players.filter((id) => snap.players[id].twoWay));
}

describe('realroster', () => {
  test.each(['BOS', 'LAL', 'OKC'])('%s builds and selects a legal roster', (teamId) => {
    const players = buildTeamPlayers(NBA_ROSTER, teamId, SEASON);
    const twoWayIds = twoWayIdsOf(NBA_ROSTER, teamId);
    const { roster, extras } = selectRoster(players, twoWayIds);

    const standard = roster.filter((p) => !twoWayIds.has(p.id));
    const twoWay = roster.filter((p) => twoWayIds.has(p.id));

    expect(players.length).toBe(NBA_ROSTER.teams.find((t) => t.teamId === teamId)!.players.length);
    expect(standard).toHaveLength(14);
    expect(twoWay.length).toBeLessThanOrEqual(2);
    expect(twoWay.length).toBeGreaterThanOrEqual(1);
    expect(new Set(roster.map((p) => p.id)).size).toBe(roster.length);
    expect(roster.length + extras.length).toBe(players.length);

    for (const pos of POSITIONS) {
      expect(roster.some((p) => p.pos === pos)).toBe(true);
    }
    for (const p of [...roster, ...extras]) {
      expect(NBA_ROSTER.players[p.id]).toBeDefined();
      expect(NBA_ROSTER.teams.find((t) => t.teamId === teamId)!.players).toContain(p.id);
    }
  });

  test('assigns team and contract to the roster only', () => {
    const teamId = 'BOS';
    const players = buildTeamPlayers(NBA_ROSTER, teamId, SEASON);
    const sel = selectRoster(players, twoWayIdsOf(NBA_ROSTER, teamId));
    const { roster, extras } = assignRealContracts(sel.roster, sel.extras, NBA_ROSTER, SEASON);

    for (const p of roster) {
      expect(p.teamId).toBe(teamId);
      expect(p.contract).not.toBeNull();
      expect(p.contract!.teamId).toBe(teamId);
    }
    for (const p of extras) {
      expect(p.teamId).toBeNull();
      expect(p.contract).toBeNull();
    }
  });

  test('contracts: two-way scale, real salary and rookie scale', () => {
    const bos = buildTeamPlayers(NBA_ROSTER, 'BOS', SEASON);
    const carter = bos.find((p) => p.id === 'nba-4433188')!;
    const carterEntry = NBA_ROSTER.players[carter.id];
    const twoWay = contractFromSnapshot(carter, carterEntry, SEASON);
    expect(carterEntry.twoWay).toBe(true);
    expect(twoWay.kind).toBe('two-way');
    expect(twoWay.salaries).toEqual([scaled(RULES.twoWaySalary, SEASON)]);
    expect(twoWay.startSeason).toBe(SEASON);
    expect(twoWay.teamId).toBe('');

    const tatum = bos.find((p) => p.last === 'Tatum')!;
    const tatumEntry = NBA_ROSTER.players[tatum.id];
    const real = contractFromSnapshot(tatum, tatumEntry, SEASON);
    expect(tatumEntry.twoWay).toBe(false);
    expect(tatumEntry.salary).toBeGreaterThan(0);
    expect(real.salaries[0]).toBe(tatumEntry.salary);
    expect(real.salaries.length).toBe(Math.min(5, Math.max(1, tatumEntry.contractYears ?? 2)));

    const okc = buildTeamPlayers(NBA_ROSTER, 'OKC', SEASON);
    const sorber = okc.find((p) => p.id === 'nba-5061603')!;
    const sorberEntry = NBA_ROSTER.players[sorber.id];
    const rookie = contractFromSnapshot(sorber, sorberEntry, SEASON);
    expect(sorberEntry.yearsPro).toBe(0);
    expect(sorberEntry.salary).toBeGreaterThan(0);
    expect(rookie.kind).toBe('rookie');
    expect(rookie.rookieScale).toBe(true);
    expect(rookie.salaries[0]).toBe(sorberEntry.salary);
  });

  test('statuses split 30 teams into 5/8/9/8 by strength', () => {
    const strengths: Record<string, number> = {};
    for (let rank = 0; rank < 30; rank++) strengths[`T${rank}`] = rank;

    const statuses = statusesByStrength(strengths);
    const count = (s: string) => Object.values(statuses).filter((v) => v === s).length;

    expect(Object.keys(statuses)).toHaveLength(30);
    expect(count('contender')).toBe(5);
    expect(count('playoff')).toBe(8);
    expect(count('middle')).toBe(9);
    expect(count('rebuild')).toBe(8);
    expect(statuses.T29).toBe('contender');
    expect(statuses.T25).toBe('contender');
    expect(statuses.T24).toBe('playoff');
    expect(statuses.T17).toBe('playoff');
    expect(statuses.T16).toBe('middle');
    expect(statuses.T8).toBe('middle');
    expect(statuses.T7).toBe('rebuild');
    expect(statuses.T0).toBe('rebuild');
  });

  test('selection is deterministic', () => {
    for (const teamId of ['BOS', 'LAL', 'OKC']) {
      const twoWayIds = twoWayIdsOf(NBA_ROSTER, teamId);
      const a = selectRoster(buildTeamPlayers(NBA_ROSTER, teamId, SEASON), twoWayIds);
      const b = selectRoster(buildTeamPlayers(NBA_ROSTER, teamId, SEASON), twoWayIds);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});
