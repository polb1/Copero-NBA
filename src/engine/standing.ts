// Season standing: a player far below the team's expectations gets warnings, and on repeat
// a demotion to a smaller market or outright waived.
import type { Career, TeamStatus } from './types';
import { RULES } from './config';
import { clamp } from './rng';
import { addNews, userOf } from './career';
import { fullName } from './players';
import { executeTrade } from './market';
import { teamName } from './league';
import { rosterCount } from './contracts';

export interface StandingResult {
  season: number;
  teamStatus: TeamStatus | null;
  mpg: number;
  gmsc: number;
  expectedMpg: number;
  under: boolean;
  strikes: number;
  action: 'none' | 'demoted' | 'cut';
}

/** End-of-season review of the user's production against the role the league expects. */
export function evaluateStanding(c: Career, season: number): StandingResult {
  const u = userOf(c);
  if (c.mode !== 'full') {
    return { season, teamStatus: null, mpg: 0, gmsc: 0, expectedMpg: 0, under: false, strikes: c.flags.underStrikes ?? 0, action: 'none' };
  }
  const rec = c.seasons.find((s) => s.season === season && s.comp === 'NBA' && s.stats.gp > 0);
  if (!rec) {
    return { season, teamStatus: null, mpg: 0, gmsc: 0, expectedMpg: 0, under: false, strikes: c.flags.underStrikes ?? 0, action: 'none' };
  }
  const team = rec.teamId ? c.league.teams[rec.teamId] : null;
  const mpg = rec.stats.min / rec.stats.gp;
  const gmsc = rec.stats.gmsc / rec.stats.gp;
  const expectedMpg = u.ovr >= 82 ? 32 : u.ovr >= 76 ? 26 : u.ovr >= 70 ? 20 : u.ovr >= 64 ? 11 : 5;
  const lowMin = mpg < expectedMpg * 0.55;
  const lowProd = gmsc < (u.ovr >= 82 ? 11 : u.ovr >= 76 ? 8.5 : u.ovr >= 70 ? 6.5 : u.ovr >= 64 ? 4 : 2);
  const under = rec.stats.gp >= 30 && (lowMin || lowProd) && !!team && team.status !== 'rebuild';
  const result: StandingResult = { season, teamStatus: team?.status ?? null, mpg, gmsc, expectedMpg, under, strikes: c.flags.underStrikes ?? 0, action: 'none' };
  if (!under) {
    result.strikes = Math.max(0, (c.flags.underStrikes ?? 0) - 1);
    c.flags.underStrikes = result.strikes;
    return result;
  }
  const strikes = (c.flags.underStrikes ?? 0) + 1;
  result.strikes = strikes;
  c.flags.underStrikes = strikes;
  c.trust = clamp(c.trust - 6, 0, 100);
  c.pressure = clamp(c.pressure + 4, 0, 100);
  c.morale = clamp(c.morale - 4, 0, 100);
  addNews(c, 'contract', 'Temporada por debajo de lo esperado', `${fullName(u)} no cumple las expectativas (${Math.round(mpg)} min, ${gmsc.toFixed(1)} GmSc por partido). Aviso ${strikes}.`, 'bad');
  const cut = strikes >= 3 && u.ovr < 76;
  const demote = !cut && (strikes >= 2 || (strikes >= 1 && team!.status === 'contender' && u.ovr < 76));
  if (cut) {
    waiveUser(c, season);
    result.action = 'cut';
    return result;
  }
  if (demote) {
    result.action = demoteUser(c, season) ? 'demoted' : 'none';
    return result;
  }
  return result;
}

/** Released for poor production: no team, no contract, and a damaged reputation. */
function waiveUser(c: Career, season: number) {
  const u = userOf(c);
  const from = u.teamId;
  if (from && c.league.teams[from]) c.league.teams[from].roster = c.league.teams[from].roster.filter((id) => id !== u.id);
  u.teamId = null;
  u.contract = null;
  c.assignment = 'NBA';
  c.offers = [];
  c.flags.cut = 1;
  c.flags.demoted = 1;
  c.flags.cutSeason = season;
  c.trust = clamp(c.trust - 12, 0, 100);
  c.reputation = clamp(c.reputation - 8, 0, 100);
  c.morale = clamp(c.morale - 10, 0, 100);
  c.loyalty = clamp(c.loyalty - 8, 0, 100);
  addNews(c, 'contract', 'Cortado por bajo rendimiento', `${fullName(u)} queda libre. La franquicia busca un nuevo rumbo y el mercado no será fácil.`, 'bad');
}

/** Traded to a smaller market: less spotlight, less pressure, a chance to rebuild the career. */
function demoteUser(c: Career, season: number): boolean {
  const u = userOf(c);
  const from = u.teamId;
  if (!from) return false;
  const current = c.league.teams[from];
  const candidates = Object.values(c.league.teams)
    .filter((t) => t.id !== from && t.reputation < current.reputation - 3 && rosterCount(t, c.league) <= RULES.rosterMax && t.status !== 'contender')
    .sort((a, b) => (a.status === 'rebuild' ? 0 : 1) - (b.status === 'rebuild' ? 0 : 1) || a.reputation - b.reputation);
  const target = candidates[0];
  if (!target) {
    addNews(c, 'contract', 'Sin destino a la vista', 'El equipo quiere moverte, pero no encuentra un destino. La presión sigue.', 'bad');
    return false;
  }
  executeTrade(c, target.id, `${teamName(c.league, from)} te considera prescindible tras una temporada por debajo de lo esperado.`);
  c.flags.demoted = 1;
  c.flags.demoteSeason = season;
  c.reputation = clamp(c.reputation - 4, 0, 100);
  c.morale = clamp(c.morale - 6, 0, 100);
  addNews(c, 'contract', 'Descenso a un equipo menor', `${fullName(u)} aterriza en ${teamName(c.league, target.id)}: menos foco, menos presión y una oportunidad de reconstruir su carrera.`, 'neutral');
  return true;
}
