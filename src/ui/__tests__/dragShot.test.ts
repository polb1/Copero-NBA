/** @vitest-environment node */
import { resolveDragShot } from '../minigames/DragShotGame';

describe('resolveDragShot', () => {
  const spec = { kind: 'threes' as const, zone: 30 };
  // Attempt 0: ball (12,62) → rim (72,36).
  const optimal = -23.43;
  const idealPower = 0.654;

  it('accepts the perfect angle and power', () => {
    expect(resolveDragShot(0, optimal, idealPower, spec)).toBe(true);
  });

  it('accepts small mistakes inside the new tolerance', () => {
    expect(resolveDragShot(0, optimal + 3, idealPower + 0.05, spec)).toBe(true);
  });

  it('rejects shots the old, looser tolerance used to allow', () => {
    expect(resolveDragShot(0, optimal + 10, idealPower, spec)).toBe(false);
    expect(resolveDragShot(0, optimal, idealPower + 0.12, spec)).toBe(false);
  });

  it('rejects a wild angle or a powerless release', () => {
    expect(resolveDragShot(0, 0, idealPower, spec)).toBe(false);
    expect(resolveDragShot(0, optimal, 0, spec)).toBe(false);
  });

  it('is deterministic for the same inputs', () => {
    for (let i = 0; i < 20; i++) {
      expect(resolveDragShot(3, -20, 0.6, spec)).toBe(resolveDragShot(3, -20, 0.6, spec));
    }
  });
});
