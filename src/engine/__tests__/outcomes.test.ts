import { newCareer } from '../api';
import { autopilot, baseInput } from './autopilot';

test('career outcomes are varied, not always legendary', () => {
  const tiers: Record<string, number> = {};
  const scores: number[] = [];
  const routes = ['college', 'international', 'alternative', 'drafted'] as const;
  for (let i = 0; i < 12; i++) {
    const c = newCareer(baseInput({ route: routes[i % 4], mode: 'quick', talent: (['raw', 'balanced', 'ready'] as const)[i % 3], draftedTier: (['lottery', 'first', 'second'] as const)[i % 3] }), 1000 + i * 77);
    autopilot(c, { maxAge: 33, pick: (n, k) => (k * 5 + i) % n });
    scores.push(c.retirement!.legacyScore);
    tiers[c.retirement!.tier] = (tiers[c.retirement!.tier] ?? 0) + 1;
  }
  console.log(scores.join(' '), tiers);
  expect(Object.keys(tiers).length).toBeGreaterThanOrEqual(3);
  expect(scores.filter((s) => s >= 420).length).toBeLessThan(6);
}, 300000);
