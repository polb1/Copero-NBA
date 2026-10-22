/** @vitest-environment node */
import { resolveDragShot } from '../minigames/DragShotGame';

describe('resolveDragShot', () => {
  const spec = { kind: 'threes' as const, zone: 30 };

  it('accepts the perfect angle and power', () => {
    // Ball (18,72) → rim (72,36): optimal angle and ideal power.
    expect(resolveDragShot(0, -33.7, 0.75, spec)).toBe(true);
  });

  it('rejects a wild angle or a powerless release', () => {
    expect(resolveDragShot(0, 0, 0.75, spec)).toBe(false);
    expect(resolveDragShot(0, -33.7, 0, spec)).toBe(false);
  });

  it('is deterministic for the same inputs', () => {
    for (let i = 0; i < 20; i++) {
      expect(resolveDragShot(3, -20, 0.6, spec)).toBe(resolveDragShot(3, -20, 0.6, spec));
    }
  });
});
