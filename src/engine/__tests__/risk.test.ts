import * as api from '../api';
import { baseInput } from './autopilot';
import { openEvent, userOf } from '../career';
import { rollInjury } from '../injuries';
import { mulberry32 } from '../rng';

test('risky options show their odds and a bad outcome can end the season', () => {
  let ended = 0;
  let fine = 0;
  for (let seed = 0; seed < 40; seed++) {
    const c = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 500 + seed);
    api.acceptOffer(c, c.offers[0].id);
    const u = userOf(c);
    u.injury = rollInjury(mulberry32(seed), 'leve');
    c.workEthic = 50;
    c.pendingEvent = null;
    expect(openEvent(c, 'gamble-injection')).toBe(true);
    expect(c.pendingEvent!.options[0].odds).toBe(60);
    expect(c.pendingEvent!.options[1].odds).toBeUndefined();
    api.chooseOption(c, 0);
    if (userOf(c).injury?.severity === 'grave') ended++;
    else fine++;
  }
  // Roughly 40 % of the gambles go wrong, and a mild injury becomes a season-ending one.
  expect(ended).toBeGreaterThan(8);
  expect(fine).toBeGreaterThan(14);
});
