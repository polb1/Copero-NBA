import type { Career, Contract, League, Offer, Player } from './types';
import { capFor, maxSalary, minSalary, RULES, scaled } from './config';
import { makeSalaries, marketValue, offerCapacity, productionBonus, rosterCount, salaryIn, yearsLeft, fmtMoney } from './contracts';
import { positionNeeds } from './draft';
import { EURO_CLUBS, LEAGUE_STRENGTH } from '../data/clubs';
import { countryByCode } from '../content/names';
import { teamName, teamStrength } from './league';
import { addNews, userOf } from './career';
import { fullName } from './players';
import { clamp, rngFor, type Rng } from './rng';

export function teamInterest(league: League, teamId: string, u: Player, c: Career, rng: Rng) {
  const t = league.teams[teamId];
  const need = positionNeeds(league, teamId)[u.pos];
  let s = need * 2 + rng.normal(0, 3);
  if (t.status === 'contender') s += (u.ovr - 72) * 0.5;
  if (t.status === 'rebuild') s += (u.pot - u.ovr) * 0.3 - Math.max(0, u.age - 27) * 1.2;
  s += (c.reputation - 40) * 0.08;
  if (c.flags.agentUpgrade) s += 2;
  if (c.pressure > 70) s -= 2;
  return s;
}

/** Role a team projects for the user: rank of the user's OVR among the team's players at all positions. */
export function projectedRole(league: League, teamId: string, u: Player) {
  const ovrs = league.teams[teamId].roster.filter((id) => id !== u.id).map((id) => league.players[id]?.ovr ?? 0).sort((a, b) => b - a);
  const rank = ovrs.filter((o) => o > u.ovr).length;
  if (rank <= 1 && u.ovr >= 80) return 'Estrella';
  if (rank < 5) return 'Titular';
  if (rank < 9) return 'Rotación';
  return 'Banquillo';
}

function rookieYears(age: number, rng: Rng) {
  if (age <= 25) return rng.int(2, 5);
  if (age <= 30) return rng.int(2, 4);
  if (age <= 33) return rng.int(1, 2);
  return 1;
}

/** Free-agency offers for the user (simplified CBA model: capacity = space or available exception). */
export function generateFAOffers(c: Career, opts: { ownTeam?: string | null; rfa?: boolean } = {}): Offer[] {
  const league = c.league;
  const u = userOf(c);
  const season = league.season;
  const rng = rngFor(c.seed, 'fa-offers', season, c.offers.length, u.ovr);
  const prevGmsc = c.seasons.filter((s) => s.comp === 'NBA').slice(-1)[0];
  const prod = prevGmsc && prevGmsc.stats.gp ? productionBonus(prevGmsc.stats.gmsc / prevGmsc.stats.gp) : 0;
  const mv = marketValue(u, season, prod) * (c.flags.agentUpgrade ? 1.08 : 1) * (0.9 + c.agent.quality / 500);
  const threshold = u.ovr >= 78 ? -6 : u.ovr >= 70 ? -1 : u.ovr >= 64 ? 3 : 7;
  const teams = Object.keys(league.teams)
    .map((id) => ({ id, s: teamInterest(league, id, u, c, rng) + (id === opts.ownTeam ? 3 + (c.flags.wantsStay ? 4 : 0) + (c.loyalty - 50) * 0.06 : 0) }))
    .filter((x) => x.s > threshold && (rosterCount(league.teams[x.id], league) < RULES.rosterMax || x.id === opts.ownTeam))
    .sort((a, b) => b.s - a.s)
    .slice(0, u.ovr >= 75 ? 5 : u.ovr >= 66 ? 4 : 2);
  const offers: Offer[] = [];
  for (const { id, s } of teams) {
    const cap = offerCapacity(league, id, season);
    const own = id === opts.ownTeam;
    // Own team can exceed the cap to retain its player (simplified Bird rights).
    const limit = own ? maxSalary(u.yearsPro, season) : cap.amount;
    const want = mv * clamp(0.85 + s * 0.015 + rng.normal(0, 0.05), 0.7, 1.2);
    const salary = Math.round(Math.max(minSalary(u.yearsPro, season), Math.min(want, limit, maxSalary(u.yearsPro, season))));
    const years = rookieYears(u.age, rng);
    const isMax = salary >= maxSalary(u.yearsPro, season) * 0.99;
    offers.push({
      id: `fa-${season}-${id}-${offers.length}`,
      teamId: id,
      kind: isMax ? 'max' : salary <= minSalary(u.yearsPro, season) * 1.01 ? 'minimum' : 'standard',
      years,
      salary,
      raise: 0.05,
      option: years >= 3 && u.ovr >= 74 && rng.chance(0.5) ? 'player' : years >= 3 && rng.chance(0.25) ? 'team' : undefined,
      role: projectedRole(league, id, u),
      note: own ? (opts.rfa ? 'Tu equipo actual (agente libre restringido: puede igualar ofertas).' : 'Tu equipo actual. Puede superar el tope para retenerte.') : `Vía: ${salary <= minSalary(u.yearsPro, season) * 1.01 ? 'mínimo' : cap.via}. ${league.teams[id].coach.name} (${league.teams[id].status === 'contender' ? 'aspirante' : league.teams[id].status === 'rebuild' ? 'proyecto joven' : 'equipo en construcción'}).`,
    });
  }
  return offers;
}

/** Summer offers from clubs outside the NBA (European career): renewal with the current club + two others. */
export function euroOffers(c: Career): Offer[] {
  const L = c.league;
  const u = userOf(c);
  const season = L.season;
  const rng = rngFor(c.seed, 'euro-offers', season);
  const last = [...c.seasons].reverse().find((s) => s.comp === 'EUR');
  const current = last ? EURO_CLUBS.find((cl) => cl.name === last.teamName) : undefined;
  const tiers = u.ovr >= 74 ? [1] : u.ovr >= 67 ? [1, 2] : u.ovr >= 60 ? [2, 3] : [3];
  // Clubs from the player's country and region come first, then the strongest leagues.
  const myRegion = countryByCode(u.nat).region;
  const score = (cl: (typeof EURO_CLUBS)[number]) => (cl.country === u.nat ? 3 : 0) + (countryByCode(cl.country).region === myRegion ? 2 : 0) + ((LEAGUE_STRENGTH[cl.league] ?? -3) >= -1 ? 1.5 : 0) + rng.next() * 1.5;
  const pool = EURO_CLUBS.filter((cl) => tiers.includes(cl.tier) && cl.name !== current?.name).map((cl) => ({ cl, s: score(cl) })).sort((a, b) => b.s - a.s).map((x) => x.cl);
  // Prefer variety: different leagues.
  const picks: typeof EURO_CLUBS = [];
  for (const cl of pool) if (picks.length < 2 && !picks.some((p) => p.league === cl.league)) picks.push(cl);
  for (const cl of pool) if (picks.length < 2 && !picks.includes(cl)) picks.push(cl);
  const list = current && u.age < 37 ? [current, ...picks] : picks;
  const base = 450_000 + Math.max(0, u.ovr - 55) * 160_000 + Math.max(0, u.ovr - 72) * 250_000;
  return list.map((club, i) => {
    const renew = club === current;
    const years = u.age >= 32 ? 1 : rng.int(1, 3);
    const salary = Math.round(scaled(base * (club.tier === 1 ? 1.3 : club.tier === 2 ? 1 : 0.75) * (renew ? 1.05 : 1), season));
    return {
      id: `eu-${season}-${i}`, teamId: 'EUR', kind: 'overseas' as const, years, club: club.name, salary, raise: 0.04,
      role: club.tier === 1 ? (u.ovr >= 74 ? 'Estrella' : 'Rotación') : club.tier === 2 ? 'Titular' : 'Estrella del equipo',
      note: renew ? `Renovar con ${club.name} (${club.league}).` : `${club.name} (${club.league}).`,
    };
  });
}

export function fallbackOffers(c: Career): Offer[] {
  const league = c.league;
  const u = userOf(c);
  const season = league.season;
  const rng = rngFor(c.seed, 'fallback-offers', season);
  const out: Offer[] = [];
  const teams = Object.keys(league.teams).sort((a, b) => positionNeeds(league, b)[u.pos] - positionNeeds(league, a)[u.pos]);
  if (u.yearsPro <= 4 && u.age <= 27) {
    for (const id of teams.slice(0, 2))
      out.push({ id: `tw-${season}-${id}`, teamId: id, kind: 'two-way', years: rng.int(1, 2), salary: scaled(RULES.twoWaySalary, season), raise: 0, role: 'G League + hasta 50 partidos NBA', note: 'Contrato two-way: alternarás el filial y el primer equipo.' });
  }
  if (u.ovr >= 55) {
    const id = teams[2] ?? teams[0];
    out.push({ id: `gl-${season}-${id}`, teamId: id, kind: 'gleague', years: 1, salary: 40_500, raise: 0, role: 'Filial G League', note: 'Contrato de G League sin plaza NBA. Rinde y llegará la llamada.' });
    out.push({ id: `ex-${season}-${teams[3] ?? id}`, teamId: teams[3] ?? id, kind: 'exhibit10', years: 1, salary: minSalary(0, season), raise: 0, role: 'Training camp', note: 'Exhibit 10: compites por una plaza en el training camp. Si no la ganas, pasas al filial.' });
  }
  // Two overseas clubs bid: their level depends on how good the player is.
  const tier = u.ovr >= 70 ? 1 : u.ovr >= 63 ? 2 : 3;
  const pool = EURO_CLUBS.filter((cl) => cl.tier === tier || cl.tier === Math.min(3, tier + 1));
  const clubs = rng.shuffle([...pool]).slice(0, 2);
  clubs.forEach((club, i) => out.push({
    id: `os-${season}-${i}`, teamId: 'EUR', kind: 'overseas', years: 1, club: club.name,
    salary: Math.round(scaled((600_000 + Math.max(0, u.ovr - 55) * 120_000) * (club.tier === 1 ? 1.25 : club.tier === 2 ? 1 : 0.8), season)),
    raise: 0, role: club.tier === 1 ? 'Rotación en un grande' : club.tier === 2 ? 'Titular' : 'Estrella del equipo',
    note: `${club.name} (${club.league}). Una temporada fuera y vuelves a la agencia libre el próximo verano.`,
  }));
  return out;
}

/** Puts the user on a team roster with a contract. Releases the weakest player if the roster is full. */
export function signUser(c: Career, teamId: string, contract: Contract) {
  const league = c.league;
  const u = userOf(c);
  if (u.teamId && league.teams[u.teamId]) {
    const old = league.teams[u.teamId];
    old.roster = old.roster.filter((id) => id !== u.id);
  }
  u.teamId = teamId;
  u.contract = contract;
  const t = league.teams[teamId];
  if (contract.kind !== 'gleague') {
    if (!t.roster.includes(u.id)) t.roster.push(u.id);
    const limit = RULES.rosterMax + (contract.kind === 'two-way' ? 1 : 0);
    while (t.roster.length > limit) {
      const cut = t.roster
        .map((id) => league.players[id])
        .filter((p) => p && !p.isUser)
        .sort((a, b) => a.ovr - b.ovr)[0];
      if (!cut) break;
      t.roster = t.roster.filter((id) => id !== cut.id);
      cut.teamId = null;
      cut.contract = null;
      league.freeAgents.push(cut.id);
    }
  }
  c.assignment = contract.kind === 'two-way' || contract.kind === 'gleague' ? 'GLG' : 'NBA';
  c.twoWayNbaGames = 0;
  if (!c.teamsPlayed.includes(teamId)) c.teamsPlayed.push(teamId);
  c.satellite = null;
  if (contract.kind === 'max') c.flags.maxContract = 1;
}

export function contractFromOffer(o: Offer, season: number): Contract {
  const salaries = makeSalaries(o.salary, o.years, o.raise);
  return {
    teamId: o.teamId,
    salaries,
    startSeason: season,
    kind: o.kind,
    option: o.option ? { type: o.option, season: season + o.years - 1 } : undefined,
  };
}

// ---------------- Trades ----------------

export function generateTradeOffers(c: Career): Offer[] {
  const league = c.league;
  const u = userOf(c);
  if (!u.teamId || !u.contract) return [];
  const rng = rngFor(c.seed, 'trade-offers', league.season, league.day);
  const salary = salaryIn(u.contract, league.season);
  const left = yearsLeft(u.contract, league.season);
  const value = u.ovr + (u.pot - u.ovr) * 0.3 - Math.max(0, salary - marketValue(u, league.season)) / 2_000_000;
  const list = Object.keys(league.teams)
    .filter((id) => id !== u.teamId)
    .map((id) => ({ id, s: teamInterest(league, id, u, c, rng) + (value - 68) * 0.4 }))
    .filter((x) => x.s > 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  return list.map((x) => ({
    id: `tr-${league.season}-${league.day}-${x.id}`,
    teamId: x.id,
    kind: u.contract!.kind,
    years: left,
    salary,
    raise: 0,
    role: projectedRole(league, x.id, u),
    note: `${teamName(league, x.id)} (${league.teams[x.id].w}-${league.teams[x.id].l}). Tu contrato se traspasa íntegro.`,
  }));
}

/** Executes a trade of the user to `teamId`, sending back a player with comparable salary. */
export function executeTrade(c: Career, teamId: string, reason: string) {
  const league = c.league;
  const u = userOf(c);
  const from = u.teamId!;
  const fromTeam = league.teams[from];
  const toTeam = league.teams[teamId];
  const salary = salaryIn(u.contract, league.season);
  const back = toTeam.roster
    .map((id) => league.players[id])
    .filter((p) => p && !p.isUser)
    .sort((a, b) => Math.abs(salaryIn(a.contract, league.season) - salary) - Math.abs(salaryIn(b.contract, league.season) - salary))[0];
  fromTeam.roster = fromTeam.roster.filter((id) => id !== u.id);
  if (back) {
    toTeam.roster = toTeam.roster.filter((id) => id !== back.id);
    fromTeam.roster.push(back.id);
    back.teamId = from;
    if (back.contract) back.contract.teamId = from;
  }
  toTeam.roster.push(u.id);
  u.teamId = teamId;
  if (u.contract) u.contract.teamId = teamId;
  if (!c.teamsPlayed.includes(teamId)) c.teamsPlayed.push(teamId);
  c.trust = 45;
  c.chemistry = 40;
  c.tradeRequested = false;
  c.loyalty = 40;
  c.flags.newTeam = 1;
  addNews(c, 'contract', `¡Traspaso! ${fullName(u)} se marcha a ${teamName(league, teamId)}`, `${reason} ${back ? `${teamName(league, from)} recibe a ${fullName(back)}.` : ''} Toca adaptarse a un nuevo sistema con ${toTeam.coach.name}.`, 'neutral');
}

export function offerSummary(o: Offer) {
  if (o.kind === 'overseas') return `${fmtMoney(o.salary)} · 1 temporada en Europa`;
  if (o.kind === 'two-way') return `${fmtMoney(o.salary)} · two-way ${o.years} año${o.years > 1 ? 's' : ''}`;
  if (o.kind === 'gleague') return `${fmtMoney(o.salary)} · contrato G League`;
  const total = makeSalaries(o.salary, o.years, o.raise).reduce((s, v) => s + v, 0);
  return `${fmtMoney(o.salary)}/año · ${o.years} año${o.years > 1 ? 's' : ''} · total ${fmtMoney(total)}${o.option ? ` · opción de ${o.option === 'player' ? 'jugador' : 'equipo'}` : ''}`;
}

export const capUsage = (league: League, teamId: string) => ({ cap: capFor(league.season), strength: teamStrength(league, teamId) });
