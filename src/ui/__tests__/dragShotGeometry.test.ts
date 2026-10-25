/** @vitest-environment node */
import {
  MAX_PULL,
  MIN_PULL,
  RIM_Y,
  aimFromDrag,
  boardBounce,
  canStartDrag,
  dragGeometry,
  flightPathD,
  flightPlan,
  flightPoint,
  missKind,
  resolveDragShot,
  shotError,
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

describe('dragShot geometry', () => {
  it('derives the reference geometry for attempt 0 with aspect 1', () => {
    const g = dragGeometry(0, spec, 1);
    expect(g.origin).toEqual({ x: 40, y: 64 });
    expect(g.rim).toEqual({ x: 70, y: 42 });
    expect(g.rim.y).toBe(RIM_Y);
    expect(g.aspect).toBe(1);
    expect(g.distance).toBeCloseTo(0.37202, 5);
    expect(g.optimalAngle).toBeCloseTo(-36.2538, 4);
    expect(g.idealPower).toBeCloseTo(0.600035, 6);
    expect(g.angleTol).toBeCloseTo(3.95, 6);
    expect(g.powerTol).toBeCloseTo(0.039, 6);
    expect(g.maxPull).toBe(MAX_PULL);
    expect(g.minPull).toBe(MIN_PULL);
  });

  it('falls back to aspect 1 when it is not finite or not positive', () => {
    expect(dragGeometry(0, spec, 0).aspect).toBe(1);
    expect(dragGeometry(0, spec, -2).aspect).toBe(1);
    expect(dragGeometry(0, spec, Number.NaN).aspect).toBe(1);
    expect(dragGeometry(0, spec).aspect).toBe(1);
  });

  it('keeps the optimal angle when the arena aspect changes', () => {
    const wide = dragGeometry(0, spec, 0.5);
    expect(wide.aspect).toBe(0.5);
    expect(wide.optimalAngle).toBeCloseTo(-20.1363, 3);
    expect(wide.idealPower).toBeCloseTo(0.5154, 4);
    const aim = aimFromDrag(wide.origin, pointerFor(wide, wide.optimalAngle, wide.idealPower), 0.5);
    expect(aim.angleDeg).toBeCloseTo(wide.optimalAngle, 8);
    expect(aim.power).toBeCloseTo(wide.idealPower, 8);
    expect(resolveDragShot(0, pointerFor(wide, wide.optimalAngle, wide.idealPower), spec, 0.5)).toBe(true);
  });

  it('keeps the ideal drag end-point inside the arena for every attempt and aspect', () => {
    for (const aspect of [0.35, 0.5, 1, 1.4]) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const geo = dragGeometry(attempt, spec, aspect);
        const pointer = pointerFor(geo, geo.optimalAngle, geo.idealPower);
        const where = `attempt ${attempt}, aspect ${aspect}`;
        expect(pointer.x, `${where}: x below 0`).toBeGreaterThanOrEqual(0);
        expect(pointer.x, `${where}: x above 100`).toBeLessThanOrEqual(100);
        expect(pointer.y, `${where}: y below 0`).toBeGreaterThanOrEqual(0);
        expect(pointer.y, `${where}: y above 100`).toBeLessThanOrEqual(100);
        expect(resolveDragShot(attempt, pointer, spec, aspect), `${where}: ideal drag must score`).toBe(true);
      }
    }
  });

  it('only recognises a pointerdown close to the ball origin', () => {
    const g = dragGeometry(0, spec, 1);
    expect(canStartDrag(g.origin, g.origin, 1)).toBe(true);
    expect(canStartDrag(g.origin, g.rim, 1)).toBe(false);
    expect(canStartDrag(g.origin, { x: 0, y: 0 }, 1)).toBe(false);
    expect(canStartDrag(g.origin, { x: 100, y: 100 }, 1)).toBe(false);
    // The 10%-of-width radius is inclusive.
    expect(canStartDrag(g.origin, { x: g.origin.x + 10, y: g.origin.y }, 1)).toBe(true);
    expect(canStartDrag(g.origin, { x: g.origin.x + 10.01, y: g.origin.y }, 1)).toBe(false);
    // Vertical distances are measured in width units: aspect 2 doubles the radius in percent.
    const tall = dragGeometry(0, spec, 2);
    expect(canStartDrag(tall.origin, { x: tall.origin.x, y: tall.origin.y + 5 }, 2)).toBe(true);
    expect(canStartDrag(tall.origin, { x: tall.origin.x, y: tall.origin.y + 5.01 }, 2)).toBe(false);
  });
});

describe('dragShot aim and verdict', () => {
  const g = dragGeometry(0, spec, 1);

  it('never scores when the pointer ends on the rim', () => {
    expect(resolveDragShot(0, g.rim, spec, 1)).toBe(false);
    const aim = aimFromDrag(g.origin, g.rim, 1);
    expect(aim.angleDeg).toBeCloseTo(g.optimalAngle + 180, 6);
    expect(shotError(g, aim.angleDeg, aim.power).hit).toBe(false);
  });

  it('never scores when the pointer never leaves the ball', () => {
    expect(resolveDragShot(0, g.origin, spec, 1)).toBe(false);
    const aim = aimFromDrag(g.origin, g.origin, 1);
    expect(aim.length).toBe(0);
    expect(aim.power).toBe(0);
    expect(shotError(g, aim.angleDeg, aim.power).hit).toBe(false);
  });

  it('scores when the pointer is opposite the rim at ideal power', () => {
    const pointer = pointerFor(g, g.optimalAngle, g.idealPower);
    const aim = aimFromDrag(g.origin, pointer, 1);
    expect(aim.angleDeg).toBeCloseTo(g.optimalAngle, 8);
    expect(aim.length).toBeCloseTo(g.idealPower * MAX_PULL, 8);
    expect(aim.power).toBeCloseTo(g.idealPower, 8);
    expect(resolveDragShot(0, pointer, spec, 1)).toBe(true);
  });

  it('does not score a drag shorter than MIN_PULL', () => {
    const pointer = pointerFor(g, g.optimalAngle, 0.05);
    const aim = aimFromDrag(g.origin, pointer, 1);
    expect(aim.length).toBeLessThan(MIN_PULL);
    expect(resolveDragShot(0, pointer, spec, 1)).toBe(false);
  });

  it('does not score a drag just under MIN_PULL even with a perfect angle', () => {
    const pointer = pointerFor(g, g.optimalAngle, MIN_PULL - 0.001);
    const aim = aimFromDrag(g.origin, pointer, 1);
    expect(aim.angleDeg).toBeCloseTo(g.optimalAngle, 8);
    expect(aim.length).toBeLessThan(MIN_PULL);
    expect(shotError(g, aim.angleDeg, aim.power).angleOk).toBe(true);
    expect(resolveDragShot(0, pointer, spec, 1)).toBe(false);
  });

  it('treats the tolerance border as inclusive and beyond it as a miss', () => {
    const fixed: ShotGeometry = {
      origin: { x: 20, y: 80 },
      rim: { x: 70, y: 30 },
      aspect: 1,
      distance: 0.5,
      optimalAngle: 0,
      idealPower: 0.5,
      angleTol: 2,
      powerTol: 0.03125,
      maxPull: MAX_PULL,
      minPull: MIN_PULL,
    };
    expect(shotError(fixed, 2, 0.53125).hit).toBe(true);
    expect(shotError(fixed, -2, 0.46875).hit).toBe(true);
    expect(shotError(fixed, 2 + 1e-9, 0.5).hit).toBe(false);
    expect(shotError(fixed, 0, 0.53125 + 1e-9).hit).toBe(false);
    expect(shotError(fixed, 0, 0.5).angleOk).toBe(true);
    expect(shotError(fixed, 0, 0.5).powerOk).toBe(true);
  });

  it('classifies the four miss kinds and the board bounce threshold', () => {
    const clear = {
      angleDelta: 0,
      powerDelta: 0,
      angleOk: true,
      powerOk: true,
      hit: true,
    };
    expect(missKind(g, { ...clear, angleDelta: -g.angleTol - 1, angleOk: false, hit: false })).toBe('wide-left');
    expect(missKind(g, { ...clear, angleDelta: g.angleTol + 1, angleOk: false, hit: false })).toBe('wide-right');
    expect(missKind(g, { ...clear, powerDelta: -g.powerTol - 0.01, powerOk: false, hit: false })).toBe('short');
    expect(missKind(g, { ...clear, powerDelta: g.powerTol + 0.01, powerOk: false, hit: false })).toBe('long');
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 })).toBe(false);
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 - 0.001 })).toBe(false);
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 + 0.001 })).toBe(true);
  });
});

describe('dragShot flight plan', () => {
  const g = dragGeometry(0, spec, 1);

  const expectInside = (plan: ReturnType<typeof flightPlan>) => {
    const points = plan.segs.flatMap((s) => [s.from, s.to, ...(s.curve ? [s.curve] : [])]);
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(2);
      expect(p.x).toBeLessThanOrEqual(98);
      expect(p.y).toBeGreaterThanOrEqual(2);
      expect(p.y).toBeLessThanOrEqual(96);
    }
    for (let t = 0; t <= plan.totalMs; t += 13.7) {
      const p = flightPoint(plan, t);
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(2);
      expect(p.x).toBeLessThanOrEqual(98);
      expect(p.y).toBeGreaterThanOrEqual(2);
      expect(p.y).toBeLessThanOrEqual(96);
    }
  };

  it('builds a make plan that ends in the net', () => {
    const plan = flightPlan(0, g.optimalAngle, g.idealPower, spec, 1);
    expect(plan.verdict).toBe('make');
    expect(plan.miss).toBeUndefined();
    expect(plan.board).toBe(false);
    expect(plan.segs).toHaveLength(2);
    expect(plan.totalMs).toBeGreaterThanOrEqual(1000);
    const last = plan.segs[plan.segs.length - 1].to;
    expect(last).toEqual({ x: g.rim.x, y: RIM_Y + 3 });
    const end = flightPoint(plan, plan.totalMs);
    expect(end).toEqual({ x: last.x, y: last.y, seg: plan.segs.length - 1 });
    expectInside(plan);
  });

  it('builds short and long miss plans that end on the floor', () => {
    const short = flightPlan(0, g.optimalAngle, g.idealPower - 0.2, spec, 1);
    expect(short.verdict).toBe('miss');
    expect(short.miss).toBe('short');
    expect(short.board).toBe(false);
    expect(short.segs).toHaveLength(2);
    expect(short.segs[short.segs.length - 1].to.y).toBe(92);
    expectInside(short);

    const long = flightPlan(0, g.optimalAngle, g.idealPower + 0.05, spec, 1);
    expect(long.verdict).toBe('miss');
    expect(long.miss).toBe('long');
    expect(long.board).toBe(false);
    expect(long.segs).toHaveLength(2);
    expect(long.segs[long.segs.length - 1].to.y).toBe(92);
    expectInside(long);
  });

  it('adds a deterministic board bounce for a long, hard miss', () => {
    const plan = flightPlan(0, g.optimalAngle, g.idealPower + 0.2, spec, 1);
    expect(plan.verdict).toBe('miss');
    expect(plan.miss).toBe('long');
    expect(plan.board).toBe(true);
    expect(plan.segs).toHaveLength(3);
    expect(plan.segs[plan.segs.length - 1].to.y).toBe(92);
    expectInside(plan);
  });

  it('sends wide misses to the floor on both sides', () => {
    const left = flightPlan(0, g.optimalAngle - g.angleTol - 1, g.idealPower, spec, 1);
    expect(left.verdict).toBe('miss');
    expect(left.miss).toBe('wide-left');
    expect(left.board).toBe(false);
    expect(left.segs[left.segs.length - 1].to.y).toBe(92);
    expectInside(left);

    const right = flightPlan(0, g.optimalAngle + g.angleTol + 1, g.idealPower, spec, 1);
    expect(right.verdict).toBe('miss');
    expect(right.miss).toBe('wide-right');
    expect(right.board).toBe(false);
    expect(right.segs[right.segs.length - 1].to.y).toBe(92);
    expectInside(right);
  });

  it('is deterministic and never emits NaN in the SVG path', () => {
    const angle = g.optimalAngle + 0.5;
    const power = g.idealPower - 0.3;
    const plan = flightPlan(0, angle, power, spec, 1);
    expect(plan).toEqual(flightPlan(0, angle, power, spec, 1));
    const d = flightPathD(plan);
    expect(d).toBe(flightPathD(plan));
    expect(d).not.toContain('NaN');
    expect(d.startsWith('M ')).toBe(true);
    const nums = d.match(/-?\d+(\.\d+)?/g) ?? [];
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) expect(n).toMatch(/^-?\d+(\.\d{1,2})?$/);
    for (const t of [0, 0.5, 1, 37.5, 200, plan.totalMs / 2, plan.totalMs - 1, plan.totalMs]) {
      const a = flightPoint(plan, t);
      expect(a).toEqual(flightPoint(plan, t));
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
    }
  });
});

describe('resolveDragShot determinism', () => {
  it('returns the same verdict for the same drag', () => {
    const g = dragGeometry(3, spec, 0.7);
    const makePointer = pointerFor(g, g.optimalAngle, g.idealPower);
    const missPointer = pointerFor(g, g.optimalAngle, g.idealPower - 0.25);
    for (let i = 0; i < 20; i++) {
      expect(resolveDragShot(3, makePointer, spec, 0.7)).toBe(true);
      expect(resolveDragShot(3, missPointer, spec, 0.7)).toBe(false);
    }
  });
});
