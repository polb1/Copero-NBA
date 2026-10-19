import type { Career, Contract, League, Player, Team } from './types';
import { capFor, maxSalary, minSalary, RULES, scaled } from './config';
import { clamp } from './rng';

export function salaryIn(c: Contract | null, season: number): number {
  if (!c) return 0;
  const i = season - c.startSeason;
  return i >= 0 && i < c.salaries.length ? c.salaries[i] : 0;
}

export const contractEnd = (c: Contract) => c.startSeason + c.salaries.length - 1;
export const yearsLeft = (c: Contract | null, season: number) => (c ? contractEnd(c) - season + 1 : 0);

export function makeSalaries(first: number, years: number, raise = 0.05) {
  return Array.from({ length: years }, (_, i) => Math.round(first * Math.pow(1 + raise, i)));
}

/** First-year market value for a player, before team context. */
export function marketValue(p: Player, season: number, production = 0): number {
  const ageAdj = p.age <= 23 ? (p.pot - p.ovr) * 0.25 : p.age >= 31 ? -(p.age - 30) * 1.4 : 0;
  const eff = p.ovr + ageAdj + production;
  const base = 1_600_000 * Math.exp((eff - 60) * 0.14);
  return Math.round(clamp(scaled(base, season), minSalary(p.yearsPro, season), maxSalary(p.yearsPro, season)));
}

/** Keeps the highest market value of the career (shown on the final card). */
export function notePeakValue(c: Career, p: Player) {
  const v = marketValue(p, c.league.season);
  if (v > (c.flags.peakValue ?? 0)) c.flags.peakValue = v;
}

/** Production bonus from last season's game score average (keeps value tied to real stats). */
export function productionBonus(gmscAvg: number | undefined) {
  if (gmscAvg === undefined) return 0;
  return clamp((gmscAvg - 8) * 0.6, -4, 6);
}

export function payroll(league: League, teamId: string, season = league.season): number {
  const t = league.teams[teamId];
  let sum = 0;
  for (const pid of t.roster) {
    const p = league.players[pid];
    if (p?.contract && p.contract.kind !== 'two-way') sum += salaryIn(p.contract, season);
  }
  return sum;
}

export type CapTier = 'room' | 'under-tax' | 'tax' | 'apron1' | 'apron2';
export function capTier(league: League, teamId: string, season = league.season): CapTier {
  const pay = payroll(league, teamId, season);
  if (pay < capFor(season)) return 'room';
  if (pay < scaled(RULES.tax, season)) return 'under-tax';
  if (pay < scaled(RULES.apron1, season)) return 'tax';
  if (pay < scaled(RULES.apron2, season)) return 'apron1';
  return 'apron2';
}

export const CAP_TIER_LABEL: Record<CapTier, string> = {
  room: 'Con espacio salarial',
  'under-tax': 'Sobre el tope',
  tax: 'Pagando impuesto de lujo',
  apron1: 'Por encima del primer apron',
  apron2: 'Por encima del segundo apron',
};

/** Max first-year salary a team can offer a free agent (simplified exception model). */
export function offerCapacity(league: League, teamId: string, season = league.season): { amount: number; via: string } {
  const pay = payroll(league, teamId, season);
  const cap = capFor(season);
  const space = cap - pay;
  if (space > scaled(RULES.rmle, season)) return { amount: space, via: 'espacio salarial' };
  if (space > 0) return { amount: scaled(RULES.rmle, season), via: 'Room MLE' };
  if (pay < scaled(RULES.apron1, season)) return { amount: scaled(RULES.ntmle, season), via: 'Non-Taxpayer MLE' };
  if (pay < scaled(RULES.apron2, season)) return { amount: scaled(RULES.tmle, season), via: 'Taxpayer MLE' };
  return { amount: minSalary(0, season), via: 'mínimo' };
}

export function rosterCount(t: Team, league: League) {
  return t.roster.filter((id) => league.players[id]?.contract?.kind !== 'two-way').length;
}

export const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};
