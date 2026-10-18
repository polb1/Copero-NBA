import type { Career } from '../types';
import * as api from '../api';
import type { NewCareerInput } from '../api';
import { goalOptions } from '../goals';
import { userOf } from '../career';

/** Plays a career automatically with deterministic choices. Used by tests. */
export function autopilot(c: Career, opts: { pick?: (n: number, i: number) => number; maxAge?: number } = {}) {
  const pick = opts.pick ?? (() => 0);
  let guard = 0;
  let i = 0;
  while (c.phase !== 'retired' && guard++ < 5000) {
    if (c.pendingEvent) {
      if (c.pendingEvent.resolved) api.dismissEvent(c);
      else api.chooseOption(c, pick(c.pendingEvent.options.length, i++) % c.pendingEvent.options.length);
      continue;
    }
    const u = userOf(c);
    switch (c.phase) {
      case 'predraft': {
        const p = c.predraft!;
        if (p.step === 'club') api.chooseStartingClub(c, p.clubChoices![pick(p.clubChoices!.length, i++) % p.clubChoices!.length].name);
        else if (p.step === 'season') api.advance(c, 'season');
        else if (p.step === 'decision') api.predraftDecision(c, true);
        else if (p.step === 'combine') api.doCombine(c, 'full');
        else if (p.step === 'interviews') api.answerInterview(c, p.interviews.length, 0);
        else if (p.step === 'mock') api.revealLottery(c);
        else if (p.step === 'lottery') api.runUserDraft(c);
        break;
      }
      case 'signing':
        if (c.offers.length) api.acceptOffer(c, c.offers[0].id);
        else api.retire(c, 'Sin ofertas');
        break;
      case 'preseason':
        api.setGoals(c, goalOptions(c, u).slice(0, 2).map((g) => g.id));
        api.startRegularSeason(c);
        break;
      case 'regular':
      case 'postseason':
        api.advance(c, 'season');
        break;
      case 'season-end':
        api.beginOffseason(c);
        break;
      case 'offseason':
        if (u.age >= (opts.maxAge ?? 36)) api.retire(c, 'Retirada voluntaria');
        else if (api.needsContract(c)) {
          if (c.offers.length) api.acceptOffer(c, c.offers[0].id);
          else api.retire(c, 'Sin ofertas');
        } else {
          if (c.offers.length && c.offers[0].id === 'opt-player') api.acceptOffer(c, 'opt-player');
          api.startPreseason(c);
        }
        break;
    }
  }
  return guard;
}

export const baseInput = (over: Partial<NewCareerInput> = {}): NewCareerInput => ({
  first: 'Test', last: 'Player', jersey: 'PLAYER', number: 7, nat: 'ESP', birthplace: 'Madrid', age: 19, height: 198, weight: 95,
  hand: 'R', pos: 'SF', arch: 'twoWay', origin: 'Duke', bio: '', route: 'college', mode: 'quick', talent: 'balanced', focus: { shooting: 3, defense: 3 },
  look: { skin: 2, hair: 1, accent: '#ff6b1a' }, ...over,
});
