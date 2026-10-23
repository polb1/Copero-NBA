import { newCareer } from '../api';
import { userOf } from '../career';
import { championOf } from '../league';
import { teamInterest } from '../market';
import { rngFor } from '../rng';
import { baseInput } from './autopilot';

test('the reigning champion gets a market boost', () => {
  const c = newCareer(baseInput({ route: 'drafted' }), 42);
  const u = userOf(c);
  const id = Object.keys(c.league.teams)[0];
  const before = teamInterest(c.league, id, u, c, rngFor(1, 'champ-test'));
  c.league.champions = [{ season: c.league.season, team: id, runnerUp: Object.keys(c.league.teams)[1] }];
  const after = teamInterest(c.league, id, u, c, rngFor(1, 'champ-test'));
  expect(championOf(c.league)?.team).toBe(id);
  expect(after).toBeGreaterThan(before);
});