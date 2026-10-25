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
): ShotGeometry {
  const a = safeAspect(aspect);
  const origin = ballOrigin(attempt);
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
): boolean {
  const g = dragGeometry(attempt, spec, aspect);
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
): FlightPlan {
  const g = dragGeometry(attempt, spec, aspect);
  const e = shotError(g, angleDeg, power);
  const hit = e.hit;
  const board = !hit && boardBounce(g, e);
  const miss: MissKind | undefined = hit ? undefined : missKind(g, e);

  const origin = g.origin;
  const rim = g.rim;
  const net = { x: rim.x, y: RIM_Y + 3 };
  const ctrl = {
    x: (origin.x + rim.x) / 2,
    y: Math.min(origin.y, rim.y - 1) - 18 - 15 * power,
  };

  const segs: PathSeg[] = [];

  if (hit) {
    const apex = { x: rim.x, y: rim.y - 1 };
    segs.push({ from: clip(origin), to: clip(apex), curve: clip(ctrl) });
    segs.push({ from: clip(apex), to: clip(net) });
  } else if (miss === 'short') {
    const end = clip({
      x: origin.x + (rim.x - origin.x) * 0.55,
      y: origin.y + (rim.y - origin.y) * 0.55,
    });
    segs.push({ from: clip(origin), to: end, curve: clip(ctrl) });
    segs.push({ from: end, to: clip({ x: end.x, y: 92 }) });
  } else if (miss === 'long') {
    const first = clip({ x: rim.x + 8, y: rim.y - 6 });
    segs.push({ from: clip(origin), to: first, curve: clip(ctrl) });
    if (board) {
      const bounce = clip({ x: rim.x + 14, y: rim.y + 2 });
      segs.push({ from: first, to: bounce });
      segs.push({ from: bounce, to: clip({ x: rim.x + 18, y: 92 }) });
    } else {
      segs.push({ from: first, to: clip({ x: rim.x + 18, y: 92 }) });
    }
  } else {
    // wide-left or wide-right
    const wx = rim.x + (miss === 'wide-left' ? -14 : 14);
    const first = clip({ x: wx, y: rim.y - 2 });
    segs.push({ from: clip(origin), to: first, curve: clip(ctrl) });
    segs.push({ from: first, to: clip({ x: wx, y: 92 }) });
  }

  const base = hit ? 1000 : 1500;
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
  const seg = Math.min(n - 1, Math.floor((t / total) * n));
  const cur = segs[seg];
  const span = total / n;
  const u = span > 0 ? clamp((t - seg * span) / span, 0, 1) : 0;
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
