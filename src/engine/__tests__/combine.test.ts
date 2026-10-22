import * as api from '../api';
import { userOf } from '../career';
import { combineTestIds, COMBINE_TESTS } from '../../content/combine';
import { combineTier, userDraftValue } from '../offseason';
import { generateDraftClass, runLottery, simulateDraft } from '../draft';
import type { Career, Pos } from '../types';
import { baseInput } from './autopilot';

/** Reaches the draft combine through the real college path (club → season → decision). */
function toCombine(seed: number): Career {
  const c = api.newCareer(baseInput({ route: 'college', origin: '' }), seed);
  const p = c.predraft!;
  expect(p.step).toBe('club');
  if (c.pendingEvent) {
    api.chooseOption(c, 0);
    api.dismissEvent(c);
  }
  api.chooseStartingClub(c, p.clubChoices![0].name);
  expect(p.step).toBe('season');

  for (let i = 0; i < 500 && p.step !== 'decision'; i++) {
    if (c.pendingEvent) {
      if (c.pendingEvent.resolved) api.dismissEvent(c);
      else api.chooseOption(c, [...Array(c.pendingEvent.options.length).keys()].find((k) => api.canAfford(c, k)) ?? 0);
      continue;
    }
    api.advance(c, 'season');
  }
  expect(p.step).toBe('decision');

  const u = userOf(c);
  u.ovr = Math.max(u.ovr, 68);
  u.pot = Math.max(u.pot, 80);
  api.predraftDecision(c, true);
  expect(p.step).toBe('combine');
  return c;
}

/** Plays every pending test with a perfect score. */
function playAllPerfect(c: Career) {
  while (c.predraft!.step === 'combineTests') {
    const t = c.predraft!.combineTests!.find((x) => x.made === undefined)!;
    api.playCombineTest(c, t.spec.attempts);
  }
}

describe('draft combine', () => {
  test('the combine level follows the OVR/potential projection', () => {
    const c = api.newCareer(baseInput({ route: 'college', origin: '' }), 7);
    const u = userOf(c);

    u.ovr = 55;
    u.pot = 65; // 59.5
    expect(combineTier(u)).toBe('easy');
    u.ovr = 60;
    u.pot = 68; // 63.6
    expect(combineTier(u)).toBe('easy');

    u.ovr = 64;
    u.pot = 64; // 64.0
    expect(combineTier(u)).toBe('normal');
    u.ovr = 70;
    u.pot = 74; // 71.8
    expect(combineTier(u)).toBe('normal');

    u.ovr = 72;
    u.pot = 72; // 72.0
    expect(combineTier(u)).toBe('hard');
    u.ovr = 80;
    u.pot = 90; // 84.5
    expect(combineTier(u)).toBe('hard');
  });

  test('the third test depends on the position', () => {
    expect(combineTestIds('PG')).toEqual(['shooting', 'athletic', 'handling']);
    expect(combineTestIds('SG')).toEqual(['shooting', 'athletic', 'handling']);
    expect(combineTestIds('SF')).toEqual(['shooting', 'athletic', 'defense']);
    expect(combineTestIds('PF')).toEqual(['shooting', 'athletic', 'defense']);
    expect(combineTestIds('C')).toEqual(['shooting', 'athletic', 'strength']);
    for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]) {
      for (const id of combineTestIds(pos)) expect(COMBINE_TESTS.some((t) => t.id === id)).toBe(true);
    }
  });

  test('choosing the full plan arms three unplayed tests', () => {
    const c = toCombine(11);
    api.doCombine(c, 'full');
    const p = c.predraft!;

    expect(p.step).toBe('combineTests');
    expect(p.combinePlan).toBe('full');
    expect(p.combine!.grade).toBe('Pendiente');
    expect(p.combineTests).toHaveLength(3);
    expect(p.combineTests!.map((t) => t.id)).toEqual(combineTestIds(userOf(c).pos));
    for (const t of p.combineTests!) {
      expect(t.made).toBeUndefined();
      expect(t.spec.tier).toBe(combineTier(userOf(c)));
      expect(t.spec.attempts).toBeGreaterThan(0);
      expect(t.weight).toBeGreaterThan(0);
    }
  });

  test('a perfect combine reaches the interviews and grades the combine', () => {
    const c = toCombine(12);
    const before = c.predraft!.stockBonus;
    api.doCombine(c, 'full');
    playAllPerfect(c);

    const p = c.predraft!;
    expect(p.step).toBe('interviews');
    expect(p.interviewTeams.length).toBeGreaterThan(0);
    expect(['A', 'B']).toContain(p.combineResult!.grade);
    expect(Number.isFinite(p.combineResult!.bonus)).toBe(true);
    expect(Number.isFinite(p.stockBonus)).toBe(true);
    expect(p.stockBonus).not.toBe(before);
    expect(p.combine!.grade).toBe(p.combineResult!.grade);
    expect(p.combineResult!.detail).toContain('%');
    expect(p.draftClass!.find((x) => x.isUser)!.value).toBeCloseTo(
      userDraftValue(userOf(c), p.stockBonus),
      6,
    );
    expect(p.combineResult!.grade).toMatch(/^[ABCD]$/);
  });

  test('a perfect hard combine pays more stock than a perfect safe one', () => {
    const hard = toCombine(13);
    api.doCombine(hard, 'hard');
    playAllPerfect(hard);

    const safe = toCombine(13);
    api.doCombine(safe, 'safe');
    playAllPerfect(safe);

    expect(safe.predraft!.combineTests).toHaveLength(2);
    expect(safe.predraft!.step).toBe('interviews');
    expect(hard.predraft!.stockBonus).toBeGreaterThan(safe.predraft!.stockBonus);
  });

  test('a simulated test is deterministic and lands inside its range', () => {
    const a = toCombine(14);
    api.doCombine(a, 'full');
    api.playCombineTest(a);

    const b = toCombine(14);
    api.doCombine(b, 'full');
    api.playCombineTest(b);

    const ta = a.predraft!.combineTests![0];
    const tb = b.predraft!.combineTests![0];
    expect(ta.made).toBe(tb.made);
    expect(ta.made).toBeGreaterThanOrEqual(0);
    expect(ta.made).toBeLessThanOrEqual(ta.spec.attempts);
    expect(a.predraft!.step).toBe('combineTests');

    // Out-of-range input is clamped instead of trusted.
    api.playCombineTest(a, 99);
    expect(a.predraft!.combineTests![1].made).toBe(a.predraft!.combineTests![1].spec.attempts);
  });

  test('simulateDraft is deterministic and does not throw', () => {
    const c = api.newCareer(baseInput({ route: 'drafted' }), 15);
    const L = c.league;
    const season = L.season + 1;
    const cls = generateDraftClass(15, season);
    const { order } = runLottery(L, 15);

    const first = simulateDraft(L, 15, order, cls);
    const second = simulateDraft(L, 15, order, cls);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
    expect(new Set(first.map((p) => p.prospectId)).size).toBe(first.length);
  });
});
