import { newCareer } from '../api';
import { autopilot, baseInput } from './autopilot';

test('a veteran who stops playing retires instead of sitting out season after season', () => {
  for (const seed of [11, 4242, 90210]) {
    const c = newCareer(baseInput({ route: 'drafted' }), seed);
    // Never retires voluntarily: only the automatic rule (or the age limit) can end it.
    autopilot(c, { maxAge: 99 });
    expect(c.phase).toBe('retired');
    const byYear = new Map<number, { age: number; gp: number }>();
    for (const s of c.seasons) byYear.set(s.season, { age: s.age, gp: (byYear.get(s.season)?.gp ?? 0) + s.stats.gp });
    let idleRun = 0;
    for (const y of [...byYear.values()]) {
      idleRun = y.gp < 5 && y.age >= 30 ? idleRun + 1 : 0;
      expect(idleRun).toBeLessThanOrEqual(2);
    }
  }
}, 240000);
