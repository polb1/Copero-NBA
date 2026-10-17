import { createLeague } from '../league';
import { playRegularDay } from '../season';

test('fatigue stays bounded over a long stretch of games', () => {
  const L = createLeague(31, 2026);
  for (let i = 0; i < 90; i++) playRegularDay(L, 31, {});
  const ps = Object.values(L.players).filter((p) => p.teamId && p.season.gp > 30);
  const avg = ps.reduce((s, p) => s + p.fatigue, 0) / ps.length;
  expect(avg).toBeLessThan(25);
  expect(ps.filter((p) => p.fatigue > 60).length).toBeLessThan(5);
});
