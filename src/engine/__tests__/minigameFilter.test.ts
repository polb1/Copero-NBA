import { createCareer, userOf } from '../career';
import { eligibleEvents, EventContext } from '../events';
import { POSITIONS } from '../types';
import { baseInput } from './autopilot';

test('a position-themed minigame is only offered to its positions, and each position has its signature', () => {
  const c = createCareer(baseInput({ pos: 'PG' }), 42);
  c.phase = 'regular';
  c.assignment = 'NBA';
  c.fame = 50;
  c.league.day = 0;
  const u = userOf(c);
  u.ovr = 80;
  u.teamId = Object.keys(c.league.teams)[0];
  if (!c.league.teams[u.teamId].roster.includes(u.id)) c.league.teams[u.teamId].roster.push(u.id);

  const signature: Record<string, string> = {
    PG: 'mg-pass', SG: 'mg-spotlight', SF: 'mg-dunk', PF: 'mg-boards', C: 'mg-close',
  };

  for (const pos of POSITIONS) {
    u.pos = pos;
    const ctx: EventContext = {
      career: c,
      user: u,
      team: null,
      role: 'rotation',
      absDay: 0,
    };
    const events = eligibleEvents(ctx);
    expect(events.some((e) => e.id === signature[pos])).toBe(true);
    for (const ev of events) {
      if (!ev.minigame?.positions) continue;
      expect(ev.minigame.positions).toContain(pos);
    }
  }
});