import { NBA_ROSTER, nbaAge } from '../../data/nbaRoster';
import type { NbaRosterPlayer } from '../../data/nbaRoster';
import { buildRealPlayer, inferArchetype } from '../nbaRating';
import { ATTR_KEYS } from '../attributes';
import type { Player } from '../types';

const SEASON = NBA_ROSTER.season;
const ENTRIES = Object.values(NBA_ROSTER.players);
const PLAYERS: Player[] = ENTRIES.map((e) => buildRealPlayer(e, SEASON));

const byLast = (last: string) => PLAYERS.find((p) => p.last === last)!;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

describe('nbaRating', () => {
  test('builds every snapshot entry with valid ratings and attributes', () => {
    expect(ENTRIES.length).toBe(517);
    expect(PLAYERS.length).toBe(517);
    expect(new Set(PLAYERS.map((p) => p.id)).size).toBe(517);
    for (const p of PLAYERS) {
      expect(p.ovr).toBeGreaterThanOrEqual(45);
      expect(p.ovr).toBeLessThanOrEqual(96);
      for (const k of ATTR_KEYS) {
        expect(p.attrs[k]).toBeGreaterThanOrEqual(20);
        expect(p.attrs[k]).toBeLessThanOrEqual(99);
      }
      expect(p.pot).toBeGreaterThanOrEqual(p.ovr);
      expect(p.pot).toBeLessThanOrEqual(99);
      expect(p.teamId).toBeNull();
      expect(p.contract).toBeNull();
      expect(p.injury).toBeNull();
    }
  });

  test('overall distribution stays realistic', () => {
    const ovrs = PLAYERS.map((p) => p.ovr);
    const med = median(ovrs);
    expect(med).toBeGreaterThanOrEqual(62);
    expect(med).toBeLessThanOrEqual(72);
    const elite = ovrs.filter((o) => o >= 85).length;
    expect(elite).toBeGreaterThanOrEqual(5);
    expect(elite).toBeLessThanOrEqual(30);
    const low = ovrs.filter((o) => o <= 60).length;
    expect(low).toBeGreaterThanOrEqual(40);
    expect(low).toBeLessThanOrEqual(150);
  });

  test('stars are rated as stars', () => {
    expect(byLast('Wembanyama').ovr).toBeGreaterThanOrEqual(85);
    expect(byLast('Jokić').ovr).toBeGreaterThanOrEqual(85);
    expect(byLast('Dončić').ovr).toBeGreaterThanOrEqual(85);
  });

  test('veterans without stats fall back to the salary rule', () => {
    const lillard = ENTRIES.find((e) => e.last === 'Lillard')!;
    const irving = ENTRIES.find((e) => e.last === 'Irving')!;
    expect(lillard.stats).toBeUndefined();
    expect(irving.stats).toBeUndefined();
    expect(lillard.salary).toBeGreaterThan(0);
    expect(irving.salary).toBeGreaterThan(0);
    expect(byLast('Lillard').ovr).toBeGreaterThanOrEqual(70);
    expect(byLast('Irving').ovr).toBeGreaterThanOrEqual(70);
  });

  test('is deterministic', () => {
    const again = ENTRIES.map((e) => buildRealPlayer(e, SEASON));
    expect(JSON.stringify(again)).toBe(JSON.stringify(PLAYERS));
  });

  test('archetypes fit the position and age comes from the birth date', () => {
    const wemby = ENTRIES.find((e) => e.last === 'Wembanyama')!;
    expect(nbaAge(wemby, SEASON)).toBe(SEASON - Number(wemby.birthDate.slice(0, 4)));
    expect(byLast('Wembanyama').height).toBe(224);
    const entryFactory = (pos: NbaRosterPlayer['pos']) => ({ ...wemby, pos });
    expect(inferArchetype(entryFactory('C'), wemby.stats)).toBe('rimProtector');
    expect(inferArchetype(entryFactory('PG'), wemby.stats)).toBe('allAround');
    expect(inferArchetype(wemby, undefined)).toBe('allAround');
  });
});
