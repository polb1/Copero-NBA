// Step 3.3: money events (asset purchases / expenses and bank loans) wired into the event engine.
// Covers the content gates, `matches`, `optionCost` via `instantiate` and `applyEffects`.
// The finance primitives themselves are covered by finance.test.ts.
import { EVENTS } from '../../content/events';
import * as api from '../api';
import { eventContext, userOf } from '../career';
import { applyEffects, instantiate, matches } from '../events';
import { assetCost, newFinance } from '../finance';
import { cashOf } from '../mindset';
import { rngFor } from '../rng';
import type { Career, Mode } from '../types';
import { baseInput } from './autopilot';

const ASSET_EVENTS = ['asset-mansion', 'asset-supercar', 'asset-jet', 'asset-entourage', 'asset-rentals'] as const;
const ALL_IDS = [...ASSET_EVENTS, 'bank-loan'] as const;

const MAIN_ASSET: Record<(typeof ASSET_EVENTS)[number], string> = {
  'asset-mansion': 'mansion',
  'asset-supercar': 'supercar',
  'asset-jet': 'jet',
  'asset-entourage': 'entourage',
  'asset-rentals': 'rentals',
};

function defOf(id: string) {
  const def = EVENTS.find((e) => e.id === id);
  if (!def) throw new Error(`missing event ${id}`);
  return def;
}

/** An adult career parked in the offseason with a controlled wallet (mode + cash are the only variables). */
function careerFor(mode: Mode, cash: number, seed: number): Career {
  const c = api.newCareer(baseInput({ mode, age: 30 }), seed);
  if (mode === 'full') c.finance ??= newFinance(); // full careers are born with the state
  c.cash = cash;
  c.fame = 50; // bank-loan's minFame never decides these assertions
  c.phase = 'offseason';
  return c;
}

describe('money asset and loan events', () => {
  test('the six ids exist as money events gated to full mode with coherent cash and asset flags', () => {
    for (const id of ALL_IDS) {
      const def = defOf(id);
      expect(def.category).toBe('money');
      expect(def.weight).toBeGreaterThanOrEqual(4);
      expect(def.weight).toBeLessThanOrEqual(6);
      expect(def.cooldown).toBeGreaterThanOrEqual(500);
      expect(def.cooldown).toBeLessThanOrEqual(900);
      expect(def.when.modes).toContain('full');
      expect(def.when.financeOnly).toBe(true);
      expect(def.when.phases).toEqual(expect.arrayContaining(['offseason', 'preseason']));
      expect(def.options.length).toBeGreaterThanOrEqual(3);
    }
    // Asset events: no repeats while the main asset is owned; cash gate matches the spec.
    for (const id of ASSET_EVENTS) {
      const def = defOf(id);
      const main = MAIN_ASSET[id];
      expect(def.when.notFlags).toContain(`asset:${main}`);
      expect(def.when.minCash).toBeUndefined();
      expect(def.options.some((o) => o.effects?.buyAsset === main)).toBe(true);
    }
    // The loan also fires during the regular season and is repeatable (no asset flag).
    expect(defOf('bank-loan').when.phases).toContain('regular');
    expect(defOf('bank-loan').when.minCash).toBeUndefined();
    expect(defOf('bank-loan').when.notFlags).toBeUndefined();
    // The six finance events plus the all-in gamble are the only full-mode-money events.
    const FINANCE_IDS = [...ALL_IDS, 'gamble-allin'];
    expect(EVENTS.filter((e) => e.when.modes).map((e) => e.id).sort()).toEqual([...FINANCE_IDS].sort());
    expect(EVENTS.filter((e) => e.when.financeOnly).map((e) => e.id).sort()).toEqual([...ALL_IDS].sort());
    expect(defOf('gamble-allin').when.modes).toContain('quick');
    expect(defOf('gamble-allin').when.minCash).toBe(30_000);
  });

  test('matches: legacy full saves without finance skip the six, quick careers never qualify', () => {
    const full = careerFor('full', 10_000_000, 6107);
    expect(full.finance).toBeDefined();
    for (const id of ALL_IDS) {
      expect(matches(defOf(id).when, eventContext(full))).toBe(true);
    }

    const legacy = careerFor('full', 10_000_000, 6107);
    delete legacy.finance; // a full save from before the economy state existed
    for (const id of ALL_IDS) {
      expect(matches(defOf(id).when, eventContext(legacy))).toBe(false);
    }

    const quick = careerFor('quick', 10_000_000, 6107);
    for (const id of ALL_IDS) {
      expect(matches(defOf(id).when, eventContext(quick))).toBe(false);
    }
  });

  test('matches: quick careers never qualify, full careers need the cash', () => {
    const quick = careerFor('quick', 1_000_000, 6101);
    const full = careerFor('full', 1_000_000, 6102);
    const broke = careerFor('full', 0, 6103);
    for (const id of ALL_IDS) {
      expect(matches(defOf(id).when, eventContext(quick))).toBe(false);
    }
    expect(matches(defOf('asset-mansion').when, eventContext(full))).toBe(true);
    expect(matches(defOf('asset-mansion').when, eventContext(broke))).toBe(true);
  });

  test('instantiate prices every option and allows a 20% mortgage down payment', () => {
    const c = careerFor('full', 1_000_000, 6104);
    const ev = instantiate(defOf('asset-mansion'), eventContext(c), rngFor(c.seed, 'test-inst'));
    expect(ev.options[0].cost).toBe(assetCost('mansion', c.league.season));
    expect(ev.options[1].cost).toBe(assetCost('apartment', c.league.season));
    expect(ev.options[2].cost).toBeUndefined();
    expect(ev.options[0].finance).toBe(true);
    expect(ev.options[2].finance).toBeUndefined();

    c.pendingEvent = ev;
    expect(api.canAfford(c, 0)).toBe(true); // 1M covers the 20% down payment
    expect(api.canAfford(c, 1)).toBe(true); // apartment fits outright

    const poor = careerFor('full', 800_000, 6105);
    poor.pendingEvent = instantiate(defOf('asset-mansion'), eventContext(poor), rngFor(poor.seed, 'test-inst'));
    expect(api.canAfford(poor, 0)).toBe(false); // below the 900K down payment
  });

  test('applyEffects buys the asset, spends the cash and reports the purchase', () => {
    const c = careerFor('full', 10_000_000, 6105);
    c.morale = 50;
    const summary = applyEffects(c, userOf(c), { buyAsset: 'mansion', morale: 5 }, rngFor(c.seed, 'test-buy'));
    expect(c.flags['asset:mansion']).toBe(1);
    expect(c.finance!.assets).toHaveLength(1);
    expect(cashOf(c)).toBe(10_000_000 - assetCost('mansion', c.league.season));
    expect(c.morale).toBe(55);
    expect(summary.some((s) => s.includes('Compras'))).toBe(true);
    expect(summary.some((s) => s.includes('Moral'))).toBe(true);
  });

  test('applyEffects borrows: cash and debt rise together, the summary says so', () => {
    const c = careerFor('full', 0, 6106);
    c.reputation = 50;
    c.fame = 30;
    const summary = applyEffects(c, userOf(c), { borrow: 500_000 }, rngFor(c.seed, 'test-loan'));
    expect(cashOf(c)).toBe(500_000);
    expect(c.finance!.debt).toBe(500_000);
    expect(summary.some((s) => s.includes('Préstamo'))).toBe(true);
    expect(summary.some((s) => s.includes('Deuda'))).toBe(true);
  });
});

describe('all-in gamble', () => {
  test('doubles the whole wallet or loses it and forces bankruptcy', () => {
    const win = careerFor('full', 1_000_000, 7001);
    const winSummary = applyEffects(win, userOf(win), { allIn: 'double' }, rngFor(win.seed, 'allin-win'));
    expect(cashOf(win)).toBe(2_000_000);
    expect(winSummary.some((s) => s.includes('Apuestas todo'))).toBe(true);

    const lose = careerFor('full', 1_000_000, 7002);
    lose.finance!.assets.push({ id: 'mansion', bought: 2026, value: 4_500_000 });
    lose.finance!.debt = 250_000;
    applyEffects(lose, userOf(lose), { allIn: 'lose', bankrupt: true }, rngFor(lose.seed, 'allin-lose'));
    expect(cashOf(lose)).toBe(0);
    expect(lose.finance!.assets).toEqual([]);
    expect(lose.finance!.debt).toBe(0);
    expect(lose.finance!.bankruptcies).toBe(1);
    expect(lose.finance!.ruined).toBe(true);
  });
});
