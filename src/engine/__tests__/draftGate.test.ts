/** @vitest-environment node */
import * as api from '../api';
import { userOf } from '../career';
import { generateDraftClass, draftCutoff, draftVerdict } from '../draft';
import { userDraftValue } from '../offseason';
import { prospectValue } from '../draft';
import { baseInput } from './autopilot';

function atDecision(seed: number, ovr: number, pot: number, age = 19) {
  const c = api.newCareer(baseInput({ route: 'college', origin: 'Duke' }), seed);
  const p = c.predraft!;
  const u = userOf(c);
  u.ovr = ovr; u.pot = pot; u.age = age;
  p.step = 'decision';
  p.clubName = 'Duke';
  return { c, p, u };
}

describe('draft gate', () => {
  test('userDraftValue applies the OVR penalties and the age penalty', () => {
    const s = 101;

    const low = atDecision(s, 57, 70);
    expect(userDraftValue(low.u, 0)).toBeCloseTo(prospectValue(57, 70, 19) - 16, 6);

    const mid = atDecision(s, 61, 70);
    expect(userDraftValue(mid.u, 0)).toBeCloseTo(prospectValue(61, 70, 19) - 9, 6);

    const high = atDecision(s, 65, 70);
    expect(userDraftValue(high.u, 0)).toBeCloseTo(prospectValue(65, 70, 19) - 4, 6);

    const clear = atDecision(s, 70, 70);
    expect(userDraftValue(clear.u, 0)).toBeCloseTo(prospectValue(70, 70, 19) - 0, 6);

    const older = atDecision(s, 61, 70, 21);
    expect(userDraftValue(older.u, 0)).toBeCloseTo(prospectValue(61, 70, 21) - 9 - 2.4, 6);
  });

  test('draftCutoff is the pick-57 board value plus the margin, and draftVerdict gates on it', () => {
    const cls = generateDraftClass(11, 2027);
    const expected = [...cls].sort((a, b) => b.value - a.value)[57].value + 1.5;
    const cutoff = draftCutoff(cls);

    expect(cutoff).toBeCloseTo(expected, 6);
    expect(draftVerdict(cls, cutoff).interested).toBe(true);
    expect(draftVerdict(cls, cutoff - 0.01).interested).toBe(false);
  });

  test('nbaInterest compares the user value against the cutoff', () => {
    const low = atDecision(103, 50, 55, 22);
    low.p.stockBonus = -10;
    expect(api.nbaInterest(low.c).interested).toBe(false);

    const high = atDecision(103, 88, 95, 19);
    expect(api.nbaInterest(high.c).interested).toBe(true);
  });

  test('declaring without NBA interest sends the player back to his club', () => {
    const { c, p } = atDecision(104, 50, 55, 22);
    p.stockBonus = -10;
    expect(api.nbaInterest(c).interested).toBe(false);

    expect(api.predraftDecision(c, true)).toBe(false);
    expect(p.step).toBe('season');
    expect(p.lastOutcome).toBe('no-interest');
    expect(p.waits).toBe(1);
    expect(p.draftClass).toBeUndefined();
    expect(c.satellite).not.toBeNull();
  });

  test('declaring with NBA interest opens the combine', () => {
    const { c, p } = atDecision(105, 88, 95, 19);

    expect(api.predraftDecision(c, true)).toBe(true);
    expect(p.step).toBe('combine');
    expect(p.draftClass).toBeDefined();
    expect(p.lastOutcome).toBeUndefined();
  });

  test('skipping the combine counts as a wait', () => {
    const { c, p } = atDecision(106, 88, 95, 19);
    api.predraftDecision(c, true);
    expect(p.step).toBe('combine');

    api.doCombine(c, 'skip');
    expect(p.step).toBe('season');
    expect(p.lastOutcome).toBe('skipped-combine');
    expect(p.waits).toBe(1);
    expect(p.combineTests).toBeUndefined();
    expect(p.combine?.grade).toBe('No participó');
  });

  test('a failed combine closes the door for the year', () => {
    const { c, p } = atDecision(107, 88, 95, 19);
    api.predraftDecision(c, true);
    api.doCombine(c, 'full');

    api.playCombineTest(c, 0);
    api.playCombineTest(c, 0);
    api.playCombineTest(c, 0);

    expect(p.step).toBe('season');
    expect(p.lastOutcome).toBe('combine-failed');
    expect(p.waits).toBe(1);
    expect(p.interviewTeams.length).toBe(0);
    expect(p.combineResult).toBeDefined();
  });

  test('a combine with one bad test of three reaches the interviews', () => {
    const { c, p } = atDecision(108, 88, 95, 19);
    api.predraftDecision(c, true);
    api.doCombine(c, 'full');

    api.playCombineTest(c, 0);
    api.playCombineTest(c, p.combineTests![1].spec.attempts);
    api.playCombineTest(c, p.combineTests![2].spec.attempts);

    expect(p.step).toBe('interviews');
    expect(p.lastOutcome).toBeUndefined();
  });

  test('three waits close the NBA door and force the European career', () => {
    const { c, p } = atDecision(109, 50, 55, 22);

    for (let i = 0; i < 3; i++) {
      p.step = 'decision';
      expect(api.predraftDecision(c, true)).toBe(false);
    }
    expect(p.waits).toBe(3);
    expect(p.noNbaInterest).toBe(true);

    p.step = 'decision';
    expect(api.predraftDecision(c, false)).toBe(false);
    expect(p.step).toBe('done');
    expect(c.flags.euroCareer).toBe(1);
    expect(c.phase).toBe('offseason');
  });

  test('waiting a year voluntarily does not count as a failed attempt', () => {
    const { c, p } = atDecision(110, 88, 95, 19);

    p.step = 'decision';
    api.predraftDecision(c, false);

    expect(p.step).toBe('season');
    expect(p.waits).toBe(1);
    expect(p.lastOutcome).toBeUndefined();
  });
});
