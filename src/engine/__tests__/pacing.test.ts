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
  // Narrative decisions per season: Exprés 1, Normal 2-3, Larga 4-5.
  const range: Partial<Record<Mode, [number, number]>> = { express: [1, 1], quick: [2, 3], full: [4, 5] };
  for (const mode of ['express', 'quick', 'full'] as Mode[]) {
    test(`${mode}: decisions per season match the pace`, () => {
      const c = api.newCareer(baseInput({ route: 'drafted', mode }), 777);
      const { done } = playSimple(c, 6);
      expect(done).toBeGreaterThanOrEqual(5);
      const [lo, hi] = range[mode]!;
      const seasons = [...new Set(c.seasons.filter((s) => s.comp === 'NBA').map((s) => s.season))];
      for (const s of seasons) {
        const n = c.flags[`events${s}`] ?? 0;
        expect(n).toBeGreaterThanOrEqual(lo);
        expect(n).toBeLessThanOrEqual(hi);
      }
    }, 120000);
  }
});
