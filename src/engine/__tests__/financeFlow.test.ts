import * as api from '../api';
import type { Career } from '../types';
import { baseInput } from './autopilot';
import { financeOn, newFinance, openCrisisEvent } from '../finance';

/** Drives a career to the end-of-season report, resolving every event on the way. */
function playToSeasonEnd(c: Career, max = 200) {
  for (let i = 0; i < max && !c.lastSummary; i++) {
    if (c.pendingEvent) {
      if (c.pendingEvent.resolved) api.dismissEvent(c);
      else api.chooseOption(c, [...Array(c.pendingEvent.options.length).keys()].find((k) => api.canAfford(c, k)) ?? 0);
      continue;
    }
    if (c.phase === 'season-end' || c.phase === 'offseason' || c.phase === 'retired') break;
    const before = `${c.phase}|${c.league.season}|${c.league.day}`;
    api.runUntilDecision(c);
    if (`${c.phase}|${c.league.season}|${c.league.day}` === before && !c.pendingEvent) break; // stalled
  }
}

describe('finance integration in the career flow', () => {
  test('only full careers are created with a finance state', () => {
    const full = api.newCareer(baseInput({ route: 'drafted', mode: 'full' }), 7001);
    expect(full.finance).toBeDefined();
    expect(financeOn(full)).toBe(true);

    const quick = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 7002);
    expect(quick.finance).toBeUndefined();
    expect(financeOn(quick)).toBe(false);

    const express = api.newCareer(baseInput({ route: 'drafted', mode: 'express' }), 7003);
    expect(express.finance).toBeUndefined();
    expect(financeOn(express)).toBe(false);
  });

  test('a drafted full career signs its first offer with no settlement yet', () => {
    const c = api.newCareer(baseInput({ route: 'drafted', mode: 'full' }), 77);
    expect(c.finance).toBeDefined();
    expect(c.offers.length).toBeGreaterThan(0);
    api.acceptOffer(c, c.offers[0].id);
    expect(c.lastSummary).toBeNull();
  });

  test('the api resolves the financial crisis through chooseOption', () => {
    const c = api.newCareer(baseInput({ route: 'drafted', mode: 'full' }), 78);
    c.cash = -500_000;
    c.finance = newFinance();
    expect(openCrisisEvent(c, 500_000)).toBe(true);
    expect(c.pendingEvent?.defId).toBe('dyn:crisis');
    const idx = c.pendingEvent!.options.findIndex((o) => o.action === 'loan');
    expect(idx).toBeGreaterThanOrEqual(0);

    api.chooseOption(c, idx);
    expect(c.pendingEvent?.resolved).toBeTruthy();
    expect(c.cash).toBe(0);
    expect(c.finance!.debt).toBeGreaterThan(0);
  });

  test('endSeason settles through settleSeason on a full career', () => {
    const c = api.newCareer(baseInput({ route: 'drafted', mode: 'full' }), 79);
    api.acceptOffer(c, c.offers[0].id);
    api.startRegularSeason(c);
    playToSeasonEnd(c);

    expect(c.lastSummary).not.toBeNull();
    expect(c.phase).toBe('season-end');
    const m = c.lastSummary!.money;
    expect(m).toBeDefined();
    // Full-mode settlements carry the finance breakdown, not just salary/sponsor/agent/cash.
    expect(m!.lifestyle).toBeDefined();
    expect(m!.upkeep).toBeDefined();
    expect(c.lastSummary!.lines.some((l) => l.label === 'Finanzas')).toBe(true);
  }, 120000);
});
