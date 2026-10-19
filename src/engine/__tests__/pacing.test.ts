import * as api from '../api';
import { baseInput } from './autopilot';
import type { Career, Mode } from '../types';

/** Drives a career like the simple screen does and counts every stop that asks the user for input. */
function playSimple(c: Career, seasons: number) {
  let stops = 0;
  let done = 0;
  for (let guard = 0; guard < 2000 && done < seasons && c.phase !== 'retired'; guard++) {
    if (c.pendingEvent) {
      stops++;
      api.chooseOption(c, c.pendingEvent.options.findIndex((_, i) => api.canAfford(c, i)));
      api.dismissEvent(c);
      api.runUntilDecision(c);
      continue;
    }
    switch (c.phase) {
      case 'season-end':
        done++;
        stops++;
        api.beginOffseason(c);
        break;
      case 'signing':
      case 'offseason':
        stops++;
        if (c.offers.length) api.acceptOffer(c, c.offers[0].id);
        c.offers = [];
        if (api.needsContract(c) && !c.satellite) api.retire(c, 'test');
        break;
      default:
        break;
    }
    api.runUntilDecision(c);
  }
  return { stops, done };
}

describe('simple-mode pacing', () => {
  for (const mode of ['quick', 'full'] as Mode[]) {
    test(`${mode}: few decisions per season`, () => {
      const c = api.newCareer(baseInput({ route: 'drafted', mode }), 777);
      const { stops, done } = playSimple(c, 6);
      expect(done).toBeGreaterThanOrEqual(5);
      const perSeason = stops / done;
      // Season report + random events (1 in Normal, up to 2 in Intenso) + occasional contracts/injuries.
      expect(perSeason).toBeLessThan(mode === 'quick' ? 3.2 : 4.2);
    }, 120000);
  }
});
