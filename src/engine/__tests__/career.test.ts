import { newCareer } from '../api';
import { autopilot, baseInput } from './autopilot';
import { userOf } from '../career';



describe('full career autopilot', () => {
  for (const route of ['college', 'international', 'alternative', 'drafted'] as const) {
    test(`route ${route} reaches retirement`, () => {
      const c = newCareer(baseInput({ route }), 4242);
      const steps = autopilot(c, { maxAge: 31 });
      expect(steps).toBeLessThan(5000);
      expect(c.phase).toBe('retired');
      expect(c.retirement).not.toBeNull();
      expect(c.seasons.length).toBeGreaterThan(3);
      const u = userOf(c);
      for (const s of c.seasons) {
        expect(s.stats.fgm).toBeLessThanOrEqual(s.stats.fga);
        expect(s.stats.pts).toBe(2 * (s.stats.fgm - s.stats.tpm) + s.stats.tpm * 3 + s.stats.ftm);
      }
      expect(u.age).toBeGreaterThanOrEqual(31);
    }, 120000);
  }

  test('same seed and same choices give the same career', () => {
    const a = newCareer(baseInput({ mode: 'daily' }), 99);
    const b = newCareer(baseInput({ mode: 'daily' }), 99);
    autopilot(a, { maxAge: 25 });
    autopilot(b, { maxAge: 25 });
    expect(a.retirement!.legacyScore).toBe(b.retirement!.legacyScore);
    expect(JSON.stringify(a.seasons)).toBe(JSON.stringify(b.seasons));
  }, 120000);

  test('different choices change the outcome', () => {
    const a = newCareer(baseInput({ mode: 'full' }), 99);
    const b = newCareer(baseInput({ mode: 'full' }), 99);
    autopilot(a, { maxAge: 24, pick: () => 0 });
    autopilot(b, { maxAge: 24, pick: (n) => n - 1 });
    expect(JSON.stringify(a.seasons)).not.toBe(JSON.stringify(b.seasons));
  }, 120000);
});
