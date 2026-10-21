// League offseason, user contract situation, pre-draft process, signing and retirement.
import type { Career, League, MinigameTierId, Offer, Player, Prospect, RetirementSummary, TeamStatus } from './types';
import type { MinigameDef } from '../content/events';
import { COMBINE_TESTS, combineTestIds, type CombineTestDef } from '../content/combine';
import { buildSpec } from './minigames';
import { addNews, onNbaRoster, teamOf, userOf } from './career';
import { generateDraftClass, materializeProspect, mockRange, positionNeeds, prospectValue, rookieContract, runLottery, simulateDraft } from './draft';
import { contractEnd, makeSalaries, marketValue, offerCapacity, salaryIn, yearsLeft, fmtMoney } from './contracts';
import { contractFromOffer, euroOffers, fallbackOffers, generateFAOffers, signUser, projectedRole } from './market';
import { evaluateStanding } from './standing';
import { offseasonDevelopment } from './progression';
import { generatePlayer, emptyStats, fullName } from './players';
import { makeCoach, newPlayerId, setupSeasonSchedule, signNpc, teamName, teamStrength } from './league';
import { pickEvent, instantiate, markEventSeen } from './events';
import { eventContext } from './career';
import { achievementsCheck } from './flow';
import { legacyScore, hofProbability, hofVerdict, legacyTier, careerTotals, playoffTotals, awardCounts } from './legacy';
import { DAILY_MAX_SEASONS, MAX_AGE, RULES, minSalary, rookieScale, scaled } from './config';
import { clamp, rngFor, type Rng } from './rng';
import { seasonLabel } from './schedule';
import { SATELLITES } from './satellite';
import { EURO_CLUBS, clubLevel, clubMinutes, findClub } from '../data/clubs';
import { countryByCode } from '../content/names';
import { startingSalary } from './mindset';

// ---------------- League offseason ----------------

export function runNpcDraft(L: League, seed: number, exclude?: string) {
  const { order } = runLottery(L, seed);
  const cls = generateDraftClass(seed, L.season + 1);
  const picks = simulateDraft(L, seed, order, cls);
  for (const pk of picks) {
    const pr = cls.find((p) => p.id === pk.prospectId)!;
    addDrafted(L, seed, pr, pk.teamId, pk.pick);
  }
  void exclude;
  return { order, picks, cls };
}

export function addDrafted(L: League, seed: number, pr: Prospect, teamId: string, pick: number) {
  const p = materializeProspect(seed, L.season + 1, pr, L);
  p.teamId = teamId;
  p.age = pr.age;
  p.draft = { season: L.season + 1, round: pick <= RULES.roundSize ? 1 : 2, pick: pick <= RULES.roundSize ? pick : pick - RULES.roundSize, teamId };
  rookieContract(p, teamId, pick, L.season + 1);
  p.age -= 1; // will be aged in the offseason step
  p.yearsPro = -1; // becomes 0 (rookie) after the offseason step
  L.players[p.id] = p;
  L.teams[teamId].roster.push(p.id);
}

function retireNpcs(L: League, seed: number) {
  const rng = rngFor(seed, 'retire', L.season);
  for (const p of Object.values(L.players)) {
    if (p.isUser || p.retired) continue;
    const old = p.age >= 39 || (p.age >= 35 && p.ovr < 72 && rng.chance(0.55)) || (p.age >= 33 && p.ovr < 62 && rng.chance(0.5));
    const washed = !p.teamId && p.age >= 29 && p.ovr < 58;
    if (old || washed) {
      if (p.teamId) L.teams[p.teamId].roster = L.teams[p.teamId].roster.filter((id) => id !== p.id);
      L.freeAgents = L.freeAgents.filter((id) => id !== p.id);
      delete L.players[p.id];
    }
  }
}

function expireNpcContracts(L: League, seed: number) {
  const rng = rngFor(seed, 'expire', L.season);
  const next = L.season + 1;
  for (const t of Object.values(L.teams)) {
    for (const pid of [...t.roster]) {
      const p = L.players[pid];
      if (!p || p.isUser || !p.contract) continue;
      const c = p.contract;
      if (c.option?.type === 'team' && c.option.season === next && p.ovr < 60) {
        c.salaries = c.salaries.slice(0, next - c.startSeason);
      }
      if (contractEnd(c) < next) {
        if (p.ovr >= 64 && rng.chance(0.55)) {
          const years = p.age >= 32 ? rng.int(1, 2) : rng.int(2, 4);
          const first = Math.max(minSalary(p.yearsPro, next), Math.round(marketValue(p, next) * rng.range(0.85, 1.1)));
          p.contract = { teamId: t.id, salaries: makeSalaries(first, years), startSeason: next, kind: 'standard' };
        } else {
          t.roster = t.roster.filter((id) => id !== pid);
          p.teamId = null;
          p.contract = null;
          L.freeAgents.push(pid);
        }
      }
    }
  }
}

function npcFreeAgency(L: League, seed: number) {
  const rng = rngFor(seed, 'npc-fa', L.season);
  const next = L.season + 1;
  const pool = () => L.freeAgents.map((id) => L.players[id]).filter((p) => p && !p.isUser).sort((a, b) => b.ovr - a.ovr);
  for (let round = 0; round < 3; round++) {
    for (const p of pool()) {
      const target = round === 0 ? 13 : 14;
      const candidates = Object.values(L.teams).filter((t) => t.roster.length < target);
      if (!candidates.length) break;
      const t = rng.weighted(candidates, (x) => 1 + Math.max(0, positionNeeds(L, x.id)[p.pos] + 2) + (offerCapacity(L, x.id, next).amount > marketValue(p, next) ? 2 : 0));
      const cap = offerCapacity(L, t.id, next).amount;
      const first = Math.max(minSalary(p.yearsPro, next), Math.min(cap, Math.round(marketValue(p, next) * rng.range(0.8, 1.05))));
      p.contract = { teamId: t.id, salaries: makeSalaries(first, p.age >= 32 ? 1 : rng.int(1, 4)), startSeason: next, kind: 'standard' };
      p.teamId = t.id;
      t.roster.push(p.id);
      L.freeAgents = L.freeAgents.filter((id) => id !== p.id);
    }
  }
  // Fill any remaining holes with fresh veterans.
  for (const t of Object.values(L.teams)) {
    while (t.roster.length < 14) {
      const p = generatePlayer(rng, { id: newPlayerId(L), level: Math.round(rng.range(55, 66)), age: rng.int(23, 32), season: next });
      L.players[p.id] = p;
      signNpc(L, p, t.id, rng, next);
      p.contract!.startSeason = next;
      t.roster.push(p.id);
    }
    while (t.roster.length > RULES.rosterMax + (t.roster.some((id) => L.players[id]?.contract?.kind === 'two-way') ? 1 : 0)) {
      const cut = t.roster.map((id) => L.players[id]).filter((p) => p && !p.isUser).sort((a, b) => a.ovr - b.ovr)[0];
      t.roster = t.roster.filter((id) => id !== cut.id);
      cut.teamId = null;
      cut.contract = null;
      L.freeAgents.push(cut.id);
    }
  }
  // Keep a reasonable pool of free agents: the rest sign abroad and leave the simulation.
  const sortedFa = L.freeAgents.map((id) => L.players[id]).filter((p) => p && !p.isUser).sort((a, b) => b.ovr - a.ovr);
  for (const p of sortedFa.slice(60)) delete L.players[p.id];
  L.freeAgents = sortedFa.slice(0, 60).map((p) => p.id);
  while (L.freeAgents.length < 20) {
    const p = generatePlayer(rng, { id: newPlayerId(L), level: Math.round(rng.range(53, 64)), age: rng.int(22, 31), season: next });
    L.players[p.id] = p;
    L.freeAgents.push(p.id);
  }
}

function reevaluateTeams(L: League, seed: number) {
  const rng = rngFor(seed, 'teams-eval', L.season);
  const ranked = Object.values(L.teams).sort((a, b) => teamStrength(L, b.id) - teamStrength(L, a.id));
  ranked.forEach((t, i) => {
    const status: TeamStatus = i < 5 ? 'contender' : i < 13 ? 'playoff' : i < 22 ? 'middle' : 'rebuild';
    t.status = status;
    const last = t.history[t.history.length - 1];
    if (last && last.w < 28 && t.coach.hiredSeason < L.season && rng.chance(0.4)) {
      t.coach = makeCoach(rng, L.season + 1);
      t.coach.hiredSeason = L.season + 1;
    }
    t.reputation = Math.round(clamp(t.reputation * 0.8 + (last ? last.w / 82 : 0.5) * 30 + (t.market === 'large' ? 8 : 0), 20, 99));
  });
}

export function leagueOffseason(L: League, seed: number, opts: { draft: boolean }) {
  if (opts.draft) runNpcDraft(L, seed);
  expireNpcContracts(L, seed);
  // Aging and development for everyone except the user (handled with context).
  const rng = rngFor(seed, 'npc-dev', L.season);
  for (const p of Object.values(L.players)) {
    if (p.retired) continue;
    p.age++;
    if (p.teamId) p.yearsPro++;
    p.prevGmsc = p.season.gp >= 20 ? p.season.gmsc / p.season.gp : p.prevGmsc;
    p.season = emptyStats();
    p.playoffs = emptyStats();
    p.fatigue = 0;
    p.form = 0;
    if (p.injury) {
      p.injury.daysLeft -= 120;
      p.injury.playingThrough = false;
      if (p.injury.daysLeft <= 0) p.injury = null;
    }
    if (!p.isUser) offseasonDevelopment(p, rng);
  }
  retireNpcs(L, seed);
  npcFreeAgency(L, seed);
  reevaluateTeams(L, seed);
  for (const t of Object.values(L.teams)) {
    t.w = t.l = t.homeW = t.homeL = t.awayW = t.awayL = t.pf = t.pa = t.streak = 0;
    t.last10 = [];
  }
  L.season++;
  L.allStars = [];
  setupSeasonSchedule(L, seed);
}

// ---------------- User offseason ----------------

export function beginOffseason(c: Career) {
  const L = c.league;
  const u = userOf(c);
  const prevSeason = L.season;
  const t = teamOf(c);
  const trainingBonus = Math.min(0.3, (c.flags.trainingGains ?? 0) / 60);
  const recent = c.seasons.filter((s) => s.season === prevSeason);
  const mins = recent.reduce((s, r) => s + r.stats.min, 0);
  const gp = recent.reduce((s, r) => s + r.stats.gp, 0);
  leagueOffseason(L, c.seed, { draft: true });
  // user development
  const delta = offseasonDevelopment(u, rngFor(c.seed, 'user-dev', prevSeason), {
    workEthic: c.workEthic,
    minutesShare: gp ? mins / gp / 36 : 0.2,
    coachRating: t?.coach.rating ?? 60,
    trainingBonus,
  });
  delete c.flags.trainingGains;
  c.ovrHistory.push({ season: L.season, age: u.age, ovr: u.ovr, pot: u.pot });
  if (u.teamId && (!c.bestTeamPeak || u.ovr > c.bestTeamPeak.ovr)) c.bestTeamPeak = { teamId: u.teamId, ovr: u.ovr };
  addNews(c, 'training', 'Evolución en verano', `${fullName(u)} cumple ${u.age} años. OVR ${delta >= 0 ? '+' : ''}${delta} → ${u.ovr} (potencial ${u.pot}).`, delta >= 0 ? 'good' : 'bad');
  c.gameLog = [];
  c.satStats = emptyStats();
  c.satellite = null;
  c.goals = [];
  c.devPoints = {};
  c.tradeRequested = false;
  c.pressure = clamp(c.pressure * 0.7, 0, 100);
  delete c.flags.newTeam;
  delete c.flags.wantsStay;
  delete c.flags.testMarket;
  delete c.flags.reinjuryRisk;
  // Nobody plays out the string on a bench: veterans who stopped getting games hang it up.
  const idle = gp < 5;
  c.flags.idleSeasons = idle ? (c.flags.idleSeasons ?? 0) + 1 : 0;
  if (idle && (u.age >= 33 || (u.age >= 30 && c.flags.idleSeasons >= 2) || c.flags.idleSeasons >= 3)) {
    retire(c, gp === 0 ? 'Una temporada entera sin jugar: decides que es el momento de decir adiós.' : 'Sin minutos en la rotación: decides que es el momento de decir adiós.');
    return;
  }
  // Veterans whose level has fallen far (in any league) call it a day instead of playing on into their forties.
  if ((u.age >= 37 && u.ovr < 62) || (u.age >= 39 && u.ovr < 67)) {
    retire(c, 'Tu cuerpo dice basta: el nivel ya no es el de antes y decides retirarte.');
    return;
  }
  evaluateStanding(c, prevSeason);
  nationalSummer(c, prevSeason);
  c.phase = 'offseason';
  c.offers = [];
  buildOffseasonOffers(c);
  // Summer event: only in the long pace, and not every year. It counts towards the coming season's decisions.
  const ctx = eventContext(c);
  const ev = c.mode === 'full' && rngFor(c.seed, 'off-event-roll', L.season).chance(0.4) ? pickEvent(ctx, rngFor(c.seed, 'off-event', L.season)) : null;
  if (ev) {
    c.pendingEvent = instantiate(ev, ctx, rngFor(c.seed, 'off-event-i', L.season));
    markEventSeen(c, ev.id, ctx.absDay);
    c.flags[`events${L.season}`] = (c.flags[`events${L.season}`] ?? 0) + 1;
  }
  achievementsCheck(c);
}

/**
 * Every summer the best players of each country play for their national team (World Cup, EuroBasket,
 * Olympics...). The bar depends on how deep the country is; medals depend on its strength.
 */
function nationalSummer(c: Career, season: number) {
  const u = userOf(c);
  if (u.injury && u.injury.daysLeft > 20) return;
  const country = countryByCode(u.nat);
  const deep = u.nat === 'USA' ? 2 : country.weight >= 3 ? 1 : 0;
  const bar = [69, 75, 85][deep];
  if (u.ovr < bar) return;
  c.flags.nationalTeam = 1;
  c.flags.nationalCaps = (c.flags.nationalCaps ?? 0) + 1;
  c.fame = clamp(c.fame + 3, 0, 100);
  const rng = rngFor(c.seed, 'national', season);
  const medalChance = [0.06, 0.22, 0.65][deep] + Math.max(0, u.ovr - bar - 5) * 0.006;
  if (rng.chance(medalChance)) {
    c.flags.medals = (c.flags.medals ?? 0) + 1;
    c.flags.medalSeason = season; // the screen celebrates it once
    addNews(c, 'milestone', `Medalla con ${country.name}`, `Torneo internacional de verano: subes al podio con ${country.name}.`, 'good');
  } else {
    addNews(c, 'milestone', `Convocado por ${country.name}`, `Juegas el torneo internacional de verano con ${country.name}.`, 'neutral');
  }
}

export function needsContract(c: Career) {
  const u = userOf(c);
  if (!u.contract) return true;
  return contractEnd(u.contract) < c.league.season;
}

export function buildOffseasonOffers(c: Career) {
  const L = c.league;
  const u = userOf(c);
  const season = L.season;
  const k = u.contract;
  const ownTeam = u.teamId;
  if (k && contractEnd(k) >= season) {
    // Option year?
    if (k.option && k.option.season === season) {
      if (k.option.type === 'team') {
        const keep = u.ovr >= 60 && marketValue(u, season) >= salaryIn(k, season) * 0.7;
        if (!keep) {
          k.salaries = k.salaries.slice(0, season - k.startSeason);
          addNews(c, 'contract', 'Opción de equipo rechazada', `${teamName(L, ownTeam)} declina tu opción. Eres agente libre.`, 'bad');
        } else {
          addNews(c, 'contract', 'Opción de equipo ejercida', `${teamName(L, ownTeam)} ejerce la opción: seguirás una temporada más por ${fmtMoney(salaryIn(k, season))}.`, 'good');
          delete k.option;
        }
      } else {
        c.offers.push({ id: 'opt-player', teamId: ownTeam!, kind: k.kind, years: 1, salary: salaryIn(k, season), raise: 0, role: projectedRole(L, ownTeam!, u), note: 'Ejercer tu opción de jugador: te quedas una temporada más con el salario pactado.' });
        c.offers.push(...generateFAOffers(c, { ownTeam }).filter((o) => o.teamId !== ownTeam));
        return;
      }
    }
  }
  if (u.contract && contractEnd(u.contract) >= season) {
    // Under contract: possible extension in the final year.
    if (yearsLeft(u.contract, season) === 1 && u.contract.kind !== 'two-way' && u.ovr >= 66) {
      const ext = generateFAOffers(c, { ownTeam }).find((o) => o.teamId === ownTeam);
      if (ext) {
        ext.id = 'ext-' + ext.id;
        ext.note = u.contract.kind === 'rookie' ? 'Extensión de contrato de novato: empieza la próxima temporada.' : 'Extensión de contrato: empieza la próxima temporada.';
        c.offers.push(ext);
      }
    }
    return;
  }
  // European career: club offers every summer, plus NBA interest if good enough.
  if (c.flags.euroCareer && !onNbaRoster(c)) {
    const nba = u.ovr >= 72 ? generateFAOffers(c).slice(0, 2) : [];
    const last = [...c.seasons].reverse().find((s) => s.comp === 'EUR');
    const club = last ? findClub(last.teamName) : undefined;
    if ((c.flags.euroUntil ?? 0) >= season && club) {
      const stay: Offer = { id: `eu-stay-${season}`, teamId: 'EUR', kind: 'overseas', years: c.flags.euroUntil - season + 1, club: club.name, salary: c.flags.euroSalary ?? 0, raise: 0, role: 'Bajo contrato', note: `Sigues bajo contrato con ${club.name} hasta ${seasonLabel(c.flags.euroUntil)}.` };
      if (!nba.length) {
        // Nothing to decide: the season with the current club simply continues.
        setOverseasClub(c, club.name, stay.salary);
        return;
      }
      c.offers.push(stay, ...nba);
      return;
    }
    c.offers.push(...euroOffers(c), ...nba);
    return;
  }
  // Free agent
  const rfa = !!k?.rookieScale;
  const own = onNbaRoster(c) ? ownTeam : null;
  const nba = generateFAOffers(c, { ownTeam: own, rfa });
  c.offers.push(...nba);
  if (nba.length < 2) c.offers.push(...fallbackOffers(c));
  if ((c.flags.cut || c.flags.demoted) && !c.offers.some((o) => o.kind === 'overseas')) {
    c.offers.push(...fallbackOffers(c).filter((o) => o.kind === 'overseas').slice(0, 1));
  }
  if (k) addNews(c, 'contract', 'Agente libre', `Tu contrato con ${teamName(L, k.teamId)} ha terminado. ${c.offers.length} propuesta(s) sobre la mesa.`, 'neutral');
}

export function acceptOffer(c: Career, offerId: string) {
  const L = c.league;
  const o = c.offers.find((x) => x.id === offerId);
  if (!o) return;
  // A fresh signing clears the poor-standing marks: a new air, even from a smaller market.
  delete c.flags.cut;
  delete c.flags.demoted;
  delete c.flags.underStrikes;
  const u = userOf(c);
  if (offerId === 'opt-player') {
    if (u.contract) delete u.contract.option;
    addNews(c, 'contract', 'Opción de jugador ejercida', `Seguirás en ${teamName(L, o.teamId)} una temporada más.`, 'neutral');
    c.offers = [];
    return;
  }
  if (offerId.startsWith('ext-')) {
    const cur = u.contract!;
    const ext = makeSalaries(o.salary, o.years, o.raise);
    cur.salaries = [...cur.salaries, ...ext];
    cur.kind = o.kind === 'max' ? 'max' : 'standard';
    delete cur.option;
    if (o.kind === 'max') c.flags.maxContract = 1;
    c.loyalty = clamp(c.loyalty + 8, 0, 100);
    addNews(c, 'contract', 'Extensión firmada', `${fullName(u)} extiende con ${teamName(L, o.teamId)}: ${o.years} años más desde ${seasonLabel(L.season + 1)} (${fmtMoney(o.salary)} el primer año).`, 'good');
    c.offers = [];
    return;
  }
  if (o.kind === 'overseas') {
    if (u.teamId && L.teams[u.teamId]) L.teams[u.teamId].roster = L.teams[u.teamId].roster.filter((id) => id !== u.id);
    u.teamId = null;
    u.contract = null;
    const club = setOverseasClub(c, o.club ?? EURO_CLUBS[0].name, o.salary);
    if (!o.id.startsWith('eu-stay')) {
      c.flags.euroUntil = L.season + o.years - 1;
      c.flags.euroSalary = o.salary;
    }
    addNews(c, 'contract', 'Rumbo al extranjero', `${fullName(u)} jugará una temporada en ${club.name} (${club.league}) por ${fmtMoney(o.salary)}.`, 'neutral');
  } else {
    // RFA: the original team may match an outside offer.
    const k = u.contract;
    if (k?.rookieScale && contractEnd(k) < L.season && o.teamId !== k.teamId && onNbaRoster(c)) {
      const rng = rngFor(c.seed, 'rfa-match', L.season);
      if (o.salary <= marketValue(u, L.season) * 1.05 && rng.chance(0.55)) {
        signUser(c, k.teamId, contractFromOffer({ ...o, teamId: k.teamId }, L.season));
        addNews(c, 'contract', 'Oferta igualada', `${teamName(L, k.teamId)} iguala la oferta de ${teamName(L, o.teamId)}. Te quedas.`, 'neutral');
        c.offers = [];
        afterSigning(c);
        return;
      }
    }
    const prevTeam = u.teamId;
    signUser(c, o.teamId, contractFromOffer(o, L.season));
    if (prevTeam !== o.teamId) {
      c.trust = 45;
      c.chemistry = 42;
      c.loyalty = 45;
      c.flags.newTeam = 1;
    }
    addNews(c, 'contract', `${fullName(u)} firma con ${teamName(L, o.teamId)}`, `${o.years} año(s), ${fmtMoney(o.salary)} el primer año. Rol esperado: ${o.role}.`, 'good');
  }
  c.offers = [];
  afterSigning(c);
}

function afterSigning(c: Career) {
  if (c.phase === 'signing') startPreseason(c);
}

export function canRetire(c: Career) {
  return userOf(c).age >= 30 || c.offers.length === 0;
}

export function startPreseason(c: Career) {
  const L = c.league;
  const u = userOf(c);
  if (c.mode === 'daily' && c.seasons.filter((s) => s.comp === 'NBA').length >= DAILY_MAX_SEASONS) {
    retire(c, 'Fin del desafío diario: 12 temporadas completadas.');
    return;
  }
  if (u.age >= MAX_AGE) {
    retire(c, 'Edad máxima alcanzada.');
    return;
  }
  c.phase = 'preseason';
  c.seasonOvrStart = u.ovr;
  c.gameLog = [];
  c.satStats = emptyStats();
  c.twoWayNbaGames = 0;
  c.flags.goalStrengthBase = u.attrs.strength;
  if (u.contract?.kind === 'exhibit10') {
    const rng = rngFor(c.seed, 'camp', L.season);
    const t = L.teams[u.teamId!];
    const worst = t.roster.map((id) => L.players[id]).filter((p) => p && !p.isUser).sort((a, b) => a.ovr - b.ovr)[0];
    if (u.ovr + rng.normal(0, 3) > (worst?.ovr ?? 0)) {
      signUser(c, t.id, { teamId: t.id, salaries: [minSalary(u.yearsPro, L.season)], startSeason: L.season, kind: 'minimum' });
      addNews(c, 'contract', '¡Plaza ganada en el training camp!', `${fullName(u)} supera el corte y firma un contrato NBA con ${teamName(L, t.id)}.`, 'good');
    } else {
      signUser(c, t.id, { teamId: t.id, salaries: [scaled(40_500, L.season)], startSeason: L.season, kind: 'gleague' });
      addNews(c, 'contract', 'Cortado en el training camp', `No hay plaza en el primer equipo. ${fullName(u)} jugará en ${t.gLeagueName}.`, 'bad');
    }
  }
}

export function startRegularSeason(c: Career) {
  c.phase = 'regular';
  addNews(c, 'league', `Arranca la temporada ${seasonLabel(c.league.season)}`, '82 partidos por delante. Cada noche cuenta.', 'neutral');
}

function setOverseasClub(c: Career, name: string, salary: number) {
  const club = findClub(name) ?? EURO_CLUBS[0];
  c.satellite = { comp: 'EUR', teamName: club.name, level: clubLevel(club, 'EUR'), minutes: clubMinutes(club), league: club.league, gamesPlanned: SATELLITES.EUR.games, w: 0, l: 0 };
  c.flags.overseasSalary = salary;
  return club;
}

// ---------------- Pre-draft ----------------

/** Simple flow: the player picks one of the three starting clubs offered after the agency decision. */
export function chooseStartingClub(c: Career, name: string) {
  const p = c.predraft;
  const choice = p?.clubChoices?.find((x) => x.name === name);
  if (!p || p.step !== 'club' || !choice) return;
  const club = findClub(name);
  const comp = choice.comp;
  p.route = comp === 'NCAA' ? 'college' : 'international';
  p.clubName = name;
  p.step = 'season';
  c.flags.youthSalary = startingSalary(comp, club?.tier);
  c.profile.origin = name;
  c.satellite = { comp, teamName: name, level: clubLevel(club, comp), minutes: clubMinutes(club), league: club?.league, gamesPlanned: SATELLITES[comp].games, w: 0, l: 0 };
  addNews(c, 'contract', `${fullName(userOf(c))} firma con ${name}`, `Primera temporada como profesional en ${club?.league ?? SATELLITES[comp].name}.`, 'good');
}

/** Skip the NBA draft and build a career abroad: club offers every summer, league titles to win. */
export function chooseEuroCareer(c: Career) {
  const p = c.predraft!;
  const u = userOf(c);
  leagueOffseason(c.league, c.seed, { draft: true });
  offseasonDevelopment(u, rngFor(c.seed, 'euro-dev', c.league.season), { workEthic: c.workEthic, minutesShare: 0.85, coachRating: 65, trainingBonus: 0.1 });
  c.ovrHistory.push({ season: c.league.season, age: u.age, ovr: u.ovr, pot: u.pot });
  c.flags.euroCareer = 1;
  p.step = 'done';
  c.satellite = null;
  c.satStats = emptyStats();
  c.gameLog = [];
  c.phase = 'offseason';
  c.offers = [];
  buildOffseasonOffers(c);
  addNews(c, 'contract', 'Carrera en el extranjero', `${fullName(u)} renuncia al draft de la NBA para hacer carrera fuera. La puerta de la NBA seguirá abierta si su nivel lo merece.`, 'neutral');
}

export function predraftDecision(c: Career, declare: boolean) {
  const p = c.predraft!;
  const u = userOf(c);
  if (!declare) {
    // Return to college / club for another season.
    leagueOffseason(c.league, c.seed, { draft: true });
    offseasonDevelopment(u, rngFor(c.seed, 'pre-dev', c.league.season), { workEthic: c.workEthic, minutesShare: 0.85, coachRating: 65, trainingBonus: 0.1 });
    c.ovrHistory.push({ season: c.league.season, age: u.age, ovr: u.ovr, pot: u.pot });
    const comp = p.route === 'college' ? 'NCAA' : 'EUR';
    const club = findClub(p.clubName);
    c.satellite = { comp, teamName: p.clubName, level: clubLevel(club, comp), minutes: clubMinutes(club), league: club?.league, gamesPlanned: SATELLITES[comp].games, w: 0, l: 0 };
    c.satStats = emptyStats();
    c.gameLog = [];
    c.seasonOvrStart = u.ovr;
    p.step = 'season';
    addNews(c, 'draft', 'Un año más de formación', `${fullName(u)} decide seguir en ${p.clubName} para mejorar su cotización.`, 'neutral');
    return;
  }
  p.step = 'combine';
  // Build the draft class with the user inside.
  const cls = generateDraftClass(c.seed, c.league.season + 1);
  const stats = c.satStats;
  const gp = Math.max(1, stats.gp);
  const prod = clamp((stats.gmsc / gp - 10) * 0.5, -4, 6);
  p.stockBonus = prod;
  const me: Prospect = { id: 'user', name: fullName(u), nat: u.nat, pos: u.pos, age: u.age, ovr: u.ovr, pot: u.pot, arch: u.arch, isUser: true, value: prospectValue(u.ovr, u.pot, u.age) + prod };
  p.draftClass = [...cls.slice(0, 71), me].sort((a, b) => b.value - a.value);
  addNews(c, 'draft', `${fullName(u)} se declara elegible para el draft`, `Tras promediar ${(stats.pts / gp).toFixed(1)} puntos, el ${u.pos} da el salto. Próximo paso: el Draft Combine.`, 'good');
}

/** Level of the combine tests implied by the prospect projection (OVR 55% + potential 45%). */
export function combineTier(u: Player): MinigameTierId {
  const projected = u.ovr * 0.55 + u.pot * 0.45;
  return projected < 64 ? 'easy' : projected < 72 ? 'normal' : 'hard';
}

export type CombinePlan = 'full' | 'hard' | 'safe' | 'measure' | 'skip';

/** Event-level shape of a combine test: the combine is scored, so the outcomes carry no effects. */
function combineDef(t: CombineTestDef): MinigameDef {
  const def: MinigameDef = {
    kind: t.kind,
    attempts: t.attempts,
    attrs: t.attrs,
    pressure: t.pressure,
    great: t.great,
    ok: t.ok,
    mechanic: t.mechanic,
    outcomes: {
      great: { effects: {}, text: '' },
      ok: { effects: {}, text: '' },
      fail: { effects: {}, text: '' },
    },
  };
  if (t.slots !== undefined) def.slots = t.slots;
  if (t.windowMs !== undefined) def.windowMs = t.windowMs;
  return def;
}

/** Legacy tail of the combine: the user's board value, the mock range and the interview teams. */
function afterCombine(c: Career, rng: Rng) {
  const p = c.predraft!;
  const u = userOf(c);
  const me = p.draftClass!.find((x) => x.isUser)!;
  me.value = prospectValue(u.ovr, u.pot, u.age) + p.stockBonus;
  // Pick interview teams around the projected range.
  const range = mockRange(p.draftClass!, 'user', rng);
  const order = runLotteryPreview(c);
  const teams = order.slice(Math.max(0, range.pickLow - 2), Math.min(order.length, range.pickHigh + 2));
  p.interviewTeams = rng.shuffle([...new Set(teams)]).slice(0, c.mode === 'full' ? 3 : 1);
  p.interviewQuestions = p.interviewTeams.map((teamId, i) => INTERVIEW_QUESTIONS[(i + Math.floor(rng.next() * INTERVIEW_QUESTIONS.length)) % INTERVIEW_QUESTIONS.length]).map((q, i) => ({ teamId: p.interviewTeams[i], question: q.q, answers: q.a }));
  p.step = 'interviews';
}

export function doCombine(c: Career, choice: CombinePlan) {
  const p = c.predraft!;
  const u = userOf(c);
  const rng = rngFor(c.seed, 'combine', c.league.season);
  const a = u.attrs;
  const sprint = +(3.6 - (a.speed + a.accel - 100) * 0.006 + rng.normal(0, 0.05)).toFixed(2);
  const vertical = +(26 + (a.vert - 40) * 0.28 + rng.normal(0, 1.2)).toFixed(1);
  const lane = +(12.4 - (a.accel + a.speed - 100) * 0.012 + rng.normal(0, 0.15)).toFixed(2);
  const shooting = Math.round(clamp(8 + (a.three + a.mid - 100) * 0.18 + rng.normal(0, 2.5), 2, 25));
  const score = (3.4 - sprint) * 20 + (vertical - 30) * 0.5 + (11.6 - lane) * 3 + (shooting - 12) * 0.35;
  const grade = score > 6 ? 'A' : score > 2 ? 'B' : score > -2 ? 'C' : 'D';
  // The legacy score/grade stay computed for reference; the played plans grade the combine in finishCombine.
  void score;
  void grade;
  if (choice === 'measure') {
    p.combine = { sprint: 0, vertical: 0, lane: 0, shooting: 0, grade: 'Solo medidas' };
    p.stockBonus -= 0.3;
    afterCombine(c, rng);
    return;
  }
  if (choice === 'skip') {
    p.combine = { sprint: 0, vertical: 0, lane: 0, shooting: 0, grade: 'No participó' };
    p.stockBonus -= 0.8;
    afterCombine(c, rng);
    return;
  }
  // Played plans: the measurements are taken now and the stock waits for the tests.
  p.combine = { sprint, vertical, lane, shooting, grade: 'Pendiente' };
  p.combinePlan = choice;
  const tier: MinigameTierId = choice === 'hard' ? 'hard' : choice === 'safe' ? 'easy' : combineTier(u);
  const ids = choice === 'safe' ? ['shooting', 'athletic'] : combineTestIds(u.pos);
  p.combineTests = ids.map((id) => {
    const def = COMBINE_TESTS.find((t) => t.id === id)!;
    return { id: def.id, label: def.label, desc: def.desc, weight: def.weight, spec: buildSpec(combineDef(def), u, c, tier) };
  });
  p.step = 'combineTests';
}

/** Legacy score of the measured combine (sprint/vertical/lane/shooting), used as flavour in the tests. */
function measureScoreOf(m: { sprint: number; vertical: number; lane: number; shooting: number }): number {
  return (3.4 - m.sprint) * 20 + (m.vertical - 30) * 0.5 + (11.6 - m.lane) * 3 + (m.shooting - 12) * 0.35;
}

/** Plays (or simulates, when `made` is omitted) the next combine test. The last one closes the combine. */
export function playCombineTest(c: Career, made?: number) {
  const p = c.predraft;
  if (!p || p.step !== 'combineTests' || !p.combineTests) return;
  const t = p.combineTests.find((x) => x.made === undefined);
  if (!t) return;
  const attempts = t.spec.attempts;
  t.made = made === undefined
    ? rngFor(c.seed, 'combine-test', c.league.season, t.id).binomial(attempts, t.spec.autoProb)
    : clamp(Math.round(made), 0, attempts);
  if (p.combineTests.every((x) => x.made !== undefined)) finishCombine(c);
}

/** Turns the played tests into stock, board value, grade and interview teams. */
export function finishCombine(c: Career) {
  const p = c.predraft;
  if (!p?.combineTests?.length) return;
  if (p.combineTests.some((t) => t.made === undefined)) return;
  const u = userOf(c);
  const tests = p.combineTests;
  const W = tests.reduce((s, t) => s + t.weight, 0);
  const thirdId = combineTestIds(u.pos)[2];
  const third = COMBINE_TESTS.find((t) => t.id === thirdId);
  const WALL = 1.5 + 1.2 + (third?.weight ?? 1.0);
  const q = W > 0 ? tests.reduce((s, t) => s + ((t.made ?? 0) / t.spec.attempts) * t.weight, 0) / W : 0;
  const coverage = WALL > 0 ? W / WALL : 0;
  const tier = tests[0].spec.tier ?? 'normal';
  const tierMul = tier === 'easy' ? 0.85 : tier === 'hard' ? 1.2 : 1;
  const flavor = p.combine ? clamp(measureScoreOf(p.combine) * 0.1, -0.5, 0.8) : 0;
  const bonus = (q * 1.45 - 0.55) * tierMul * coverage * 2.2 + flavor;
  p.stockBonus += bonus;
  const grade = bonus > 2 ? 'A' : bonus > 0.5 ? 'B' : bonus > -1 ? 'C' : 'D';
  p.combineResult = { grade, bonus, detail: `${Math.round(q * 100)}% de acierto · cobertura ${Math.round(coverage * 100)}%` };
  if (p.combine) p.combine.grade = grade;
  const me = p.draftClass!.find((x) => x.isUser)!;
  me.value = prospectValue(u.ovr, u.pot, u.age) + p.stockBonus;
  afterCombine(c, rngFor(c.seed, 'combine-after', c.league.season));
}

/** Order of the draft before the lottery (worst records first), used for projections. */
function runLotteryPreview(c: Career): string[] {
  const teams = Object.values(c.league.teams).sort((a, b) => a.w / Math.max(1, a.w + a.l) - b.w / Math.max(1, b.w + b.l));
  return [...teams, ...teams].map((t) => t.id);
}

const INTERVIEW_QUESTIONS = [
  { q: '¿Qué harías si te tocara salir desde el banquillo en tu primer año?', a: ['Aceptarlo y ganarme los minutos entrenando.', 'Pedir explicaciones al entrenador.', 'Me vería como titular desde el primer día.'] },
  { q: '¿Cuál es tu mayor debilidad en la pista?', a: ['Mi defensa en el uno contra uno, y ya trabajo en ella.', 'No tengo debilidades importantes.', 'Prefiero no centrarme en lo negativo.'] },
  { q: '¿Por qué deberíamos elegirte por delante de otros prospectos?', a: ['Porque mejoraré cada año y encajo en vuestro sistema.', 'Porque soy el mejor de esta clase.', 'Porque vendo camisetas.'] },
  { q: 'Cuéntanos un momento difícil y cómo lo superaste.', a: ['Una lesión en el instituto; aprendí a ser paciente.', 'Nunca he tenido momentos difíciles.', 'Prefiero no hablar de eso.'] },
  { q: '¿Cómo te ves dentro de cinco años?', a: ['Como una pieza clave de un equipo ganador.', 'Como MVP de la liga.', 'Ganando mucho dinero.'] },
];

export function answerInterview(c: Career, index: number, answer: number) {
  const p = c.predraft!;
  const q = p.interviewQuestions![index];
  const rng = rngFor(c.seed, 'interview', index, answer);
  const base = answer === 0 ? 1.6 : answer === 1 ? (c.reputation > 40 ? 0.8 : -0.6) : -1.5;
  const val = base + rng.normal(0, 0.6);
  const result = val > 0.8 ? 'good' : val > -0.4 ? 'neutral' : 'bad';
  p.interviews.push({ teamId: q.teamId, result, answer });
  p.userBoosts[q.teamId] = result === 'good' ? 3 : result === 'bad' ? -3 : 0;
  if (p.interviews.length >= p.interviewQuestions!.length) {
    const range = mockRange(p.draftClass!, 'user', rngFor(c.seed, 'mock', c.league.season));
    p.mock = { pickLow: range.pickLow, pickHigh: range.pickHigh, text: mockText(range.pickLow, range.pickHigh) };
    p.step = 'mock';
  }
}

function mockText(lo: number, hi: number) {
  if (hi <= 5) return 'Los analistas te sitúan entre los primeros cinco picks: candidato a número uno.';
  if (hi <= 14) return 'Proyección de lotería. Varias franquicias en reconstrucción te tienen en su lista.';
  if (lo <= 30) return 'Proyección de primera ronda media o baja, con riesgo de caer a la segunda.';
  if (lo <= 60) return 'Proyección de segunda ronda. Tus entrevistas y el combine pueden marcar la diferencia.';
  return 'Riesgo serio de no ser elegido. Prepara un plan alternativo.';
}

export function revealLottery(c: Career) {
  const p = c.predraft!;
  const { order, moves } = runLottery(c.league, c.seed);
  p.order = order;
  p.lottery = moves;
  p.step = 'lottery';
}

export function runUserDraft(c: Career) {
  const p = c.predraft!;
  const L = c.league;
  const u = userOf(c);
  const cls = p.draftClass!;
  // Team-specific interview boosts are applied through each team's board.
  const picks: { pick: number; teamId: string; prospectId: string }[] = [];
  const available = [...cls];
  for (let i = 0; i < RULES.roundSize * RULES.rounds && available.length; i++) {
    const teamId = p.order![i];
    const single = simulateDraft(L, c.seed + i, [teamId], available, p.userBoosts[teamId] ?? 0)[0];
    picks.push({ pick: i + 1, teamId, prospectId: single.prospectId });
    available.splice(available.findIndex((x) => x.id === single.prospectId), 1);
  }
  p.picks = picks;
  const mine = picks.find((x) => x.prospectId === 'user');
  p.userPick = mine ? { pick: mine.pick, round: mine.pick <= RULES.roundSize ? 1 : 2, teamId: mine.teamId } : null;
  for (const pk of picks) {
    if (pk.prospectId === 'user') continue;
    addDrafted(L, c.seed, cls.find((x) => x.id === pk.prospectId)!, pk.teamId, pk.pick);
  }
  p.step = 'draft';
  // Advance the league to the new season (draft already done above).
  leagueOffseason(L, c.seed, { draft: false });
  offseasonDevelopment(u, rngFor(c.seed, 'draft-dev', L.season), { workEthic: c.workEthic, minutesShare: 0.8, coachRating: 65, trainingBonus: 0.05 });
  c.ovrHistory.push({ season: L.season, age: u.age, ovr: u.ovr, pot: u.pot });
  c.satellite = null;
  c.satStats = emptyStats();
  c.gameLog = [];
  if (mine) {
    u.draft = { season: L.season, round: p.userPick!.round, pick: p.userPick!.round === 1 ? mine.pick : mine.pick - RULES.roundSize, teamId: mine.teamId };
    c.reputation = clamp(c.reputation + (mine.pick <= 5 ? 20 : mine.pick <= 14 ? 12 : mine.pick <= 30 ? 6 : 2), 0, 100);
    c.fame = clamp(c.fame + (mine.pick <= 5 ? 20 : mine.pick <= 14 ? 10 : 4), 0, 100);
    addNews(c, 'draft', `${fullName(u)}, elegido con el pick ${mine.pick}`, `${teamName(L, mine.teamId)} apuesta por el ${u.pos} de ${p.clubName}${mine.pick <= RULES.roundSize ? ' en primera ronda' : ' en segunda ronda'}.`, 'good');
  } else {
    c.flags.undrafted = 1;
    addNews(c, 'draft', 'Sin llamada en el draft', `Ninguna franquicia eligió a ${fullName(u)}. Toca buscar otra vía.`, 'bad');
  }
  c.phase = 'signing';
  buildSigningOffers(c);
}

export function buildSigningOffers(c: Career) {
  const L = c.league;
  const u = userOf(c);
  const p = c.predraft!;
  c.offers = [];
  if (p.route === 'drafted' && !p.userPick) {
    // Quick start: choose a draft slot by tier and a fitting team.
    const rng = rngFor(c.seed, 'quick-draft');
    const tier = c.flags.tierLottery ? 'lottery' : c.flags.tierSecond ? 'second' : 'first';
    const pick = tier === 'lottery' ? rng.int(1, 14) : tier === 'first' ? rng.int(15, 30) : rng.int(31, 58);
    const teams = Object.values(L.teams).filter((t) => (tier === 'lottery' ? t.status === 'rebuild' || t.status === 'middle' : true));
    const team = rng.pick(teams);
    p.userPick = { pick, round: pick <= 30 ? 1 : 2, teamId: team.id };
    u.draft = { season: L.season, round: pick <= 30 ? 1 : 2, pick: pick <= 30 ? pick : pick - 30, teamId: team.id };
    addNews(c, 'draft', `Elegido con el pick ${pick}`, `${teamName(L, team.id)} selecciona a ${fullName(u)}.`, 'good');
  }
  const pk = p.userPick;
  if (pk && pk.round === 1) {
    const sal = Math.round(rookieScale(pk.pick, L.season) * 1.2);
    c.offers.push({ id: 'rookie-scale', teamId: pk.teamId, kind: 'rookie', years: 4, salary: sal, raise: 0.045, option: 'team', role: projectedRole(L, pk.teamId, u), note: 'Escala de novato de primera ronda al 120% (aproximada): 2 años garantizados + 2 opciones de equipo.' });
  } else if (pk && pk.round === 2) {
    c.offers.push({ id: 'second-std', teamId: pk.teamId, kind: 'minimum', years: 2, salary: minSalary(0, L.season), raise: 0.04, role: projectedRole(L, pk.teamId, u), note: 'Contrato estándar de segunda ronda (mínimo, 2 años).' });
    c.offers.push({ id: 'second-tw', teamId: pk.teamId, kind: 'two-way', years: 2, salary: scaled(RULES.twoWaySalary, L.season), raise: 0, role: 'G League + hasta 50 partidos NBA', note: 'Two-way: más minutos en la G League, menos dinero.' });
  } else {
    c.offers.push(...fallbackOffers(c));
  }
}

// ---------------- Retirement ----------------

export function retire(c: Career, reason: string) {
  const u = userOf(c);
  c.phase = 'retired';
  const score = legacyScore(c);
  const prob = hofProbability(score);
  const counts = awardCounts(c);
  const peak = Math.max(...c.ovrHistory.map((o) => o.ovr));
  const r: RetirementSummary = {
    age: u.age,
    season: c.league.season,
    reason,
    legacyScore: score,
    hofProbability: prob,
    hofVerdict: hofVerdict(prob),
    peakOvr: peak,
    bestTeam: c.bestTeamPeak ? teamName(c.league, c.bestTeamPeak.teamId) : (c.seasons[0]?.teamName ?? '—'),
    totals: careerTotals(c),
    playoffTotals: playoffTotals(c),
    titles: counts.champion ?? 0,
    awards: counts,
    earnings: c.earnings,
    tier: legacyTier(score),
  };
  c.retirement = r;
  if (u.teamId && c.league.teams[u.teamId]) c.league.teams[u.teamId].roster = c.league.teams[u.teamId].roster.filter((id) => id !== u.id);
  addNews(c, 'milestone', `${fullName(u)} anuncia su retirada`, `${reason} Legacy Score: ${score}. ${r.tier}.`, 'neutral');
  achievementsCheck(c);
}

export const offersSorted = (offers: Offer[]) => [...offers].sort((a, b) => b.salary - a.salary);
