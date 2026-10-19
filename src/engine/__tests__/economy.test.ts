import * as api from '../api';
import { baseInput } from './autopilot';
import { cashOf, mindsetBoost } from '../mindset';
import { openEvent } from '../career';

describe('wallet and choices with consequences', () => {
  test('a new career starts with no money and the agency sets the commission', () => {
    const c = api.newCareer(baseInput({ route: 'international', origin: '', age: 18 }), 31);
    expect(cashOf(c)).toBe(0);
    expect(c.pendingEvent?.defId).toBe('predraft-agent');
    api.chooseOption(c, 0); // top agency
    expect(c.flags.agentCut).toBe(6);
    expect(cashOf(c)).toBe(0); // no upfront fee
  });

  test('the season pays the club salary minus the agent cut into the wallet', () => {
    const c = api.newCareer(baseInput({ route: 'international', origin: '', age: 18 }), 32);
    api.chooseOption(c, 2); // represent yourself: 0 % commission
    api.dismissEvent(c);
    const club = c.predraft!.clubChoices![0];
    api.chooseStartingClub(c, club.name);
    const expected = c.flags.youthSalary ?? 0;
    for (let g = 0; g < 50 && c.predraft?.step === 'season'; g++) { api.runUntilDecision(c); if (c.pendingEvent) { c.pendingEvent = null; } }
    expect(cashOf(c)).toBe(expected);
    expect(c.lastSummary?.money?.cash).toBe(expected);
  });

  test('an option the player cannot pay for cannot be chosen', () => {
    const c = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 33);
    c.pendingEvent = null;
    openEvent(c, 'predraft-agent');
    c.pendingEvent!.options[0].cost = 1_000_000;
    api.chooseOption(c, 0);
    expect(c.pendingEvent!.resolved).toBeUndefined();
    api.chooseOption(c, 1);
    expect(c.pendingEvent!.resolved).toBeDefined();
  });

  test('morale, chemistry and pressure move on-court performance', () => {
    const c = api.newCareer(baseInput(), 34);
    Object.assign(c, { morale: 90, chemistry: 85, pressure: 15 });
    const high = mindsetBoost(c);
    Object.assign(c, { morale: 15, chemistry: 20, pressure: 90 });
    const low = mindsetBoost(c);
    expect(high).toBeGreaterThan(0.05);
    expect(low).toBeLessThan(-0.09);
  });
});
