import * as api from '../api';
import { userOf } from '../career';
import { DRAFT_RULES, EVENT_RATE } from '../config';
import type { Career, Mode } from '../types';
import { baseInput } from './autopilot';

/** Reaches the combine without playing a season, with a clear NBA projection. */
function toCombine(mode: Mode, seed = 201): Career {
  const c = api.newCareer(baseInput({ route: 'college', origin: 'Duke', mode }), seed);
  const p = c.predraft!;
  const u = userOf(c);
  u.ovr = 88;
  u.pot = 95;
  p.step = 'decision';
  expect(api.predraftDecision(c, true)).toBe(true);
  expect(p.step).toBe('combine');
  return c;
}

function playAllPerfect(c: Career) {
  for (let guard = 0; guard < 10 && c.predraft!.step === 'combineTests'; guard++) {
    const t = c.predraft!.combineTests!.find((x) => x.made === undefined);
    if (!t) break;
    api.playCombineTest(c, t.spec.attempts);
  }
}

describe('draft pace', () => {
  for (const mode of ['express', 'quick', 'full'] as Mode[]) {
    test(`${mode}: exact decisions and combine tests`, () => {
      const rule = DRAFT_RULES[mode];
      const c = toCombine(mode);
      api.doCombine(c, 'full');

      const p = c.predraft!;
      expect(p.step).toBe('combineTests');
      expect(p.combineTests).toHaveLength(rule.tests);

      playAllPerfect(c);
      expect(p.step).toBe('interviews');
      expect(p.interviewQuestions).toHaveLength(rule.interviews);

      for (let guard = 0; guard < 10 && p.step === 'interviews'; guard++) {
        api.answerInterview(c, p.interviews.length, 0);
      }
      expect(p.step).toBe('mock');
      expect(p.interviews).toHaveLength(rule.interviews);

      const decisions = rule.interviews + (rule.plan ? 1 : 0);
      expect(decisions).toBe(rule.tests);
    });
  }

  test('the per-season rate did not change', () => {
    expect(EVENT_RATE).toEqual({
      express: { min: 1, max: 1 },
      quick: { min: 2, max: 3 },
      full: { min: 4, max: 5 },
      daily: { min: 1, max: 1 },
    });
  });
});
