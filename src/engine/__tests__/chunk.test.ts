import * as api from '../api';
import { baseInput } from './autopilot';

test('chunked simulation gives exactly the same career as running to the decision at once', () => {
  const a = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 2027);
  const b = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 2027);
  for (const c of [a, b]) api.acceptOffer(c, c.offers[0].id);
  for (let season = 0; season < 3; season++) {
    for (let guard = 0; guard < 50 && a.phase !== 'season-end'; guard++) {
      api.runUntilDecision(a);
      if (a.pendingEvent) { api.chooseOption(a, 0); api.dismissEvent(a); }
    }
    for (let guard = 0; guard < 500 && b.phase !== 'season-end'; guard++) {
      while (!api.runChunk(b));
      if (b.pendingEvent) { api.chooseOption(b, 0); api.dismissEvent(b); }
    }
    expect(JSON.stringify(b.seasons)).toBe(JSON.stringify(a.seasons));
    for (const c of [a, b]) { api.beginOffseason(c); c.offers = []; }
  }
}, 120000);
