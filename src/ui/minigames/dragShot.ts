import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';

/* ------------------------------------------------------------------ */
/*  Unidades                                                           */
/*  - La API pública trabaja en % de la arena (0..100), como antes.    */
/*  - La física trabaja en "unidades de mundo": 1 = ancho de la arena. */
/*    x_mundo = x / 100,  y_mundo = (y / 100) * aspect                 */
/*    (aspect = alto / ancho), así los ángulos son los que ve el        */
/*    jugador y la parábola no se deforma en pantallas no cuadradas.   */
/* ------------------------------------------------------------------ */

export const RIM_Y = 42;
export const MAX_PULL = 0.62;
export const MIN_PULL = 0.08;

/** Gravedad (unidades de mundo / s²). Controla lo "flotante" del tiro. */
export const GRAVITY = 1.3;
/** Radio del balón, en % del ancho de la arena. */
export const BALL_R = 2.4;
/** Grosor del tubo del aro (radio), en % del ancho. */
export const RIM_TUBE_R = 0.75;
/** Altura (en %) a la que se detiene el balón al botar en el suelo. */
export const FLOOR_Y = 92;
/** Segundos de trayectoria que enseña la guía de puntería. */
export const PREVIEW_SECONDS = 0.5;
export const PREVIEW_DOTS = 12;

const SIM_DT = 1 / 120;
const MAX_SIM_S = 3.4;
const NET_S = 0.3;
const REST_RIM = 0.55;
const REST_BOARD = 0.55;
const REST_FLOOR = 0.5;
const BOARD_GAP = 0.018; // distancia aro -> tablero (mundo, ancho de arena = 1)
/** El tablero se mide en % del ALTO de la arena para que no se salga en pantallas apaisadas. */
export const BOARD_UP_PCT = 14;
export const BOARD_DOWN_PCT = 1.5;

export type MissKind = 'wide-left' | 'wide-right' | 'short' | 'long';

export interface ShotGeometry {
  origin: { x: number; y: number };
  rim: { x: number; y: number };
  aspect: number;
  distance: number;
  /** Ángulo (pantalla, y hacia abajo) del arco de referencia que entra limpio. */
  optimalAngle: number;
  /** Potencia (0..1) del arco de referencia. Crece con la distancia y la altura. */
  idealPower: number;
  /** Solo orientativo (guías/ayudas visuales): el acierto lo decide la simulación. */
  angleTol: number;
  powerTol: number;
  maxPull: number;
  minPull: number;
  /** Semiancho de la boca del aro (mundo). */
  rimHalf: number;
  /** Radio del balón (mundo). */
  ballR: number;
  /** Velocidad de salida con potencia = 1 (mundo / s). */
  vMax: number;
  gravity: number;
}

export interface ShotError {
  /** Diferencias respecto al arco de referencia (informativas). */
  angleDelta: number;
  powerDelta: number;
  angleOk: boolean;
  powerOk: boolean;
  /** Resultado REAL de la simulación física. */
  hit: boolean;
  miss?: MissKind;
  board?: boolean;
  swish?: boolean;
}

export interface PathSeg {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Quadratic control point; omit for a straight segment. */
  curve?: { x: number; y: number };
}

export interface FlightEvent {
  tMs: number;
  kind: 'rim' | 'board' | 'net' | 'floor';
}

export interface FlightPlan {
  verdict: 'make' | 'miss';
  miss?: MissKind;
  /** true si el balón tocó el tablero (también en canastas de rebote). */
  board: boolean;
  /** Canasta limpia: entra sin tocar aro ni tablero. */
  swish?: boolean;
  /**
   * Trayectoria exacta de la simulación: cada segmento es una parábola
   * (Bézier cuadrática) de la misma duración (totalMs / segs.length).
   */
  segs: PathSeg[];
  /** Impactos (aro, tablero, red, suelo) para sonidos y efectos. */
  events?: FlightEvent[];
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

/** Formats a coordinate with at most two decimals and never emits NaN. */
const num = (v: number): string =>
  Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0';

/** Normalised aspect ratio, falling back to 1 for non-finite / non-positive values. */
const safeAspect = (aspect: number): number =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

const RAD = Math.PI / 180;

/**
 * Velocidad máxima de lanzamiento. Se calcula para que el tiro más lejano y
 * alto de la cancha sea alcanzable con ~90 % de potencia: así los tiros
 * cercanos piden poca fuerza y los lejanos mucha (la potencia importa).
 */
function launchSpeedMax(a: number): number {
  const hMax = 0.46 * a;
  const dxMax = 0.68;
  const rFar = hMax + Math.hypot(dxMax, hMax);
  return Math.sqrt(GRAVITY * rFar * 1.3);
}

/** Arco de referencia: energía mínima + 4º de parábola extra (entra en picado). */
function referenceArc(
  dxSigned: number,
  hUp: number,
  vMax: number,
): { angleDeg: number; power: number } {
  const dir = dxSigned >= 0 ? 1 : -1;
  const adx = Math.max(Math.abs(dxSigned), 0.05);
  const phi = Math.atan2(hUp, adx);
  // Energía mínima + algo de parábola, sin pasar de 68º salvo que el tiro lo exija.
  const th0 = Math.min(Math.PI / 4 + phi / 2, 85 * RAD);
  const start = Math.max(th0, Math.min(th0 + 4 * RAD, 68 * RAD));

  // Un arco muy vertical sube por debajo del aro y lo golpea: si la rama
  // ascendente pasa demasiado cerca del aro, se aplana el ángulo (más fuerza).
  const CLEAR = 0.115;
  let th = start;
  let v = vMax;
  for (let a = start; a > phi + 8 * RAD; a -= RAD) {
    const c = Math.cos(a);
    const den = 2 * c * c * (adx * Math.tan(a) - hUp);
    if (den <= 1e-6) continue;
    const vv = Math.sqrt((GRAVITY * adx * adx) / den);
    th = a;
    v = vv;
    let free = true;
    if (hUp > 0) {
      const vy = vv * Math.sin(a);
      const disc = vy * vy - 2 * GRAVITY * hUp;
      if (disc > 0) free = adx - vv * c * ((vy - Math.sqrt(disc)) / GRAVITY) >= CLEAR;
    }
    if (free && vv / vMax <= 0.97) break;
  }
  const c = Math.cos(th);
  return {
    angleDeg: (Math.atan2(-Math.sin(th), dir * c) * 180) / Math.PI,
    power: clamp(v / vMax, 0.2, 1),
  };
}

export function dragGeometry(
  attempt: number,
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
  customOrigin?: { x: number; y: number },
): ShotGeometry {
  const a = safeAspect(aspect);
  const zone = Number.isFinite(spec.zone) ? spec.zone : 20;
  const origin = customOrigin ?? ballOrigin(attempt);
  const rim = rimPoint(attempt);
  const dx = (rim.x - origin.x) / 100;
  const dy = ((rim.y - origin.y) / 100) * a;
  const distance = Math.hypot(dx, dy);
  const vMax = launchSpeedMax(a);
  const ref = referenceArc(dx, -dy, vMax);
  return {
    origin,
    rim,
    aspect: a,
    distance,
    optimalAngle: ref.angleDeg,
    idealPower: ref.power,
    angleTol: clamp(1.4 + zone * 0.085, 2.0, 6.0),
    powerTol: clamp(0.018 + zone * 0.0007, 0.02, 0.055),
    maxPull: MAX_PULL,
    minPull: MIN_PULL,
    // Dificultad media: boca del aro ~3x el diámetro del balón.
    rimHalf: clamp(0.058 + zone * 0.00036, 0.06, 0.076),
    ballR: BALL_R / 100,
    vMax,
    gravity: GRAVITY,
  };
}

/* ------------------------------------------------------------------ */
/*  Simulación                                                         */
/* ------------------------------------------------------------------ */

interface SimResult {
  made: boolean;
  swish: boolean;
  miss?: MissKind;
  board: boolean;
  pts: Array<{ x: number; y: number }>; // % de arena, separados SIM_DT
  events: FlightEvent[];
}

function simulate(g: ShotGeometry, angleDeg: number, power: number): SimResult {
  const a = g.aspect;
  const G = g.gravity;
  const br = g.ballR;
  const h = g.rimHalf;
  const rx = g.rim.x / 100;
  const ry = (g.rim.y / 100) * a;
  const bx = rx + h + BOARD_GAP;
  const bTop = ry - (BOARD_UP_PCT / 100) * a;
  const bBot = ry + (BOARD_DOWN_PCT / 100) * a;
  const floorY = (FLOOR_Y / 100) * a;
  const minD = br + RIM_TUBE_R / 100;

  const ang = Number.isFinite(angleDeg) ? angleDeg * RAD : 0;
  const pw = clamp(Number.isFinite(power) ? power : 0, 0, 1);
  const speed = pw * g.vMax;

  let x = g.origin.x / 100;
  let y = (g.origin.y / 100) * a;
  let vx = Math.cos(ang) * speed;
  let vy = Math.sin(ang) * speed;

  const toPct = (px: number, py: number) => ({ x: px * 100, y: (py / a) * 100 });
  const pts = [toPct(x, y)];
  const events: FlightEvent[] = [];

  let t = 0;
  let made = false;
  let madeAt = 0;
  let board = false;
  let rimTouched = false;
  let floorHits = 0;
  let floorAt = 0;
  let xCross: number | null = null;

  const addEvent = (kind: FlightEvent['kind']): void => {
    const tMs = Math.round(t * 1000);
    const last = events[events.length - 1];
    if (last && last.kind === kind && tMs - last.tMs < 90) return;
    events.push({ tMs, kind });
  };

  const steps = Math.ceil(MAX_SIM_S / SIM_DT);
  for (let i = 0; i < steps; i++) {
    const px = x;
    const py = y;
    x += vx * SIM_DT;
    y += vy * SIM_DT + 0.5 * G * SIM_DT * SIM_DT;
    vy += G * SIM_DT;
    t += SIM_DT;

    if (!made) {
      // Tablero (solo choca por su cara frontal).
      if (
        vx > 0 &&
        x + br > bx &&
        px + br <= bx + 0.004 &&
        y > bTop &&
        y < bBot
      ) {
        x = bx - br;
        if (vx > 0.08) addEvent('board');
        vx = -vx * REST_BOARD;
        vy *= 0.92;
        board = true;
      }

      // Los dos bordes del aro (círculos).
      for (const ex of [rx - h, rx + h]) {
        const dx = x - ex;
        const dy = y - ry;
        const d = Math.hypot(dx, dy);
        if (d < minD && d > 1e-9) {
          const nx = dx / d;
          const ny = dy / d;
          x = ex + nx * minD;
          y = ry + ny * minD;
          const vn = vx * nx + vy * ny;
          if (vn < 0) {
            vx -= (1 + REST_RIM) * vn * nx;
            vy -= (1 + REST_RIM) * vn * ny;
            vx *= 0.96;
            if (-vn > 0.05) {
              rimTouched = true;
              addEvent('rim');
            }
          }
        }
      }

      // Canasta: cruza el plano del aro de arriba abajo por dentro de la boca.
      if (py < ry && y >= ry && vy > 0) {
        const f = (ry - py) / (y - py);
        const xc = px + (x - px) * f;
        if (xCross === null) xCross = xc;
        if (Math.abs(xc - rx) < h) {
          made = true;
          madeAt = t;
          addEvent('net');
        }
      }
    } else {
      // La red frena el balón y lo centra bajo el aro.
      vx = vx * Math.exp(-5 * SIM_DT) + (rx - x) * 24 * SIM_DT;
      vy *= Math.exp(-9 * SIM_DT);
    }

    if (!made && y >= floorY) {
      y = floorY;
      if (vy > 0) {
        vy = -vy * REST_FLOOR;
        vx *= 0.82;
        floorHits++;
        if (floorHits === 1) floorAt = t;
        addEvent('floor');
      }
      if (Math.abs(vy) < 0.12) vy = 0;
    }

    pts.push(toPct(x, y));

    if (made && t - madeAt >= NET_S) break;
    if (
      !made &&
      (floorHits >= 2 || (floorHits >= 1 && t - floorAt > 0.45) || x < -0.08 || x > 1.08)
    ) {
      break;
    }
  }

  // Nº impar de puntos => nº par de pasos => pares (inicio, medio, fin) exactos.
  while (pts.length < 3 || pts.length % 2 === 0) pts.push({ ...pts[pts.length - 1] });

  let miss: MissKind | undefined;
  if (!made) {
    // Sin cruce descendente por el plano del aro = no llegó arriba (corto),
    // salvo que saliera volando por el lado contrario (largo).
    if (board) miss = 'long';
    else if (xCross === null) miss = x > 1 ? 'long' : 'short';
    else miss = xCross >= rx ? 'long' : 'short';
  }

  return {
    made,
    swish: made && !rimTouched && !board,
    miss,
    board,
    pts,
    events,
  };
}

/* ------------------------------------------------------------------ */
/*  API pública                                                        */
/* ------------------------------------------------------------------ */

export function shotError(g: ShotGeometry, angleDeg: number, power: number): ShotError {
  const angleDelta = angleDeg - g.optimalAngle;
  const powerDelta = power - g.idealPower;
  const sim = simulate(g, angleDeg, power);
  const err: ShotError = {
    angleDelta,
    powerDelta,
    angleOk: Math.abs(angleDelta) <= g.angleTol,
    powerOk: Math.abs(powerDelta) <= g.powerTol,
    hit: sim.made,
    board: sim.board,
    swish: sim.swish,
  };
  if (sim.miss) err.miss = sim.miss;
  return err;
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
 * `power` (0..1) escala la velocidad de salida: más tirón = más alcance.
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
 * El resultado sale de simular el vuelo (gravedad + rebotes), no de una
 * tolerancia fija: cualquier combinación ángulo/potencia que meta el balón
 * por el aro vale (arcos bajos, altos o de tablero).
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
  if (e.miss) return e.miss;
  if (!e.angleOk) return e.angleDelta < 0 ? 'wide-left' : 'wide-right';
  return e.powerDelta < 0 ? 'short' : 'long';
}

export function boardBounce(_g: ShotGeometry, e: ShotError): boolean {
  return !!e.board;
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
  const sim = simulate(g, angleDeg, power);
  const pts = sim.pts;

  const segs: PathSeg[] = [];
  for (let i = 0; i + 2 < pts.length; i += 2) {
    const p0 = pts[i];
    const pm = pts[i + 1];
    const p1 = pts[i + 2];
    segs.push({
      from: p0,
      to: p1,
      curve: { x: 2 * pm.x - (p0.x + p1.x) / 2, y: 2 * pm.y - (p0.y + p1.y) / 2 },
    });
  }

  const plan: FlightPlan = {
    verdict: sim.made ? 'make' : 'miss',
    board: sim.board,
    swish: sim.swish,
    segs,
    events: sim.events,
    totalMs: Math.max(1, Math.round((pts.length - 1) * SIM_DT * 1000)),
  };
  if (sim.miss) plan.miss = sim.miss;
  return plan;
}

/**
 * Posición del balón en el instante `tMs`. `seg` es la FASE del vuelo:
 * 0 = vuelo libre y +1 por cada impacto (aro, tablero, red, suelo).
 */
export function flightPoint(plan: FlightPlan, tMs: number): { x: number; y: number; seg: number } {
  const segs = plan.segs;
  const n = segs.length;
  if (n === 0) return { x: 0, y: 0, seg: 0 };
  const total = plan.totalMs;
  const t = clamp(Number.isFinite(tMs) ? tMs : 0, 0, total);
  const phase = plan.events ? plan.events.filter((e) => e.tMs <= t).length : 0;

  const span = total / n;
  const i = Math.min(n - 1, Math.floor(t / span));
  const u = clamp((t - i * span) / span, 0, 1);
  const cur = segs[i];
  if (cur.curve) {
    const c = cur.curve;
    const w = 1 - u;
    return {
      x: w * w * cur.from.x + 2 * w * u * c.x + u * u * cur.to.x,
      y: w * w * cur.from.y + 2 * w * u * c.y + u * u * cur.to.y,
      seg: phase,
    };
  }
  return {
    x: cur.from.x + (cur.to.x - cur.from.x) * u,
    y: cur.from.y + (cur.to.y - cur.from.y) * u,
    seg: phase,
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

/**
 * Puntos de la guía de puntería (estilo tirachinas): enseña solo el primer
 * tramo del arco para que el jugador deba estimar dónde cae. Dibujar como
 * puntos que se desvanecen.
 */
export function trajectoryPreview(
  attempt: number,
  pointer: { x: number; y: number },
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
  aspect = 1,
  customOrigin?: { x: number; y: number },
  seconds = PREVIEW_SECONDS,
  count = PREVIEW_DOTS,
): Array<{ x: number; y: number }> {
  const g = dragGeometry(attempt, spec, aspect, customOrigin);
  const aim = aimFromDrag(g.origin, pointer, aspect);
  if (aim.length < g.minPull) return [];
  const sim = simulate(g, aim.angleDeg, aim.power);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= count; i++) {
    const idx = Math.round(((i / count) * seconds) / SIM_DT);
    if (idx >= sim.pts.length) break;
    out.push(sim.pts[idx]);
  }
  return out;
}

/**
 * Geometría del aro y el tablero (en % de la arena) para dibujarlos con las
 * mismas medidas que usa la física.
 */
export function hoopLayout(g: ShotGeometry): {
  rimLeft: { x: number; y: number };
  rimRight: { x: number; y: number };
  rimTube: number;
  board: { x: number; top: number; bottom: number };
  ballRadius: number;
} {
  const a = g.aspect;
  const h = g.rimHalf * 100;
  return {
    rimLeft: { x: g.rim.x - h, y: g.rim.y },
    rimRight: { x: g.rim.x + h, y: g.rim.y },
    rimTube: RIM_TUBE_R,
    board: {
      x: g.rim.x + h + BOARD_GAP * 100,
      top: g.rim.y - BOARD_UP_PCT,
      bottom: g.rim.y + BOARD_DOWN_PCT,
    },
    ballRadius: BALL_R, // % del ANCHO; en vertical equivale a BALL_R / aspect
  };
}

/** Posiciones de tiro: siempre a la izquierda del aro (el tablero está a su derecha). */
export const COURT_SPOTS: Array<{ x: number; y: number }> = [
  { x: 16, y: 76 }, // lejos, esquina izquierda
  { x: 34, y: 84 }, // frontal baja
  { x: 46, y: 78 }, // cerca, baja
  { x: 24, y: 64 }, // media distancia izquierda
  { x: 42, y: 62 }, // media distancia
  { x: 14, y: 58 }, // lejos, alta
  { x: 44, y: 70 }, // cerca, media
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
    x: clamp(Math.round((base.x + jx) * 10) / 10, 12, 48),
    y: clamp(Math.round((base.y + jy) * 10) / 10, 56, 86),
  };
}