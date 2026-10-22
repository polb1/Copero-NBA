import { newCareer } from './api';
import { baseInput } from './__tests__/autopilot';
import { userOf } from './career';
import { emptyStats } from './players';
import { buildOffseasonOffers, acceptOffer } from './offseason';
import { generateFAOffers } from './market';
import { evaluateStanding, financialFallout } from './standing';
import { rosterCount } from './contracts';
import { RULES } from './config';
import type { Career, SeasonRecord, Team } from './types';

/** A full-mode career already signed with an NBA team. */
function signedFullCareer(seed: number): Career {
  const c = newCareer(baseInput({ route: 'drafted', mode: 'full' }), seed);
  c.pendingEvent = null;
  if (c.phase === 'signing' && c.offers.length) acceptOffer(c, c.offers[0].id);
  return c;
}

/** Pushes a fake NBA season record for the user with the given workload and production. */
function pushSeason(c: Career, over: { gp: number; min: number; gmsc: number }) {
  const u = userOf(c);
  const rec: SeasonRecord = {
    season: c.league.season,
    age: u.age,
    comp: 'NBA',
    teamId: u.teamId,
    teamName: 'Test Team',
    stats: { ...emptyStats(), ...over },
    playoffs: null,
    ovrStart: u.ovr,
    ovrEnd: u.ovr,
    pot: u.pot,
    salary: 0,
    teamRecord: '0-0',
    result: '',
    awards: [],
    role: 'Banquillo',
  };
  c.seasons.push(rec);
  return rec;
}

describe('standing: a season below expectations', () => {
  test('a low showing on a contender earns a strike and a move to a smaller market', () => {
    const c = signedFullCareer(7701);
    const u = userOf(c);
    u.ovr = 66;
    const team = c.league.teams[u.teamId!];
    team.status = 'contender';
    pushSeason(c, { gp: 40, min: 40 * 8, gmsc: 40 * 3 });
    const res = evaluateStanding(c, c.league.season);
    expect(res.under).toBe(true);
    expect(res.strikes).toBe(1);
    expect(res.action).toBe('demoted');
    expect(c.flags.demoted).toBe(1);
    expect(u.teamId).not.toBe(team.id);
  });

  test('all 30 real rosters leave room: capacity never blocks a demotion the reputation allows', () => {
    const c = signedFullCareer(7701);
    const teams = Object.values(c.league.teams);
    expect(teams).toHaveLength(30);
    const minRep = Math.min(...teams.map((t) => t.reputation));
    const candidatesOf = (cur: Team) =>
      teams.filter((t) => t.id !== cur.id && t.reputation < cur.reputation - 3 && t.status !== 'contender');
    let withDestination = 0;
    for (const cur of teams) {
      // Real rosters hold 15-16 players (two-ways included), but the guaranteed-contract count fits.
      expect(rosterCount(cur, c.league)).toBeLessThanOrEqual(RULES.rosterMax);
      const eligible = candidatesOf(cur);
      // The capacity gate excludes no real roster: every reputation-eligible team is also a room-eligible destination.
      expect(eligible.every((t) => rosterCount(t, c.league) <= RULES.rosterMax)).toBe(true);
      if (eligible.length > 0) withDestination += 1;
      else expect(cur.reputation).toBeLessThanOrEqual(minRep + 3); // nobody sits 4 below the reputation floor
    }
    // The reputation spread makes demotion real: most of the league has a smaller market to fall to.
    expect(withDestination).toBeGreaterThanOrEqual(20);
  });

  test('a third strike at a low rating cuts the player loose', () => {
    const c = signedFullCareer(7702);
    const u = userOf(c);
    u.ovr = 64;
    c.league.teams[u.teamId!].status = 'middle';
    c.flags.underStrikes = 2;
    pushSeason(c, { gp: 40, min: 40 * 8, gmsc: 40 * 3 });
    const res = evaluateStanding(c, c.league.season);
    expect(res.action).toBe('cut');
    expect(res.strikes).toBe(3);
    expect(u.teamId).toBeNull();
    expect(u.contract).toBeNull();
    expect(c.flags.cut).toBe(1);
  });

  test('a good season pays off one strike and keeps the team', () => {
    const c = signedFullCareer(7703);
    const u = userOf(c);
    u.ovr = 80;
    c.flags.underStrikes = 2;
    const before = u.teamId;
    pushSeason(c, { gp: 40, min: 40 * 30, gmsc: 40 * 15 });
    const res = evaluateStanding(c, c.league.season);
    expect(res.under).toBe(false);
    expect(res.action).toBe('none');
    expect(c.flags.underStrikes).toBe(1);
    expect(u.teamId).toBe(before);
  });

  test('a cut player gets an offer outside the NBA in the offseason, with unique offer ids', () => {
    const c = signedFullCareer(7704);
    const u = userOf(c);
    if (u.teamId && c.league.teams[u.teamId]) c.league.teams[u.teamId].roster = c.league.teams[u.teamId].roster.filter((id) => id !== u.id);
    u.teamId = null;
    u.contract = null;
    c.flags.cut = 1;
    c.offers = [];
    c.phase = 'offseason';
    buildOffseasonOffers(c);
    expect(c.offers.some((o) => o.kind === 'overseas')).toBe(true);
    const ids = c.offers.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the free-agency market survives the cut flag without throwing', () => {
    const c = signedFullCareer(7705);
    c.flags.cut = 1;
    const offers = generateFAOffers(c);
    expect(Array.isArray(offers)).toBe(true);
  });

  test('a bankrupt low-rated player is cut and gets an offer outside the NBA', () => {
    const c = signedFullCareer(7706);
    const u = userOf(c);
    u.ovr = 65;
    c.finance!.ruined = true;
    c.finance!.bankruptcies = 1;
    const res = financialFallout(c, c.league.season);
    expect(res).toBe('cut');
    expect(u.teamId).toBeNull();
    expect(c.flags.financialCut).toBe(1);
    c.phase = 'offseason';
    c.offers = [];
    buildOffseasonOffers(c);
    expect(c.offers.some((o) => o.kind === 'overseas')).toBe(true);
  });
});
