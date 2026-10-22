import { assetById } from '../content/assets';
import { scaled } from './config';
import { fmtMoney } from './contracts';
import { cashOf } from './mindset';
import { clamp } from './rng';
import type { ActiveEvent, Career, FinanceState, OwnedAsset, SeasonSummary } from './types';

export const FINANCE_DEFAULT_CREDIT = 70;
export const ASSET_RESALE = 0.85;
export const DEBT_INTEREST = 0.08;
export const DEBT_PAYMENT = 0.15;

/** The economy only runs on full ("Larga") careers that were saved with a finance state. */
export const financeOn = (c: Career) => c.mode === 'full' && !!c.finance;

export function newFinance(): FinanceState {
  return { assets: [], debt: 0, credit: FINANCE_DEFAULT_CREDIT, bankruptcies: 0, ruined: false, ruinCooldown: 0 };
}

/** Never mutates the career: a missing state comes back as a fresh default. */
export function financeOf(c: Career): FinanceState {
  return c.finance ?? newFinance();
}

// --- assets -----------------------------------------------------------------
export const assetCost = (id: string, season: number) => scaled(assetById(id)?.cost ?? 0, season);
export const assetUpkeep = (id: string, season: number) => scaled(assetById(id)?.upkeep ?? 0, season);
export const assetIncome = (id: string, season: number) => scaled(assetById(id)?.income ?? 0, season);
export const assetResale = (a: OwnedAsset) => Math.round(a.value * ASSET_RESALE);

export function annualUpkeep(c: Career, season: number) {
  return financeOf(c).assets.reduce((sum, a) => sum + assetUpkeep(a.id, season), 0);
}

export function annualAssetIncome(c: Career, season: number) {
  return financeOf(c).assets.reduce((sum, a) => sum + assetIncome(a.id, season), 0);
}

/** Base lifestyle burn: grows with fame. Off-season / non-professional years cost nothing. */
export function lifestyleCost(c: Career, season: number, professional = true) {
  if (!professional) return 0;
  const base = 30_000 + c.fame * 2_500;
  return Math.round(scaled(base, season) / 10_000) * 10_000;
}

/** How much the bank lends right now: reputation and stardom raise it, credit gates it. */
export function creditLimit(c: Career, season: number) {
  const base = 500_000 + c.reputation * 30_000 + Math.max(0, c.fame - 20) * 20_000;
  const limit = (scaled(base, season) * clamp(financeOf(c).credit, 0, 100)) / FINANCE_DEFAULT_CREDIT;
  return Math.round(limit / 10_000) * 10_000;
}

export function netWorth(c: Career) {
  const f = financeOf(c);
  return cashOf(c) + f.assets.reduce((sum, a) => sum + a.value, 0) - f.debt;
}

export function buyAsset(c: Career, id: string, season: number): string[] {
  if (!financeOn(c)) return ['La economía solo está activa en el modo Larga.'];
  if (c.flags['asset:' + id]) return ['Ya disfrutas de ese activo.'];
  const def = assetById(id);
  if (!def) return [];
  const cost = assetCost(id, season);
  const cash = cashOf(c);
  const loan = Math.max(0, cost - cash);
  if (loan > Math.round(cost * 0.8)) return ['No tienes efectivo suficiente.'];
  const f = financeOf(c);
  c.cash = Math.max(0, cash - cost);
  if (loan > 0) f.debt += loan;
  f.assets.push({ id, bought: season, value: cost });
  c.flags['asset:' + id] = 1;
  const out = [`Compras ${def.label} (−${fmtMoney(Math.min(cash, cost))})`, `Mantenimiento ${fmtMoney(assetUpkeep(id, season))}/año`];
  if (loan > 0) out.push(`Hipoteca ${fmtMoney(loan)} (deuda ${fmtMoney(f.debt)})`);
  return out;
}

export function sellAsset(c: Career, id: string, season: number): string[] {
  if (!financeOn(c)) return ['La economía solo está activa en el modo Larga.'];
  const f = financeOf(c);
  const idx = f.assets.findIndex((a) => a.id === id);
  if (idx < 0) return [];
  const def = assetById(id);
  const amount = assetResale(f.assets[idx]);
  c.cash = cashOf(c) + amount;
  f.assets.splice(idx, 1);
  delete c.flags['asset:' + id];
  f.credit = clamp(f.credit - 4, 0, 100);
  c.morale = clamp(c.morale - 8, 0, 100);
  c.reputation = clamp(c.reputation - 2, 0, 100);
  return [`Vendes ${def?.label ?? id} (+${fmtMoney(amount)})`, 'Moral −8', 'Reputación −2'];
}

export function borrow(c: Career, amount: number, season: number): string[] {
  if (!financeOn(c)) return ['La economía solo está activa en el modo Larga.'];
  const limit = creditLimit(c, season);
  if (limit < 10_000) return ['El banco no te concede más crédito.'];
  const got = Math.max(0, Math.round(Math.min(amount, limit) / 10_000) * 10_000);
  if (got < 10_000) return ['El banco no te concede más crédito.'];
  const f = financeOf(c);
  c.cash = cashOf(c) + got;
  f.debt += got;
  f.credit = clamp(f.credit - 12, 0, 100);
  const out = [`Préstamo +${fmtMoney(got)}`, `Deuda ${fmtMoney(f.debt)}`];
  if (got < amount) out.push('El banco no cubre todo lo que necesitas.');
  return out;
}

export function declareBankruptcy(c: Career, season: number): string[] {
  if (!financeOn(c)) return ['La economía solo está activa en el modo Larga.'];
  const f = financeOf(c);
  const lost = f.assets.length;
  f.assets = [];
  f.debt = 0;
  f.credit = 25;
  f.bankruptcies += 1;
  f.ruined = true;
  f.ruinCooldown = 2;
  c.flags.ruined = 1;
  c.flags.ruinedSeason = season;
  c.cash = 0;
  c.morale = clamp(c.morale - 25, 0, 100);
  c.reputation = clamp(c.reputation - 12, 0, 100);
  c.fame = clamp(c.fame - 5, 0, 100);
  c.trust = clamp(c.trust - 10, 0, 100);
  for (const key of Object.keys(c.flags)) if (key.startsWith('asset:')) delete c.flags[key];
  return [`Bancarrota: pierdes ${lost} activo(s)`, 'Moral −25', 'Reputación −12', 'Popularidad −5', 'Confianza −10'];
}

// --- season settlement ------------------------------------------------------
export interface SeasonIncome { salary: number; overseas: number; sponsor: number; agent: number; season: number; }
export interface SeasonSettlement { money: NonNullable<SeasonSummary['money']>; gap: number; }

export function settleSeason(c: Career, inp: SeasonIncome): SeasonSettlement {
  const gross = inp.salary + inp.overseas + inp.sponsor;
  // Legacy careers (any mode without a finance state): pay into the wallet, no expenses.
  if (!financeOn(c)) {
    c.earnings += gross;
    c.cash = cashOf(c) + gross - inp.agent;
    delete c.flags.overseasSalary;
    return { money: { salary: inp.salary + inp.overseas, sponsor: inp.sponsor, agent: inp.agent, cash: c.cash }, gap: 0 };
  }
  const f = financeOf(c);
  const professional = inp.salary + inp.overseas > 0 && !(c.predraft?.step === 'season');
  const lifestyle = professional ? lifestyleCost(c, inp.season) : 0;
  const upkeep = annualUpkeep(c, inp.season);
  const assetIncome = annualAssetIncome(c, inp.season);
  const interest = Math.round((f.debt * DEBT_INTEREST) / 1000) * 1000;
  const payment = Math.min(f.debt, Math.round((f.debt * DEBT_PAYMENT) / 1000) * 1000);
  let cash = cashOf(c) + gross - inp.agent + assetIncome - lifestyle - upkeep - interest - payment;
  f.debt = Math.max(0, f.debt - payment);
  c.cash = cash;
  // In the red: sell assets, most valuable first, until the books balance.
  const sold: string[] = [];
  if (cash < 0) {
    const ids = [...f.assets].sort((a, b) => b.value - a.value).map((a) => a.id);
    for (const id of ids) {
      sellAsset(c, id, inp.season);
      sold.push(id);
      cash = cashOf(c);
      if (cash >= 0) break;
    }
  }
  if (cash >= 0) f.credit = clamp(f.credit + 4, 0, 100);
  else f.credit = clamp(f.credit - 10, 0, 100);
  for (const a of f.assets) a.value = Math.round(a.value * 1.03);
  f.ruinCooldown = Math.max(0, f.ruinCooldown - 1);
  c.cash = cash;
  c.earnings += gross + assetIncome;
  delete c.flags.overseasSalary;
  const money: NonNullable<SeasonSummary['money']> = {
    salary: inp.salary + inp.overseas,
    sponsor: inp.sponsor,
    agent: inp.agent,
    cash,
    lifestyle,
    upkeep,
    assetIncome,
    interest,
    payment,
    debt: f.debt,
    assets: f.assets.length,
    netWorth: netWorth(c),
    sold,
  };
  return { money, gap: Math.max(0, -cash) };
}

// --- financial crisis -------------------------------------------------------
export function openCrisisEvent(c: Career, gap: number): boolean {
  if (gap <= 0) return false;
  const f = financeOf(c);
  const options: ActiveEvent['options'] = [];
  if (f.assets.length) {
    const top = [...f.assets].sort((a, b) => b.value - a.value)[0];
    const def = assetById(top.id);
    if (def) options.push({ label: 'Vender ' + def.label, desc: 'Recuperas ' + fmtMoney(assetResale(top)) + ' y evitas parte de la deuda.', action: 'sell', assetId: top.id });
  }
  if (gap <= creditLimit(c, c.league.season)) {
    options.push({ label: 'Pedir un préstamo de ' + fmtMoney(gap), desc: 'Tu crédito lo permite. Interés del 8% anual.', action: 'loan', amount: Math.ceil(gap / 10_000) * 10_000 });
  }
  options.push({ label: 'Declararte en bancarrota', desc: 'Pierdes los activos y la deuda, pero tu reputación y tu moral se hunden.', action: 'bankrupt' });
  c.pendingEvent = {
    defId: 'dyn:crisis',
    title: 'Asfixia financiera',
    text: 'Los gastos superan tus ingresos. Tienes que tomar una decisión antes de seguir.',
    category: 'money',
    options,
    vars: {},
  };
  return true;
}

/** Keeps the season summary in sync with the wallet after a crisis decision. */
export function syncFinanceSummary(c: Career) {
  if (!c.lastSummary?.money) return;
  const f = financeOf(c);
  c.lastSummary.money.cash = cashOf(c);
  c.lastSummary.money.debt = f.debt;
  c.lastSummary.money.assets = f.assets.length;
  c.lastSummary.money.netWorth = netWorth(c);
}

export function resolveCrisis(c: Career, index: number): void {
  const ev = c.pendingEvent;
  if (!ev || ev.defId !== 'dyn:crisis' || ev.resolved) return;
  const opt = ev.options[index];
  if (!opt) return;
  const season = c.league.season;
  let summary: string[] = [];
  if (opt.action === 'sell' && opt.assetId) {
    summary = sellAsset(c, opt.assetId, season);
    if (cashOf(c) < 0) {
      openCrisisEvent(c, -cashOf(c));
      c.decisions.push({ season, title: ev.title, choice: opt.label });
      return;
    }
  } else if (opt.action === 'loan') {
    summary = borrow(c, opt.amount ?? Math.max(0, -cashOf(c)), season);
    if (cashOf(c) < 0) {
      openCrisisEvent(c, -cashOf(c));
      c.decisions.push({ season, title: ev.title, choice: opt.label });
      return;
    }
  } else {
    summary = declareBankruptcy(c, season);
  }
  c.decisions.push({ season, title: ev.title, choice: opt.label });
  ev.resolved = { option: index, result: opt.label, effectsSummary: summary };
  syncFinanceSummary(c);
}
