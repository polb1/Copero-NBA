import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';

export const RIM_Y = 36;
export const ballX = (attempt: number) => 12 + ((attempt * 29) % 18);
export const ballY = (attempt: number) => 62 + ((attempt * 17) % 20);
export const rimX = (attempt: number) => 72 + ((attempt * 37) % 22);

export type MissKind = 'wide-left' | 'wide-right' | 'short' | 'long';

export interface ShotGeometry {
  origin: { x: number; y: number };
  rim: { x: number; y: number };
  aspect: number;
  optimalAngle: number;
  distance: number;
  idealPower: number;
  angleTol: number;
  powerTol: number;
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

/** Keeps every plan point inside the arena. */
const clip = (p: { x: number; y: number }): { x: number; y: number } => ({
  x: clamp(p.x, 2, 98),
  y: clamp(p.y, 2, 96),
});

/** Formats a coordinate with at most two decimals and never emits NaN. */
const num = (v: number) => (Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0');

export function dragGeometry(attempt: number, spec: Pick<MinigameSpec, 'kind' | 'zone'>, aspect = 1): ShotGeometry {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const origin = { x: ballX(attempt), y: ballY(attempt) };
  const rim = { x: rimX(attempt), y: RIM_Y };
  const dx = (rim.x - origin.x) / 100;
  const dy = ((rim.y - origin.y) / 100) * a;
  const distance = Math.hypot(dx, dy);
  return {
    origin,
    rim,
    aspect: a,
    optimalAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
    distance,
    idealPower: clamp(distance, 0.3, 0.9),
    angleTol: clamp((spec.zone * 0.45 - 4) * 0.72, 2.5, 15),
    powerTol: clamp((spec.zone / 300) * 0.72, 0.045, 0.14),
  };
}

export function shotError(g: ShotGeometry, angleDeg: number, power: number): ShotError {
  const angleDelta = angleDeg - g.optimalAngle;
  const powerDelta = power - g.idealPower;
  const angleOk = Math.abs(angleDelta) <= g.angleTol;
  const powerOk = Math.abs(powerDelta) <= g.powerTol;
  return { angleDelta, powerDelta, angleOk, powerOk, hit: angleOk && powerOk };
}

export function aimFromPointer(g: ShotGeometry, xPct: number, yPct: number): { angleDeg: number; power: number } {
  const dx = (xPct - g.origin.x) / 100;
  const dy = ((yPct - g.origin.y) / 100) * g.aspect;
  return {
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    power: clamp(Math.hypot(dx, dy), 0, 1),
  };
}

export function resolveDragShot(
  attempt: number,
  angleDeg: number,
  power: number,
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
): boolean {
  return shotError(dragGeometry(attempt, spec, aspect), angleDeg, power).hit;
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

  const origin = { x: g.origin.x, y: g.origin.y };
  const rim = { x: g.rim.x, y: g.rim.y };
  const net = { x: rim.x, y: rim.y + 3 };
  const ctrl = { x: (origin.x + rim.x) / 2, y: Math.min(origin.y, rim.y - 1) - 18 - 15 * power };

  const segs: PathSeg[] = [];
  let miss: MissKind | undefined;

  if (hit) {
    const apex = { x: rim.x, y: rim.y - 1 };
    segs.push({ from: clip(origin), to: clip(apex), curve: clip(ctrl) });
    segs.push({ from: clip(apex), to: clip(net) });
  } else {
    miss = missKind(g, e);
    if (miss === 'short') {
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
      const wx = rim.x + (miss === 'wide-left' ? -14 : 14);
      const first = clip({ x: wx, y: rim.y - 2 });
      segs.push({ from: clip(origin), to: first, curve: clip(ctrl) });
      segs.push({ from: first, to: clip({ x: wx, y: 92 }) });
    }
  }

  let base = hit ? 820 + 240 * power : 700 + 260 * power;
  if (board) base += 180;
  if (!hit) base += 520;

  const plan: FlightPlan = { verdict: hit ? 'make' : 'miss', board, segs, totalMs: base + 260 };
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
  return { x: cur.from.x + (cur.to.x - cur.from.x) * u, y: cur.from.y + (cur.to.y - cur.from.y) * u, seg };
}

export function flightPathD(plan: FlightPlan): string {
  const first = plan.segs[0].from;
  const parts = [`M ${num(first.x)} ${num(first.y)}`];
  for (const s of plan.segs) {
    parts.push(s.curve ? `Q ${num(s.curve.x)} ${num(s.curve.y)} ${num(s.to.x)} ${num(s.to.y)}` : `L ${num(s.to.x)} ${num(s.to.y)}`);
  }
  return parts.join(' ');
}
