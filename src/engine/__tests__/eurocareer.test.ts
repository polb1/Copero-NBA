import * as api from '../api';
import { baseInput } from './autopilot';
import { findClub } from '../../data/clubs';
import { COUNTRIES } from '../../content/names';
import { userOf } from '../career';
import { rngFor } from '../rng';
import { startingClubs } from '../clubpick';

describe('starting clubs and European career', () => {
  test('every country of the world is selectable and always gets 3 clubs', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(195);
    for (const ct of COUNTRIES) {
      const picks = startingClubs(ct.code, rngFor(1, ct.code));
      expect(picks.length).toBe(3);
      expect(new Set(picks.map((p) => p.club.name)).size).toBe(3);
    }
  });

  test('a Spanish player is offered three Spanish clubs after choosing an agent', () => {
    const c = api.newCareer(baseInput({ nat: 'ESP', origin: '', route: 'international' }), 21);
    expect(c.pendingEvent?.defId).toBe('predraft-agent');
    expect(c.predraft?.step).toBe('club');
    const choices = c.predraft!.clubChoices!;
    expect(choices.length).toBe(3);
    for (const ch of choices) expect(findClub(ch.name)?.country).toBe('ESP');
    api.chooseOption(c, 0);
    api.dismissEvent(c);
    api.runUntilDecision(c); // must not move before a club is chosen
    expect(c.predraft?.step).toBe('club');
    api.chooseStartingClub(c, choices[1].name);
    expect(c.satellite?.teamName).toBe(choices[1].name);
    expect(c.predraft?.step).toBe('season');
  });

  test('Americans get three NCAA programs', () => {
    const c = api.newCareer(baseInput({ nat: 'USA', origin: '', route: 'international' }), 22);
    expect(c.predraft!.clubChoices!.every((x) => x.comp === 'NCAA')).toBe(true);
  });

  test('a full European career runs to retirement without the NBA', () => {
    const c = api.newCareer(baseInput({ nat: 'ESP', origin: '', route: 'international', mode: 'quick' }), 23);
    api.chooseOption(c, 0);
    api.dismissEvent(c);
    api.chooseStartingClub(c, c.predraft!.clubChoices![0].name);
    let guard = 0;
    while (c.phase !== 'retired' && guard++ < 3000) {
      if (c.pendingEvent) { api.chooseOption(c, c.pendingEvent.options.findIndex((_, i) => api.canAfford(c, i))); api.dismissEvent(c); continue; }
      if (c.phase === 'predraft' && c.predraft?.step === 'decision') { api.chooseEuroCareer(c); continue; }
      if (c.phase === 'season-end') { api.beginOffseason(c); }
      if (c.phase === 'offseason') {
        if (userOf(c).age >= 34) { api.retire(c, 'test'); break; }
        const euro = c.offers.find((o) => o.kind === 'overseas');
        if (euro) api.acceptOffer(c, euro.id);
        else if (api.needsContract(c) && !c.satellite) { api.retire(c, 'sin ofertas'); break; }
      }
      api.runUntilDecision(c);
    }
    expect(c.phase).toBe('retired');
    const abroad = c.seasons.filter((s) => s.comp === 'EUR');
    expect(abroad.length).toBeGreaterThanOrEqual(12);
    expect(c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp > 0).length).toBe(0);
    for (const s of abroad) expect(findClub(s.teamName)).toBeDefined();
    expect(c.retirement!.legacyScore).toBeGreaterThan(0);
  }, 180000);
});
