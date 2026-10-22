/** @vitest-environment node */
// The all-in gamble is a normal decision now: no shortcut button, and `maxSeen` caps it at three.
import * as api from '../api';
import { eventContext, openEvent } from '../career';
import { eligibleEvents } from '../events';
import type { Career } from '../types';
import { baseInput } from './autopilot';

/** An adult full-mode career with a controlled wallet, parked in the offseason. */
function fullCareer(seed: number, cash: number): Career {
  const c = api.newCareer(baseInput({ mode: 'full', age: 30 }), seed);
  c.cash = cash;
  c.phase = 'offseason';
  return c;
}

describe('all-in gamble as a normal decision', () => {
  test('openEvent allows three calls and refuses the fourth', () => {
    const c = fullCareer(7101, 50_000);
    expect(openEvent(c, 'gamble-allin')).toBe(true);
    c.pendingEvent = null;
    expect(openEvent(c, 'gamble-allin')).toBe(true);
    c.pendingEvent = null;
    expect(openEvent(c, 'gamble-allin')).toBe(true);
    c.pendingEvent = null;
    expect(openEvent(c, 'gamble-allin')).toBe(false);
    expect(c.flags['seen:gamble-allin']).toBe(3);
    expect(c.pendingEvent).toBeNull();
  });

  test('with maxSeen reached the event is no longer eligible', () => {
    const c = fullCareer(7102, 50_000);
    expect(eligibleEvents(eventContext(c)).some((e) => e.id === 'gamble-allin')).toBe(true);
    c.flags['seen:gamble-allin'] = 3;
    expect(eligibleEvents(eventContext(c)).some((e) => e.id === 'gamble-allin')).toBe(false);
  });

  test('an event without maxSeen can still be opened twice', () => {
    const c = fullCareer(7103, 50_000);
    expect(openEvent(c, 'mg-clutch')).toBe(true);
    c.pendingEvent = null;
    expect(openEvent(c, 'mg-clutch')).toBe(true);
  });

  test('an unknown event id does not open anything', () => {
    const c = fullCareer(7104, 50_000);
    expect(openEvent(c, 'evento-que-no-existe')).toBe(false);
    expect(c.pendingEvent).toBeNull();
  });
});
