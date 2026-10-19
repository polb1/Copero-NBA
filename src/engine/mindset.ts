// How the player's state turns into results: on-court performance, money and sponsorship.
// Every number a choice changes should matter somewhere; this module is where they meet the game.
import type { Career, Player } from './types';
import { SIM } from './config';
import { clamp } from './rng';

/** Cash in hand. New careers start at 0; saves from before the wallet start from their earnings. */
export const cashOf = (c: Career) => c.cash ?? c.earnings;

/** Mental state on court: morale and team chemistry lift the player's game, media pressure weighs on it. */
export function mindsetBoost(c: Career): number {
  const morale = (c.morale - 50) * 0.0012; // ±6 %
  const chemistry = (c.chemistry - 50) * 0.0008; // ±4 %
  const pressure = -Math.max(0, c.pressure - 55) * 0.0012; // down to −5.4 %
  return clamp(morale + chemistry + pressure, -0.1, 0.1);
}

/** Total on-court multiplier shown to the player (mental state plus form and fatigue), as a percentage. */
export function performancePct(c: Career, u: Player): number {
  return Math.round((mindsetBoost(c) + u.form * SIM.formEffect - u.fatigue * SIM.fatiguePenalty) * 100);
}

/** Agent commission on salaries, set by the agency chosen before the draft. */
export function agentCut(c: Career): number {
  return c.flags.agentCut !== undefined ? c.flags.agentCut / 100 : 0.04;
}

/** Yearly sponsorship that popularity brings in (on top of deals signed in events). */
export function fameSponsor(c: Career): number {
  if (c.fame <= 35) return 0;
  return Math.round((((c.fame - 35) / 65) ** 2 * 4_000_000) / 10_000) * 10_000;
}

/** First professional contract with the starting club: big clubs pay more (and give fewer minutes); NCAA is amateur. */
export function startingSalary(comp: 'NCAA' | 'EUR', tier: 1 | 2 | 3 | undefined): number {
  if (comp === 'NCAA') return 0;
  return tier === 1 ? 450_000 : tier === 2 ? 250_000 : 120_000;
}
