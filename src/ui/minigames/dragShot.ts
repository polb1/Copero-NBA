import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';

export const RIM_Y = 42;
export const MAX_PULL = 0.62;
export const MIN_PULL = 0.08;

export type MissKind = 'wide-left' | 'wide-right' | 'short' | 'long';

export interface ShotGeometry {
  origin: { x: number; y: number };
  rim: { x: number; y: number };
  aspect: number;
  distance: number;
  optimalAngle: number;
  idealPower: number;
  angleTol: number;
  powerTol: number;
  maxPull: number;
  minPull: number;
}

export interface ShotError {
  angleDelta: number;
  powerDelta: number;
  angleOk: boolean;
  powerOk: boolean;
  hit: boolean;
}

export interface PathSeg {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Quadratic control point; omit for a straight segment. */
  curve?: { x: number; y: number };
}

export interface FlightPlan {
  verdict: 'make' | 'miss';
  miss?: MissKind;
  board: boolean;
  segs: PathSeg[];
  totalMs: number;
}

/** Ball origin point for a given attempt number. */
export const ballOrigin = (attempt: number): { x: number; y: number } => ({
  x: 40 + ((attempt * 13) % 9),
  y: 64 + ((attempt * 7) % 7),
});

/** Rim point for a given attempt number (y fixed at the rim height). */
export const rimPoint = (attempt: number): { x: number; y: number } => ({
  x: 70 + ((attempt * 19) % 9),
  y: RIM_Y,
});

/** Keeps every plan point inside the arena. */
const clip = (p: { x: number; y: number }): { x: number; y: number } => ({
  x: clamp(p.x, 2, 98),
  y: clamp(p.y, 2, 96),
});

/** Formats a coordinate with at most two decimals and never emits NaN. */
const num = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0';

/** Normalised aspect ratio, falling back to 1 for non-finite / non-positive values. */
const safeAspect = (aspect: number): number =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

export function dragGeometry(
  attempt: number,
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
  customOrigin?: { x: number; y: number },
): ShotGeometry {
  const a = safeAspect(aspect);
  const origin = customOrigin ?? ballOrigin(attempt);
  const rim = rimPoint(attempt);
  const dx = (rim.x - origin.x) / 100;
  const dy = ((rim.y - origin.y) / 100) * a;
  const distance = Math.hypot(dx, dy);
  return {
    origin,
    rim,
    aspect: a,
    distance,
    optimalAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
    idealPower: clamp(distance / MAX_PULL, 0.35, 0.98),
    angleTol: clamp(1.4 + spec.zone * 0.085, 2.0, 6.0),
    powerTol: clamp(0.018 + spec.zone * 0.0007, 0.02, 0.055),
    maxPull: MAX_PULL,
    minPull: MIN_PULL,
  };
}

export function shotError(g: ShotGeometry, angleDeg: number, power: number): ShotError {
  const angleDelta = angleDeg - g.optimalAngle;
  const powerDelta = power - g.idealPower;
  const angleOk = Math.abs(angleDelta) <= g.angleTol;
  const powerOk = Math.abs(powerDelta) <= g.powerTol;
  return { angleDelta, powerDelta, angleOk, powerOk, hit: angleOk && powerOk };
}

/** Whether the pointer is close enough to the ball origin to start a drag. */
export function canStartDrag(
  origin: { x: number; y: number },
  pointer: { x: number; y: number },
  aspect = 1,
): boolean {
  const a = safeAspect(aspect);
  const dx = (pointer.x - origin.x) / 100;
  const dy = ((pointer.y - origin.y) / 100) * a;
  return Math.hypot(dx, dy) <= 0.1;
}

/**
 * Computes the launch aim from a drag gesture.
 * The launch vector is `origin - pointer` (catapult / slingshot model):
 * you pull the ball away from the target and it flies toward it.
 */
export function aimFromDrag(
  origin: { x: number; y: number },
  pointer: { x: number; y: number },
  aspect = 1,
): { angleDeg: number; power: number; pullX: number; pullY: number; length: number } {
  const a = safeAspect(aspect);
  const dx = (origin.x - pointer.x) / 100;
  const dy = ((origin.y - pointer.y) / 100) * a;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const power = clamp(length / MAX_PULL, 0, 1);
  return {
    angleDeg,
    power,
    pullX: clamp(pointer.x, 0, 100),
    pullY: clamp(pointer.y, 0, 100),
    length,
  };
}

/**
 * Resolves a drag shot: `pointer` is the drag end-point (not the rim).
 * Touching the rim never counts as a hit — the launch direction must
 * match the computed optimal angle, not the pull-to-rim direction.
 */
export function resolveDragShot(
  attempt: number,
  pointer: { x: number; y: number },
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
  customOrigin?: { x: number; y: number },
): boolean {
  const g = dragGeometry(attempt, spec, aspect, customOrigin);
  const aim = aimFromDrag(g.origin, pointer, aspect);
  if (aim.length < g.minPull) return false;
  return shotError(g, aim.angleDeg, aim.power).hit;
}

export function missKind(g: ShotGeometry, e: ShotError): MissKind {
  if (!e.angleOk) return e.angleDelta < 0 ? 'wide-left' : 'wide-right';
  return e.powerDelta < 0 ? 'short' : 'long';
}

export function boardBounce(g: ShotGeometry, e: ShotError): boolean {
  return e.powerDelta > g.powerTol * 1.6;
}

export function flightPlan(
  attempt: number,
  angleDeg: number,
  power: number,
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
  customOrigin?: { x: number; y: number },
): FlightPlan {
  const g = dragGeometry(attempt, spec, aspect, customOrigin);
  const e = shotError(g, angleDeg, power);
  const hit = e.hit;
  const board = !hit && boardBounce(g, e);
  const miss: MissKind | undefined = hit ? undefined : missKind(g, e);

  const origin = g.origin;
  const rim = g.rim;
  const net = { x: rim.x, y: RIM_Y + 3 };
  // Natural parabolic arc peaking high above the line of sight:
  const ctrl = {
    x: (origin.x + rim.x) / 2,
    y: Math.min(origin.y, rim.y - 1) - 22 - 16 * power,
  };

  const segs: PathSeg[] = [];

  if (hit) {
    const apex = { x: rim.x, y: rim.y - 1 };
    segs.push({ from: clip(origin), to: clip(apex), curve: clip(ctrl) });
    segs.push({ from: clip(apex), to: clip(net), curve: clip({ x: rim.x, y: rim.y + 1 }) });
  } else if (miss === 'short') {
    // Hits front rim and bounces backwards and down:
    const frontRim = clip({ x: rim.x - 3.5, y: rim.y + 0.5 });
    segs.push({ from: clip(origin), to: frontRim, curve: clip(ctrl) });
    const floor = clip({ x: rim.x - 12, y: 92 });
    const bounceCtrl = clip({ x: rim.x - 7, y: rim.y - 3 });
    segs.push({ from: frontRim, to: floor, curve: bounceCtrl });
  } else if (miss === 'long') {
    if (board) {
      // Hits backboard, ricochets and bounces down:
      const boardHit = clip({ x: rim.x + 8, y: rim.y - 6 });
      segs.push({ from: clip(origin), to: boardHit, curve: clip(ctrl) });
      const bounce = clip({ x: rim.x + 14, y: rim.y + 2 });
      segs.push({ from: boardHit, to: bounce });
      const floor = clip({ x: rim.x + 18, y: 92 });
      const bounceCtrl = clip({ x: rim.x + 16, y: rim.y + 4 });
      segs.push({ from: bounce, to: floor, curve: bounceCtrl });
    } else {
      // Hits back rim and ricochets:
      const backRim = clip({ x: rim.x + 4, y: rim.y });
      segs.push({ from: clip(origin), to: backRim, curve: clip(ctrl) });
      const floor = clip({ x: rim.x + 18, y: 92 });
      const bounceCtrl = clip({ x: rim.x + 11, y: rim.y - 5 });
      segs.push({ from: backRim, to: floor, curve: bounceCtrl });
    }
  } else {
    // wide-left or wide-right: grazes rim side and curves out to floor
    const wx = rim.x + (miss === 'wide-left' ? -14 : 14);
    const sideRim = clip({ x: wx, y: rim.y - 2 });
    segs.push({ from: clip(origin), to: sideRim, curve: clip(ctrl) });
    const floor = clip({ x: wx + (miss === 'wide-left' ? -6 : 6), y: 92 });
    const bounceCtrl = clip({ x: wx + (miss === 'wide-left' ? -3 : 3), y: rim.y - 2 });
    segs.push({ from: sideRim, to: floor, curve: bounceCtrl });
  }

  const base = hit ? 1050 : 1450;
  const extra = hit ? 250 * power : 200 * power + (board ? 180 : 0);
  const totalMs = Math.round(base + extra);

  const plan: FlightPlan = {
    verdict: hit ? 'make' : 'miss',
    board,
    segs,
    totalMs,
  };
  if (miss) plan.miss = miss;
  return plan;
}

export function flightPoint(plan: FlightPlan, tMs: number): { x: number; y: number; seg: number } {
  const segs = plan.segs;
  const n = segs.length;
  const total = plan.totalMs;
  const t = clamp(Number.isFinite(tMs) ? tMs : 0, 0, total);
  if (t <= 0) return { x: segs[0].from.x, y: segs[0].from.y, seg: 0 };
  if (t >= total) {
    const last = segs[n - 1];
    return { x: last.to.x, y: last.to.y, seg: n - 1 };
  }

  let seg = 0;
  let u = 0;
  if (n === 2) {
    // 76% of time spent on the majestic high arc flight, 24% on net/rebound
    const tSplit = total * 0.76;
    if (t < tSplit) {
      seg = 0;
      u = clamp(t / tSplit, 0, 1);
    } else {
      seg = 1;
      u = clamp((t - tSplit) / (total - tSplit), 0, 1);
    }
  } else if (n === 3) {
    const t1 = total * 0.62;
    const t2 = total * 0.82;
    if (t < t1) {
      seg = 0;
      u = clamp(t / t1, 0, 1);
    } else if (t < t2) {
      seg = 1;
      u = clamp((t - t1) / (t2 - t1), 0, 1);
    } else {
      seg = 2;
      u = clamp((t - t2) / (total - t2), 0, 1);
    }
  } else {
    const span = total / n;
    seg = Math.min(n - 1, Math.floor(t / span));
    u = clamp((t - seg * span) / span, 0, 1);
  }

  const cur = segs[seg];
  if (u <= 0) return { x: cur.from.x, y: cur.from.y, seg };
  if (u >= 1) return { x: cur.to.x, y: cur.to.y, seg };
  if (cur.curve) {
    const c = cur.curve;
    const w = 1 - u;
    return {
      x: w * w * cur.from.x + 2 * w * u * c.x + u * u * cur.to.x,
      y: w * w * cur.from.y + 2 * w * u * c.y + u * u * cur.to.y,
      seg,
    };
  }
  return {
    x: cur.from.x + (cur.to.x - cur.from.x) * u,
    y: cur.from.y + (cur.to.y - cur.from.y) * u,
    seg,
  };
}

export function flightPathD(plan: FlightPlan): string {
  const first = plan.segs[0].from;
  const parts = [`M ${num(first.x)} ${num(first.y)}`];
  for (const s of plan.segs) {
    parts.push(
      s.curve
        ? `Q ${num(s.curve.x)} ${num(s.curve.y)} ${num(s.to.x)} ${num(s.to.y)}`
        : `L ${num(s.to.x)} ${num(s.to.y)}`,
    );
  }
  return parts.join(' ');
}

export const COURT_SPOTS: Array<{ x: number; y: number }> = [
  { x: 26, y: 76 }, // 45º izquierda
  { x: 48, y: 82 }, // frontal cabecera
  { x: 70, y: 74 }, // 45º derecha
  { x: 36, y: 64 }, // media distancia izquierda
  { x: 60, y: 65 }, // media distancia derecha
  { x: 22, y: 58 }, // esquina izquierda
  { x: 78, y: 60 }, // esquina derecha
];

/**
 * Random court position for shooting attempts.
 * Spawns the player across distinct court locations with jitter.
 */
export function randomCourtOrigin(attempt: number, salt = 0): { x: number; y: number } {
  const idx = (attempt * 3 + salt * 7) % COURT_SPOTS.length;
  const base = COURT_SPOTS[idx];
  const jx = (((attempt * 17 + salt * 5 + 3) % 9) - 4) * 0.9;
  const jy = (((attempt * 13 + salt * 7 + 1) % 9) - 4) * 0.9;
  return {
    x: clamp(Math.round((base.x + jx) * 10) / 10, 18, 82),
    y: clamp(Math.round((base.y + jy) * 10) / 10, 56, 86),
  };
}
