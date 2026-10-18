import * as api from '../api';
import { baseInput } from './autopilot';
import { EURO_CLUBS, G_LEAGUE, NCAA_PROGRAMS, clubLevel, clubMinutes, findClub, opponentsFor } from '../../data/clubs';
import { fallbackOffers } from '../market';
import { userOf } from '../career';

describe('real clubs', () => {
  test('database is consistent', () => {
    expect(EURO_CLUBS.length).toBeGreaterThanOrEqual(45);
    expect(NCAA_PROGRAMS.length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(G_LEAGUE).length).toBe(30);
    const names = [...EURO_CLUBS, ...NCAA_PROGRAMS].map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('big clubs are stronger but give fewer minutes', () => {
    const big = findClub('Real Madrid');
    const small = findClub('Río Breogán');
    expect(clubLevel(big, 'EUR')).toBeGreaterThan(clubLevel(small, 'EUR'));
    expect(clubMinutes(big)).toBeLessThan(clubMinutes(small));
  });

  test('the chosen club is used for the pre-draft season and opponents are real', () => {
    const c = api.newCareer(baseInput({ route: 'international', origin: 'Partizan' }), 11);
    expect(c.satellite?.teamName).toBe('Partizan');
    expect(c.satellite?.league).toBe('Liga ABA');
    const opp = opponentsFor('EUR', 'Partizan');
    expect(opp[0]).not.toBe('Partizan');
    expect(EURO_CLUBS.find((x) => x.name === opp[0])?.league).toBe('Liga ABA');
    for (let i = 0; i < 20 && !c.gameLog.some((g) => g.comp === 'EUR'); i++) {
      if (c.pendingEvent) { api.chooseOption(c, 0); api.dismissEvent(c); }
      api.runUntilDecision(c);
    }
    const game = c.gameLog.find((g) => g.comp === 'EUR');
    expect(game && EURO_CLUBS.some((x) => x.name === game.oppName)).toBe(true);
  }, 60000);

  test('overseas offers come from real clubs and are honoured on signing', () => {
    const c = api.newCareer(baseInput({ route: 'alternative' }), 5);
    const offers = fallbackOffers(c).filter((o) => o.kind === 'overseas');
    expect(offers.length).toBe(2);
    for (const o of offers) expect(findClub(o.club!)).toBeDefined();
    c.offers = offers;
    api.acceptOffer(c, offers[0].id);
    expect(c.satellite?.teamName).toBe(offers[0].club);
    expect(userOf(c).teamId).toBeNull();
  });
});
