import * as api from '../api';
import { baseInput } from './autopilot';
import { openEvent, userOf } from '../career';
import type { Career } from '../types';

function inSeasonCareer(): Career {
  const c = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 4321);
  api.acceptOffer(c, c.offers[0].id);
  api.startRegularSeason(c);
  c.pendingEvent = null;
  return c;
}

describe('shooting minigames', () => {
  test('spec scales with shooting skill and pressure', () => {
    const c = inSeasonCareer();
    const u = userOf(c);
    openEvent(c, 'mg-drill');
    const relaxed = c.pendingEvent!.minigame!;
    c.pendingEvent = null;
    openEvent(c, 'mg-clutch');
    const clutch = c.pendingEvent!.minigame!;
    expect(relaxed.zone).toBeGreaterThan(clutch.zone);
    expect(clutch.speed).toBeGreaterThan(relaxed.speed);
    c.pendingEvent = null;
    u.attrs.three = 99;
    u.attrs.mid = 99;
    openEvent(c, 'mg-drill');
    expect(c.pendingEvent!.minigame!.zone).toBeGreaterThan(relaxed.zone);
  });

  test('a played clutch shot applies the matching outcome', () => {
    const c = inSeasonCareer();
    const fame = c.fame;
    openEvent(c, 'mg-clutch');
    api.playMinigame(c, 1);
    expect(c.pendingEvent!.resolved!.made).toBe(1);
    expect(c.pendingEvent!.resolved!.result).toMatch(/^1\/1/);
    expect(c.fame).toBeGreaterThan(fame);
    expect(c.flags.clutch).toBe(1);
  });

  test('simulating resolves it from attributes; a missed contest gives no trophy', () => {
    const c = inSeasonCareer();
    openEvent(c, 'mg-threes');
    api.chooseOption(c, 0);
    const r = c.pendingEvent!.resolved!;
    expect(r.made).toBeGreaterThanOrEqual(0);
    expect(r.made).toBeLessThanOrEqual(10);
    api.dismissEvent(c);
    openEvent(c, 'mg-threes');
    api.playMinigame(c, 2);
    expect(c.flags[`trophy:threeContest:${c.league.season}`]).toBeUndefined();
  });

  test('winning the three-point contest becomes a season award', () => {
    const c = inSeasonCareer();
    openEvent(c, 'mg-threes');
    api.playMinigame(c, 9);
    api.dismissEvent(c);
    api.runUntilDecision(c);
    while (c.pendingEvent || c.phase !== 'season-end') {
      if (c.pendingEvent) {
        api.chooseOption(c, 0);
        api.dismissEvent(c);
      }
      api.runUntilDecision(c);
    }
    const season = c.seasons.find((s) => s.comp === 'NBA')!;
    expect(season.awards).toContain('threeContest');
  }, 60000);
});
