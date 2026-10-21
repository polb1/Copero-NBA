import { newCareer } from '../api';
import type { NewCareerInput } from '../api';
import { baseInput } from './autopilot';
import type { Career } from '../types';
import { assetIncome, assetCost, assetUpkeep, annualAssetIncome, annualUpkeep, borrow, buyAsset, creditLimit, financeOf, financeOn, lifestyleCost, netWorth, newFinance, openCrisisEvent, resolveCrisis, sellAsset, settleSeason } from '../finance';
import { cashOf } from '../mindset';

/** A full-mode career: the finance state comes with the career (reset here so the helper controls it). */
function fullCareer(seed: number, cash = 0, over: Partial<NewCareerInput> = {}): Career {
  const c = newCareer(baseInput({ mode: 'full', ...over }), seed);
  c.finance = newFinance();
  c.cash = cash;
  return c;
}

describe('finance gate and state', () => {
  test('the economy only runs on full careers that carry a finance state', () => {
    const quick = newCareer(baseInput({ mode: 'quick' }), 7001);
    expect(financeOn(quick)).toBe(false);
    quick.finance = newFinance();
    expect(financeOn(quick)).toBe(false);
    expect(buyAsset(quick, 'mansion', 2026)).toEqual(['La economía solo está activa en el modo Larga.']);
    expect(cashOf(quick)).toBe(0);

    const full = newCareer(baseInput({ mode: 'full' }), 7002);
    expect(financeOn(full)).toBe(true); // phase 3: full careers are born with the state
    full.finance = newFinance();
    expect(financeOn(full)).toBe(true);
  });

  test('financeOf hands out a default state without mutating the career', () => {
    const c = newCareer(baseInput({ mode: 'quick' }), 7003);
    const f = financeOf(c);
    expect(f).toEqual({ assets: [], debt: 0, credit: 70, bankruptcies: 0, ruined: false, ruinCooldown: 0 });
    expect(c.finance).toBeUndefined(); // only full mode carries state
    const again = financeOf(c);
    expect(again).toEqual(f);
    expect(again).not.toBe(f);
  });
});

describe('assets', () => {
  test('buying moves cash into the portfolio and flags the asset', () => {
    const c = fullCareer(7004, 10_000_000);
    const msgs = buyAsset(c, 'mansion', 2026);
    expect(msgs).toHaveLength(2);
    expect(c.finance!.assets).toEqual([{ id: 'mansion', bought: 2026, value: assetCost('mansion', 2026) }]);
    expect(c.flags['asset:mansion']).toBe(1);
    expect(cashOf(c)).toBe(10_000_000 - assetCost('mansion', 2026)); // 5.5M at base season
    expect(cashOf(c)).toBe(5_500_000);
    expect(annualUpkeep(c, 2026)).toBe(180_000);

    const second = buyAsset(c, 'mansion', 2026);
    expect(second).toEqual(['Ya disfrutas de ese activo.']);
    expect(c.finance!.assets).toHaveLength(1);
    expect(cashOf(c)).toBe(5_500_000);
  });

  test('a career without cash cannot buy', () => {
    const c = fullCareer(7005, 1_000);
    expect(buyAsset(c, 'apartment', 2026)).toEqual(['No tienes efectivo suficiente.']);
    expect(c.finance!.assets).toHaveLength(0);
    expect(cashOf(c)).toBe(1_000);
  });

  test('upkeep and asset income stack across the portfolio and grow with the cap', () => {
    const c = fullCareer(7006, 20_000_000);
    buyAsset(c, 'mansion', 2026);
    buyAsset(c, 'rentals', 2026);
    expect(cashOf(c)).toBe(13_700_000);
    expect(annualUpkeep(c, 2026)).toBe(180_000 + 40_000);
    expect(annualAssetIncome(c, 2026)).toBe(160_000);
    expect(assetUpkeep('rentals', 2026)).toBe(40_000);
    expect(assetIncome('mansion', 2026)).toBe(0);
    expect(annualUpkeep(c, 2030)).toBeGreaterThan(annualUpkeep(c, 2026));
    // Bought at cost: net worth is the starting wallet.
    expect(netWorth(c)).toBe(20_000_000);
  });

  test('selling returns 85% of the value and costs morale, reputation and credit', () => {
    const c = fullCareer(7007, 10_000_000);
    buyAsset(c, 'mansion', 2026);
    const value = c.finance!.assets[0].value;
    c.morale = 60;
    c.reputation = 40;
    c.finance!.credit = 70;
    const before = cashOf(c);
    const msgs = sellAsset(c, 'mansion', 2026);
    expect(cashOf(c) - before).toBe(Math.round(value * 0.85));
    expect(c.finance!.assets).toHaveLength(0);
    expect(c.flags['asset:mansion']).toBeUndefined();
    expect(c.morale).toBe(52);
    expect(c.reputation).toBe(38);
    expect(c.finance!.credit).toBe(66);
    expect(msgs).toHaveLength(3);
    expect(sellAsset(c, 'mansion', 2026)).toEqual([]);
  });

  test('selling in a quick career is a no-op that keeps assets and cash untouched', () => {
    const quick = newCareer(baseInput({ mode: 'quick' }), 7018);
    quick.finance = newFinance();
    quick.finance.assets.push({ id: 'mansion', bought: 2026, value: 5_500_000 });
    quick.flags['asset:mansion'] = 1;
    quick.cash = 100_000;
    expect(sellAsset(quick, 'mansion', 2026)).toEqual(['La economía solo está activa en el modo Larga.']);
    expect(quick.finance.assets).toHaveLength(1);
    expect(quick.cash).toBe(100_000);
    expect(quick.flags['asset:mansion']).toBe(1);
  });
});

describe('lifestyle and credit', () => {
  test('lifestyle follows fame and the credit limit follows reputation', () => {
    const c = fullCareer(7008);
    c.fame = 10;
    c.reputation = 10;
    const cheap = lifestyleCost(c, 2026);
    expect(lifestyleCost(c, 2026, false)).toBe(0);
    c.fame = 80;
    expect(lifestyleCost(c, 2026)).toBeGreaterThan(cheap);
    c.fame = 10;
    const lowRep = creditLimit(c, 2026);
    c.reputation = 90;
    expect(creditLimit(c, 2026)).toBeGreaterThan(lowRep);
    expect(creditLimit(c, 2026) % 10_000).toBe(0);
  });

  test('borrowing is capped by the credit limit and denied once the credit is gone', () => {
    const c = fullCareer(7009);
    c.reputation = 50;
    c.fame = 30;
    const limit = creditLimit(c, 2026);
    expect(limit).toBeGreaterThan(10_000);
    const msgs = borrow(c, limit * 2, 2026);
    expect(cashOf(c)).toBe(limit);
    expect(c.finance!.debt).toBe(limit);
    expect(c.finance!.credit).toBe(58);
    expect(msgs).toContain('El banco no cubre todo lo que necesitas.');

    c.finance!.credit = 0;
    const denied = borrow(c, 100_000, 2026);
    expect(denied).toEqual(['El banco no te concede más crédito.']);
    expect(cashOf(c)).toBe(limit);
    expect(c.finance!.debt).toBe(limit);
  });
});

describe('season settlement', () => {
  test('legacy settlement pays the wallet and leaves the finance state alone', () => {
    const c = newCareer(baseInput({ mode: 'quick' }), 7010);
    c.cash = 1_000_000;
    c.finance = newFinance();
    c.flags.overseasSalary = 500_000;
    const before = JSON.parse(JSON.stringify(c.finance));
    const res = settleSeason(c, { salary: 2_000_000, overseas: 500_000, sponsor: 300_000, agent: 250_000, season: 2026 });
    const gross = 2_000_000 + 500_000 + 300_000;
    expect(cashOf(c)).toBe(1_000_000 + gross - 250_000);
    expect(c.earnings).toBe(gross);
    expect(res.gap).toBe(0);
    expect(res.money).toEqual({ salary: 2_500_000, sponsor: 300_000, agent: 250_000, cash: 3_550_000 });
    expect(c.finance).toEqual(before);
    expect(c.flags.overseasSalary).toBeUndefined();
  });

  test('full settlement nets salary plus asset income against lifestyle and upkeep', () => {
    // route 'drafted' skips predraft: the career is professional, so lifestyle applies.
    const c = fullCareer(7011, 10_000_000, { route: 'drafted' });
    c.fame = 40;
    c.reputation = 30;
    buyAsset(c, 'mansion', 2026);
    buyAsset(c, 'rentals', 2026);
    const before = cashOf(c);
    const lifestyle = lifestyleCost(c, 2026);
    expect(lifestyle).toBeGreaterThan(0);
    const upkeep = annualUpkeep(c, 2026);
    const assetInc = annualAssetIncome(c, 2026);
    const res = settleSeason(c, { salary: 5_000_000, overseas: 0, sponsor: 400_000, agent: 500_000, season: 2026 });
    const expected = before + 5_000_000 + 400_000 - 500_000 + assetInc - lifestyle - upkeep;
    expect(cashOf(c)).toBe(expected);
    expect(c.earnings).toBe(5_400_000 + assetInc);
    expect(c.finance!.debt).toBe(0);
    expect(res.gap).toBe(0);
    expect(res.money).toMatchObject({
      salary: 5_000_000, sponsor: 400_000, agent: 500_000, cash: expected,
      lifestyle, upkeep, assetIncome: assetInc, interest: 0, payment: 0,
      debt: 0, assets: 2, netWorth: netWorth(c), sold: [],
    });
    expect(c.flags.overseasSalary).toBeUndefined();
    // Portfolio is revalued 3% at the end of the season.
    expect(c.finance!.assets.every((a) => a.value === Math.round(assetCost(a.id, 2026) * 1.03))).toBe(true);
  });

  test('a red season sells the most valuable asset until the books balance', () => {
    const c = fullCareer(7012, 5_000_000);
    buyAsset(c, 'mansion', 2026); // cash 500k
    c.cash = 100_000; // upkeep (180k) now outweighs the wallet
    const res = settleSeason(c, { salary: 0, overseas: 0, sponsor: 0, agent: 0, season: 2026 });
    expect(res.gap).toBe(0);
    expect(res.money.sold).toEqual(['mansion']);
    expect(res.money.assets).toBe(0);
    expect(c.finance!.assets).toHaveLength(0);
    expect(c.flags['asset:mansion']).toBeUndefined();
    expect(cashOf(c)).toBe(-80_000 + Math.round(4_500_000 * 0.85));
    expect(res.money.cash).toBe(cashOf(c));
    expect(res.money.netWorth).toBe(cashOf(c));
  });
});

describe('financial crisis', () => {
  test('no gap means no crisis', () => {
    const c = fullCareer(7013);
    expect(openCrisisEvent(c, 0)).toBe(false);
    expect(c.pendingEvent).toBeNull();
  });

  test('the crisis offers a loan that clears the gap', () => {
    const c = fullCareer(7014);
    c.reputation = 40;
    c.cash = -200_000;
    expect(openCrisisEvent(c, 200_000)).toBe(true);
    const ev = c.pendingEvent!;
    expect(ev.defId).toBe('dyn:crisis');
    expect(ev.category).toBe('money');
    expect(ev.options.some((o) => o.action === 'sell')).toBe(false); // no assets
    expect(ev.options.some((o) => o.action === 'bankrupt')).toBe(true);
    const loanIdx = ev.options.findIndex((o) => o.action === 'loan');
    expect(loanIdx).toBeGreaterThanOrEqual(0);
    expect(ev.options[loanIdx].amount).toBe(200_000);

    resolveCrisis(c, loanIdx);
    expect(cashOf(c)).toBe(0);
    expect(c.finance!.debt).toBe(200_000);
    expect(c.finance!.credit).toBe(58);
    expect(c.pendingEvent?.resolved?.option).toBe(loanIdx);
    expect(c.decisions).toHaveLength(1);
    expect(c.decisions[0].title).toBe('Asfixia financiera');
  });

  test('with no credit left the only way out is bankruptcy', () => {
    const c = fullCareer(7015);
    c.finance!.credit = 0;
    c.cash = -5_000_000;
    expect(openCrisisEvent(c, 5_000_000)).toBe(true);
    const ev = c.pendingEvent!;
    expect(ev.options).toHaveLength(1);
    expect(ev.options[0].action).toBe('bankrupt');

    resolveCrisis(c, 0);
    expect(cashOf(c)).toBe(0);
    expect(c.finance!.debt).toBe(0);
    expect(c.finance!.bankruptcies).toBe(1);
    expect(c.finance!.ruined).toBe(true);
    expect(c.finance!.credit).toBe(25);
    expect(ev.resolved?.option).toBe(0);
    expect(ev.resolved?.effectsSummary[0]).toContain('Bancarrota');
    expect(c.pendingEvent?.resolved).toBe(ev.resolved);
  });

  test('a gap that is not a multiple of 10K borrows the rounded-up amount and clears the hole', () => {
    const c = fullCareer(7017);
    c.cash = -15_000;
    expect(openCrisisEvent(c, 15_000)).toBe(true);
    const ev = c.pendingEvent!;
    const loanIdx = ev.options.findIndex((o) => o.action === 'loan');
    expect(loanIdx).toBeGreaterThanOrEqual(0);
    expect(ev.options[loanIdx].amount).toBe(20_000); // rounded up to the next 10K

    resolveCrisis(c, loanIdx);
    expect(cashOf(c)).toBeGreaterThanOrEqual(0);
    expect(c.pendingEvent?.resolved?.option).toBe(loanIdx); // no fresh crisis was reopened
    expect(c.decisions).toHaveLength(1);
  });

  test('selling out of the hole still in the red opens the next crisis', () => {
    const c = fullCareer(7016, 10_000_000);
    buyAsset(c, 'mansion', 2026);
    c.cash = -4_000_000; // the resale (3.825M) does not cover the gap
    expect(openCrisisEvent(c, 4_000_000)).toBe(true);
    const first = c.pendingEvent!;
    const sellIdx = first.options.findIndex((o) => o.action === 'sell');
    expect(sellIdx).toBeGreaterThanOrEqual(0);
    expect(first.options.some((o) => o.action === 'loan')).toBe(false); // limit 950k < gap

    resolveCrisis(c, sellIdx);
    expect(first.resolved).toBeUndefined();
    expect(c.pendingEvent).not.toBe(first);
    expect(c.pendingEvent?.defId).toBe('dyn:crisis');
    expect(c.finance!.assets).toHaveLength(0);
    expect(cashOf(c)).toBe(-175_000);
    expect(c.decisions).toHaveLength(1);
    expect(c.decisions[0].choice).toBe(first.options[sellIdx].label);
  });
});
