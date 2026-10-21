import * as api from '../api';
import { userOf } from '../career';
import { generateDraftClass, prospectValue } from '../draft';
import type { Career } from '../types';
import { baseInput } from './autopilot';

/** Puts the career at the lottery step with the user inside the class. */
function atLottery(seed: number, ovr: number, pot: number): Career {
  const c = api.newCareer(baseInput({ route: 'college', origin: '' }), seed);
  const p = c.predraft!;
  const u = userOf(c);
  u.ovr = ovr;
  u.pot = pot;
  u.age = 21;
  const cls = generateDraftClass(seed, c.league.season + 1);
  const me = { id: 'user', name: 'Test Player', nat: u.nat, pos: u.pos, age: u.age, ovr: u.ovr, pot: u.pot, arch: u.arch, isUser: true, value: prospectValue(u.ovr, u.pot, u.age) };
  p.draftClass = [...cls.slice(0, 71), me].sort((a, b) => b.value - a.value);
  p.stockBonus = 0;
  p.order = [...Object.keys(c.league.teams), ...Object.keys(c.league.teams)];
  p.userBoosts = {};
  p.interviews = [];
  p.picks = [];
  p.step = 'lottery';
  return c;
}

test('a low-profile prospect can go undrafted and still gets non-NBA offers', () => {
  const c = atLottery(31, 55, 60);
  api.runUserDraft(c);
  const p = c.predraft!;
  expect(p.userPick).toBeNull();
  expect(c.flags.undrafted).toBe(1);
  expect(c.offers.some((o) => o.kind === 'overseas' || o.kind === 'two-way' || o.kind === 'gleague' || o.kind === 'exhibit10')).toBe(true);
});

test('a high-profile prospect is drafted', () => {
  const c = atLottery(32, 80, 90);
  api.runUserDraft(c);
  expect(c.predraft!.userPick).not.toBeNull();
  expect(c.flags.undrafted).toBeUndefined();
});

test('a bad interview lowers the board value and a good one raises it', () => {
  const good = atLottery(33, 65, 78);
  const gp = good.predraft!;
  gp.interviewQuestions = [{ teamId: 'ATL', question: 'q', answers: ['a', 'b', 'c'] }];
  gp.interviews = [];
  gp.userBoosts = {};
  const goodBefore = gp.stockBonus;
  api.answerInterview(good, 0, 0);
  expect(gp.stockBonus).toBeGreaterThan(goodBefore);

  const bad = atLottery(34, 65, 78);
  const bp = bad.predraft!;
  bp.interviewQuestions = [{ teamId: 'ATL', question: 'q', answers: ['a', 'b', 'c'] }];
  bp.interviews = [];
  bp.userBoosts = {};
  const badBefore = bp.stockBonus;
  api.answerInterview(bad, 0, 2);
  expect(bp.stockBonus).toBeLessThan(badBefore);
});