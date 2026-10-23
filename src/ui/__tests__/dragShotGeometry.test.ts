/** @vitest-environment node */
import {
  RIM_Y,
  aimFromPointer,
  boardBounce,
  dragGeometry,
  flightPathD,
  flightPlan,
  flightPoint,
  missKind,
  resolveDragShot,
  shotError,
} from '../minigames/dragShot';

const spec = { kind: 'threes' as const, zone: 30 };

describe('dragShot geometry', () => {
  it('derives the reference geometry for attempt 0 with aspect 1', () => {
    const g = dragGeometry(0, spec, 1);
    expect(g.origin).toEqual({ x: 12, y: 62 });
    expect(g.rim).toEqual({ x: 72, y: RIM_Y });
    expect(g.aspect).toBe(1);
    expect(g.optimalAngle).toBeCloseTo(-23.43, 2);
    expect(g.idealPower).toBeCloseTo(0.654, 3);
    expect(g.angleTol).toBeCloseTo(6.84, 3);
    expect(g.powerTol).toBeCloseTo(0.072, 3);
  });

  it('falls back to aspect 1 when it is not finite or not positive', () => {
    expect(dragGeometry(0, spec, 0).aspect).toBe(1);
    expect(dragGeometry(0, spec, -2).aspect).toBe(1);
    expect(dragGeometry(0, spec, Number.NaN).aspect).toBe(1);
    expect(dragGeometry(0, spec).aspect).toBe(1);
  });

  it('scales aim and tolerance with the aspect ratio', () => {
    const g = dragGeometry(0, spec, 1.7);
    expect(g.aspect).toBe(1.7);
    const aim = aimFromPointer(g, g.rim.x, g.rim.y);
    expect(shotError(g, aim.angleDeg, aim.power).hit).toBe(true);
    expect(shotError(g, -23.43, 0.654).hit).toBe(false);
  });

  it('treats the tolerance border as inclusive and beyond it as a miss', () => {
    const g = dragGeometry(0, spec, 1);
    const edge = shotError(g, g.optimalAngle + g.angleTol, g.idealPower + g.powerTol);
    expect(edge.angleOk).toBe(true);
    expect(edge.powerOk).toBe(true);
    expect(edge.hit).toBe(true);
    expect(shotError(g, g.optimalAngle - g.angleTol, g.idealPower - g.powerTol).hit).toBe(true);
    expect(shotError(g, g.optimalAngle + g.angleTol + 0.001, g.idealPower + g.powerTol).hit).toBe(false);
    expect(shotError(g, g.optimalAngle + g.angleTol, g.idealPower + g.powerTol + 0.001).hit).toBe(false);
  });
});

describe('dragShot verdicts', () => {
  const g = dragGeometry(0, spec, 1);
  const clear: {
    angleDelta: number;
    powerDelta: number;
    angleOk: boolean;
    powerOk: boolean;
    hit: boolean;
  } = { angleDelta: 0, powerDelta: 0, angleOk: true, powerOk: true, hit: true };

  it('classifies the four miss kinds', () => {
    expect(missKind(g, { ...clear, angleDelta: -g.angleTol - 1, angleOk: false, hit: false })).toBe('wide-left');
    expect(missKind(g, { ...clear, angleDelta: g.angleTol + 1, angleOk: false, hit: false })).toBe('wide-right');
    expect(missKind(g, { ...clear, powerDelta: -g.powerTol - 0.01, powerOk: false, hit: false })).toBe('short');
    expect(missKind(g, { ...clear, powerDelta: g.powerTol + 0.01, powerOk: false, hit: false })).toBe('long');
  });

  it('only bounces off the board beyond 1.6 times the power tolerance', () => {
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 })).toBe(false);
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 - 0.001 })).toBe(false);
    expect(boardBounce(g, { ...clear, powerDelta: g.powerTol * 1.6 + 0.001 })).toBe(true);
  });
});

describe('dragShot flight plan', () => {
  const allFinite = (plan: ReturnType<typeof flightPlan>) => {
    const points = plan.segs.flatMap((s) => [s.from, s.to, ...(s.curve ? [s.curve] : [])]);
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(2);
      expect(p.x).toBeLessThanOrEqual(98);
      expect(p.y).toBeGreaterThanOrEqual(2);
      expect(p.y).toBeLessThanOrEqual(96);
    }
    for (let t = 0; t <= plan.totalMs; t += 25) {
      const p = flightPoint(plan, t);
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  };

  it('builds a make plan with exact endpoints', () => {
    const g = dragGeometry(0, spec, 1);
    const plan = flightPlan(0, g.optimalAngle, g.idealPower, spec, 1);
    expect(plan.verdict).toBe('make');
    expect(plan.miss).toBeUndefined();
    expect(plan.board).toBe(false);
    expect(plan.segs).toHaveLength(2);
    expect(plan.totalMs).toBeGreaterThan(0);
    expect(plan.segs[0].to).toEqual({ x: g.rim.x, y: RIM_Y - 1 });
    expect(plan.segs[1].to).toEqual({ x: g.rim.x, y: RIM_Y + 3 });
    const start = flightPoint(plan, 0);
    expect(start.seg).toBe(0);
    expect({ x: start.x, y: start.y }).toEqual(plan.segs[0].from);
    const end = flightPoint(plan, plan.totalMs);
    expect(end.seg).toBe(plan.segs.length - 1);
    expect({ x: end.x, y: end.y }).toEqual(plan.segs[plan.segs.length - 1].to);
    allFinite(plan);
  });

  it('keeps the flight long enough for the animation to read', () => {
    const g = dragGeometry(0, spec, 1);
    const make = flightPlan(0, g.optimalAngle, g.idealPower, spec, 1);
    expect(make.verdict).toBe('make');
    expect(make.totalMs).toBeGreaterThanOrEqual(1000);
    const miss = flightPlan(0, g.optimalAngle, g.idealPower - 0.2, spec, 1);
    expect(miss.verdict).toBe('miss');
    expect(miss.totalMs).toBeGreaterThanOrEqual(1500);
    const board = flightPlan(0, g.optimalAngle, g.idealPower + 0.2, spec, 1);
    expect(board.board).toBe(true);
    expect(board.totalMs).toBeGreaterThanOrEqual(1500);
  });

  it('builds short miss plans without a board bounce', () => {
    const g = dragGeometry(0, spec, 1);
    const plan = flightPlan(0, g.optimalAngle, g.idealPower - 0.2, spec, 1);
    expect(plan.verdict).toBe('miss');
    expect(plan.miss).toBe('short');
    expect(plan.board).toBe(false);
    expect(plan.segs).toHaveLength(2);
    expect(plan.segs[plan.segs.length - 1].to.y).toBe(92);
    expect(flightPoint(plan, plan.totalMs)).toEqual({ x: plan.segs[1].to.x, y: 92, seg: 1 });
    allFinite(plan);
  });

  it('builds long miss plans with and without a board bounce', () => {
    const g = dragGeometry(0, spec, 1);
    const plain = flightPlan(0, g.optimalAngle, g.idealPower + 0.1, spec, 1);
    expect(plain.verdict).toBe('miss');
    expect(plain.miss).toBe('long');
    expect(plain.board).toBe(false);
    expect(plain.segs).toHaveLength(2);
    expect(plain.segs[plain.segs.length - 1].to.y).toBe(92);
    allFinite(plain);

    const bounced = flightPlan(0, g.optimalAngle, g.idealPower + 0.2, spec, 1);
    expect(bounced.verdict).toBe('miss');
    expect(bounced.miss).toBe('long');
    expect(bounced.board).toBe(true);
    expect(bounced.segs).toHaveLength(3);
    expect(bounced.segs[bounced.segs.length - 1].to.y).toBe(92);
    allFinite(bounced);
  });

  it('builds wide miss plans on both sides', () => {
    const g = dragGeometry(0, spec, 1);
    const left = flightPlan(0, g.optimalAngle - g.angleTol - 1, g.idealPower, spec, 1);
    expect(left.verdict).toBe('miss');
    expect(left.miss).toBe('wide-left');
    expect(left.board).toBe(false);
    expect(left.segs).toHaveLength(2);
    expect(left.segs[left.segs.length - 1].to.y).toBe(92);
    allFinite(left);

    const right = flightPlan(0, g.optimalAngle + g.angleTol + 1, g.idealPower, spec, 1);
    expect(right.verdict).toBe('miss');
    expect(right.miss).toBe('wide-right');
    expect(right.board).toBe(false);
    expect(right.segs).toHaveLength(2);
    expect(right.segs[right.segs.length - 1].to.y).toBe(92);
    allFinite(right);
  });

  it('is deterministic and never emits NaN', () => {
    const g = dragGeometry(0, spec, 1);
    const plan = flightPlan(0, g.optimalAngle + 0.5, g.idealPower - 0.3, spec, 1);
    const d = flightPathD(plan);
    expect(d).toBe(flightPathD(plan));
    expect(d).not.toContain('NaN');
    expect(d.startsWith('M ')).toBe(true);
    const nums = d.match(/-?\d+(\.\d+)?/g) ?? [];
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) expect(n).toMatch(/^-?\d+(\.\d{1,2})?$/);
    for (const t of [0, 1, 37.5, 200, plan.totalMs / 2, plan.totalMs - 1, plan.totalMs]) {
      expect(flightPoint(plan, t)).toEqual(flightPoint(plan, t));
    }
  });
});

describe('resolveDragShot contract', () => {
  it('keeps the component contract stable', () => {
    expect(resolveDragShot(0, -23.43, 0.654, spec)).toBe(true);
    expect(resolveDragShot(0, -23.43 + 10, 0.654, spec)).toBe(false);
    expect(resolveDragShot(0, -23.43, 0.654 + 0.12, spec)).toBe(false);
    const g = dragGeometry(0, spec, 1);
    expect(resolveDragShot(0, g.optimalAngle, g.idealPower, spec)).toBe(true);
  });
});
