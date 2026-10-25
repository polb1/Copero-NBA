/** @vitest-environment node */
import { resolveDragShot as resolveFromGame } from '../minigames/DragShotGame';
import {
  MAX_PULL,
  MIN_PULL,
  aimFromDrag,
  dragGeometry,
  resolveDragShot,
  type ShotGeometry,
} from '../minigames/dragShot';

const spec = { kind: 'threes' as const, zone: 30 };

/** Drag end-point that produces exactly `power` along `angleDeg` for a geometry. */
const pointerFor = (g: ShotGeometry, angleDeg: number, power: number): { x: number; y: number } => {
  const rad = (angleDeg * Math.PI) / 180;
  const len = power * MAX_PULL;
  return {
    x: g.origin.x - Math.cos(rad) * len * 100,
    y: g.origin.y - (Math.sin(rad) * len * 100) / g.aspect,
  };
};

describe('DragShotGame re-export', () => {
  it('exposes the same pure resolver as dragShot.ts', () => {
    expect(resolveFromGame).toBe(resolveDragShot);
  });
});

describe('resolveDragShot pointer contract', () => {
  const g = dragGeometry(0, spec, 1);

  it('does not score when the pointer ends on the rim', () => {
    expect(resolveDragShot(0, g.rim, spec, 1)).toBe(false);
  });

  it('does not score when the pointer never leaves the ball', () => {
    expect(resolveDragShot(0, g.origin, spec, 1)).toBe(false);
    const aim = aimFromDrag(g.origin, g.origin, 1);
    expect(aim.length).toBe(0);
    expect(aim.power).toBe(0);
  });

  it('scores a drag opposite the rim at ideal power', () => {
    const pointer = pointerFor(g, g.optimalAngle, g.idealPower);
    expect(resolveDragShot(0, pointer, spec, 1)).toBe(true);
  });

  it('scores the ideal slingshot on every attempt and aspect', () => {
    for (const aspect of [1, 0.6, 1.4]) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const geo = dragGeometry(attempt, spec, aspect);
        const pointer = pointerFor(geo, geo.optimalAngle, geo.idealPower);
        expect(resolveDragShot(attempt, pointer, spec, aspect)).toBe(true);
      }
    }
  });

  it('does not score a drag shorter than MIN_PULL', () => {
    const pointer = pointerFor(g, g.optimalAngle, 0.05);
    const aim = aimFromDrag(g.origin, pointer, 1);
    expect(aim.length).toBeLessThan(MIN_PULL);
    expect(resolveDragShot(0, pointer, spec, 1)).toBe(false);
  });

  it('does not score angles or powers beyond the tolerance', () => {
    const wide = pointerFor(g, g.optimalAngle + g.angleTol + 2, g.idealPower);
    // A lower ideal power leaves room to overshoot without hitting the 0..1 clamp.
    const softGeometry = dragGeometry(0, spec, 0.5);
    const hard = pointerFor(softGeometry, softGeometry.optimalAngle, softGeometry.idealPower + softGeometry.powerTol + 0.08);
    const soft = pointerFor(softGeometry, softGeometry.optimalAngle, softGeometry.idealPower - softGeometry.powerTol - 0.08);
    expect(resolveDragShot(0, wide, spec, 1)).toBe(false);
    expect(resolveDragShot(0, hard, spec, 0.5)).toBe(false);
    expect(resolveDragShot(0, soft, spec, 0.5)).toBe(false);
  });

  it('is deterministic for the same pointer', () => {
    const g2 = dragGeometry(2, spec, 1);
    const pointer = pointerFor(g2, g2.optimalAngle + 1.1, g2.idealPower + 0.01);
    for (let i = 0; i < 20; i++) {
      expect(resolveDragShot(2, pointer, spec, 1)).toBe(resolveDragShot(2, pointer, spec, 1));
    }
    expect(resolveDragShot(2, pointer, spec, 1)).toBe(true);
  });
});
