import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';

/**
 * Drag & Shoot — Física 2.5D realista con buena UX.
 *
 * Cambios clave vs versión anterior:
 * - Arrastre DIRECTO: arrastras HACIA donde quieres que vaya el balón (no tirachinas inverso)
 * - Preview de trayectoria en tiempo real mientras arrastras
 * - Potencia = distancia del arrastre (lineal, fácil de controlar)
 * - Curva/efecto = componente perpendicular al eje tirador→aro
 * - Parámetros más permisivos: banda de acierto mayor, ángulo de entrada más bajo
 * - Rebotes físicos creíbles (aro, tablero, suelo)
 */

// ============ CONSTANTES DEL MUNDO (unidades de "cancha") ============

/** Centro del aro en coordenadas de pantalla % (0-100). */
export const RIM_X = 80;
export const RIM_Y = 46;

/** Geometría del aro y tablero. */
export const RIM_HALF = 2.0;        // radio interior del aro
export const RIM_HEIGHT = 22;       // altura del aro sobre el suelo
export const RELEASE_HEIGHT = 15.5; // altura de salida del balón (manos)
export const BALL_R = 0.9;          // radio del balón
export const LIP_R = 0.15;          // grosor del aro (para colisión toroide)
export const BACKBOARD_OFFSET = 2.2; // distancia aro→tablero
export const BACKBOARD_TOP = RIM_HEIGHT + 9;
export const BACKBOARD_BOTTOM = RIM_HEIGHT - 1;
export const BACKBOARD_HALF_WIDTH = 4.8;

// Física
export const GRAVITY = 65;          // gravedad (unidades/s²) - un poco más suave
export const AIR_DRAG = 0.02;       // resistencia aire horizontal
export const LIFT_DRAG = 0.01;      // resistencia aire vertical
export const SPIN_DECAY = 0.08;     // decaimiento efecto lateral

// Potencia
export const SPEED_MIN = 18;
export const SPEED_MAX = 140;
export const MIN_PULL = 0.04;       // arrastre mínimo para lanzar
export const MAX_PULL = 0.45;       // arrastre para potencia máx (en % de pantalla)

// Ángulos
export const MIN_ANGLE = 28;        // ángulo mínimo lanzamiento (grados)
export const MAX_ANGLE = 75;        // ángulo máximo
export const IDEAL_ANGLE = 52;      // ángulo ideal para distancia media

// Entrada en aro
export const MIN_ENTRY_SLOPE = 0.35; // tangente mínima ángulo entrada (~19°) - MÁS PERMISIVO
export const RIM_RESTITUTION = 0.45; // restitución aro (rebote)
export const BOARD_RESTITUTION = 0.55; // restitución tablero
export const FLOOR_RESTITUTION = 0.35; // restitución suelo

// Simulación
export const SUBSTEP = 1 / 240;     // paso fijo 240 Hz
export const MAX_FLIGHT_S = 6;

// Visual
export const VISUAL_ARC_SCALE = 1.7; // escala visual del arco (perspectiva)
export const RELEASE_LIFT = 7;       // elevación visual punto salida

// ============ TIPOS ============

export interface Vec { x: number; y: number }

export interface Flight {
  // Posición en plano 2.5D
  s: number;      // distancia horizontal sobre eje tirador→aro
  lat: number;    // desvío lateral (curva)
  h: number;      // altura sobre suelo

  // Velocidades
  vs: number;     // velocidad horizontal (hacia aro)
  vlat: number;   // velocidad lateral (efecto)
  vh: number;     // velocidad vertical

  // Estado
  t: number;      // tiempo transcurrido
  done: boolean;
  made: boolean;
  touchedRim: boolean;
  touchedBoard: boolean;
  touchedFloor: boolean;
  apex: number;   // altura máxima

  // Para debug/visualización
  curve: number;  // efecto aplicado [-1, 1]
}

export type ShotEvent = 'rim' | 'board' | 'floor' | 'score';

export interface ShotResult {
  made: boolean;
  touchedRim: boolean;
  touchedBoard: boolean;
  events: ShotEvent[];
  path: Vec[];          // trayectoria en pantalla (%)
  seconds: number;
  apex: number;
  entryAngle?: number;  // ángulo de entrada en aro (grados)
  missKind?: 'short' | 'long' | 'left' | 'right';
}

export interface Setup {
  origin: Vec;     // posición tirador en pantalla (%)
  distance: number; // distancia horizontal real (unidades cancha)
  aspect: number;   // aspect ratio pantalla
}

export interface AimResult {
  angleDeg: number;  // ángulo lanzamiento sobre horizontal
  power: number;     // 0-1
  curve: number;     // -1 a 1 (efecto lateral)
  length: number;    // distancia arrastre normalizada
  pullStart: Vec;    // donde empezó el arrastre (centro balón)
  pullEnd: Vec;      // donde terminó
  velocity: { vs: number; vh: number; vlat: number }; // velocidades iniciales
  previewPath: Vec[]; // trayectoria preview para mostrar mientras arrastras
}

// ============ UTILIDADES ============

const rad = (deg: number): number => (deg * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

export const safeAspect = (aspect: number): number =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 0.675;

/** Distancia horizontal real entre tirador y aro (unidades cancha). */
export function shotDistance(origin: Vec, aspect = 1): number {
  const a = safeAspect(aspect);
  const dx = RIM_X - origin.x;
  const dy = (RIM_Y - origin.y) * a;
  return Math.hypot(dx, dy) / 100 * 100; // normalizado a unidades de cancha
}

export function setupFor(origin: Vec, aspect = 1): Setup {
  return { origin: { ...origin }, distance: shotDistance(origin, aspect), aspect: safeAspect(aspect) };
}

/**
 * Proyecta punto del plano (s, h, lat) a pantalla (%).
 * s=0 → manos tirador, s=D,h=RIM_HEIGHT → centro aro.
 */
export function project(setup: Setup, s: number, h: number, lat = 0): Vec {
  const D = Math.max(1, setup.distance);
  const k = clamp(s / D, -0.5, 1.5);
  const kRef = clamp(s / D, 0, 1);

  // Interpolación lineal en pantalla
  const lineX = setup.origin.x + (RIM_X - setup.origin.x) * k;
  const lineY = setup.origin.y + (RIM_Y - setup.origin.y) * k;

  // Vector perpendicular para desvío lateral
  const dx = RIM_X - setup.origin.x;
  const dy = (RIM_Y - setup.origin.y) * setup.aspect;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = (dx / len) / setup.aspect;

  // Altura de referencia de la recta tirador→aro
  const refH = RELEASE_HEIGHT + (RIM_HEIGHT - RELEASE_HEIGHT) * kRef;

  return {
    x: lineX + nx * lat * 4.5,
    y: lineY + ny * lat * 4.5 - (h - refH) * VISUAL_ARC_SCALE - RELEASE_LIFT * (1 - kRef),
  };
}

/** Banda de ayuda al acierto (más generosa que el aro físico). */
export function assistBand(zone: number): number {
  const z = Number.isFinite(zone) ? zone : 30;
  return clamp(RIM_HALF + z * 0.07, RIM_HALF + 0.3, RIM_HALF + 3.0);
}

/** Velocidad ideal para entrar al centro del aro desde esta distancia/ángulo. */
export function idealSpeed(origin: Vec, angleDeg: number, aspect = 1): number {
  const distance = shotDistance(origin, aspect);
  const theta = rad(clamp(angleDeg, MIN_ANGLE, MAX_ANGLE));
  const rise = RIM_HEIGHT - RELEASE_HEIGHT;
  const targetD = distance + 0.15; // apuntamos un pelín por delante del centro

  const denom = 2 * Math.cos(theta) ** 2 * (targetD * Math.tan(theta) - rise);
  if (!(denom > 0.3)) return 55;

  const v2 = (GRAVITY * targetD * targetD) / denom;
  return clamp(Math.sqrt(Math.max(0, v2)), SPEED_MIN, SPEED_MAX);
}

/** Calcula velocidades iniciales a partir de ángulo, potencia y curva. */
export function launchVelocity(
  angleDeg: number,
  power: number,
  origin: Vec,
  aspect = 1,
  curve = 0
): { vs: number; vh: number; vlat: number } {
  const p = clamp(power, 0, 1);
  const reference = idealSpeed(origin, angleDeg, aspect);
  const sweetP = 0.5; // punto dulce en 50% potencia
  // Curva de potencia: más lineal alrededor del punto dulce
  const speed = clamp(
    reference * (0.7 + 0.6 * p / sweetP),
    SPEED_MIN,
    SPEED_MAX
  );

  const theta = rad(clamp(angleDeg, MIN_ANGLE, MAX_ANGLE));
  const phi = rad(clamp(curve * 30, -35, 35)); // curva máx ±35°

  return {
    vs: speed * Math.cos(theta) * Math.cos(phi),
    vh: speed * Math.sin(theta),
    vlat: speed * Math.cos(theta) * Math.sin(phi),
  };
}

/** Crea estado inicial de vuelo. */
export function createFlight(
  origin: Vec,
  angleDeg: number,
  power: number,
  aspect = 1,
  curve = 0
): Flight {
  const v = launchVelocity(angleDeg, power, origin, aspect, curve);
  return {
    s: 0,
    lat: 0,
    h: RELEASE_HEIGHT,
    vs: v.vs,
    vlat: v.vlat,
    vh: v.vh,
    t: 0,
    done: false,
    made: false,
    touchedRim: false,
    touchedBoard: false,
    touchedFloor: false,
    apex: RELEASE_HEIGHT,
    curve: clamp(curve, -1, 1),
  };
}

/** Rebote especular con pérdida de energía. */
function reflectVel(f: Flight, nx: number, ny: number, nz: number, restitution: number): void {
  const dot = f.vs * nx + f.vlat * ny + f.vh * nz;
  if (dot >= 0) return; // solo rebote si viene hacia la superficie
  f.vs = (f.vs - (1 + restitution) * dot * nx) * 0.95;
  f.vlat = (f.vlat - (1 + restitution) * dot * ny) * 0.95;
  f.vh = (f.vh - (1 + restitution) * dot * nz) * 0.95;
}

/**
 * Avanza un subpaso de simulación. Devuelve eventos ocurridos.
 */
export function stepFlight(
  f: Flight,
  dt: number,
  spec: Pick<MinigameSpec, 'zone'>,
  setup: Setup
): ShotEvent[] {
  const events: ShotEvent[] = [];
  if (f.done) return events;

  const D = Math.max(1, setup.distance);
  const prevS = f.s;
  const prevH = f.h;
  const prevLat = f.lat;

  // Fuerzas
  f.vh -= GRAVITY * dt;
  f.vs *= 1 - AIR_DRAG * dt;
  f.vlat *= 1 - SPIN_DECAY * dt;

  // Integración
  f.s += f.vs * dt;
  f.lat += f.vlat * dt;
  f.h += f.vh * dt;
  f.t += dt;
  if (f.h > f.apex) f.apex = f.h;

  // ===== 1. ENCESTE (cruce continuo del plano del aro) =====
  // Interpola entre subpasos para no perder el enceste cuando el balón cruza
  // la altura del aro entre dos frames de la simulación.
  const crossedRimHeight = prevH >= RIM_HEIGHT && f.h <= RIM_HEIGHT;
  const crossingT = crossedRimHeight
    ? clamp((prevH - RIM_HEIGHT) / Math.max(0.0001, prevH - f.h), 0, 1)
    : 0;
  const crossingS = prevS + (f.s - prevS) * crossingT;
  const crossingLat = prevLat + (f.lat - prevLat) * crossingT;
  const band = assistBand(spec.zone);
  const distFromCenter = Math.hypot(crossingS - D, crossingLat);

  if (
    !f.made &&
    !f.touchedFloor &&
    f.vh < 0 &&
    crossedRimHeight &&
    distFromCenter <= band &&
    -f.vh >= f.vs * (MIN_ENTRY_SLOPE * 0.6)
  ) {
    f.made = true;
    f.done = true;
    f.s = D;
    f.lat = 0;
    f.h = RIM_HEIGHT;
    events.push('score');
    return events;
  }

  // ===== 2. ARO (toroide 3D) =====
  const distHoriz = Math.hypot(f.s - D, f.lat);
  const distToWire = Math.hypot(distHoriz - RIM_HALF, f.h - RIM_HEIGHT);
  const minWireDist = BALL_R + LIP_R;

  if (distToWire < minWireDist && distToWire > 0.001) {
    // Normal del toroide
    const nr = (distHoriz - RIM_HALF) / distToWire;
    const nh = (f.h - RIM_HEIGHT) / distToWire;
    const ns = distHoriz > 0.001 ? nr * (f.s - D) / distHoriz : 0;
    const nlat = distHoriz > 0.001 ? nr * f.lat / distHoriz : 0;

    // Empuja fuera
    const push = minWireDist - distToWire;
    f.s += ns * push;
    f.lat += nlat * push;
    f.h += nh * push;

    // Rebote
    reflectVel(f, ns, nlat, nh, RIM_RESTITUTION);
    f.touchedRim = true;
    if (!events.includes('rim')) events.push('rim');
  }

  // ===== 3. TABLERO (plano vertical detrás del aro) =====
  const boardS = D + BACKBOARD_OFFSET;
  if (
    f.s + BALL_R >= boardS &&
    f.h >= BACKBOARD_BOTTOM &&
    f.h <= BACKBOARD_TOP &&
    Math.abs(f.lat) <= BACKBOARD_HALF_WIDTH &&
    f.vs > 0
  ) {
    f.s = boardS - BALL_R;
    f.vs = -f.vs * BOARD_RESTITUTION;
    f.vh *= 0.9;
    f.vlat *= 0.9;
    f.touchedBoard = true;
    if (!events.includes('board')) events.push('board');
  }

  // ===== 4. SUELO =====
  if (f.h <= BALL_R) {
    f.h = BALL_R;
    f.touchedFloor = true;
    if (Math.abs(f.vh) < 15) { // muere
      f.done = true;
      if (!events.includes('floor')) events.push('floor');
      return events;
    }
    // Rebota
    f.vh = Math.abs(f.vh) * FLOOR_RESTITUTION;
    f.vs *= 0.65;
    f.vlat *= 0.65;
    if (!events.includes('floor')) events.push('floor');
  }

  // Límites
  if (f.s > D + 30 || f.s < -15 || f.t >= MAX_FLIGHT_S) {
    f.done = true;
    if (!events.includes('floor')) events.push('floor');
  }

  return events;
}

/** Simula tiro completo (para tests y modo instantáneo). */
export function simulateShot(
  origin: Vec,
  angleDeg: number,
  power: number,
  spec: Pick<MinigameSpec, 'zone'>,
  aspect = 1
): ShotResult {
  const setup = setupFor(origin, aspect);
  const f = createFlight(origin, angleDeg, power, aspect);
  const events: ShotEvent[] = [];
  const path: Vec[] = [project(setup, f.s, f.h, f.lat)];
  let guard = 0;
  const D = Math.max(1, setup.distance);
  const band = assistBand(spec.zone);

  while (!f.done && guard < MAX_FLIGHT_S / SUBSTEP + 10) {
    events.push(...stepFlight(f, SUBSTEP, spec, setup));
    path.push(project(setup, f.s, f.h, f.lat));
    guard++;
  }

  // Ángulo de entrada
  let entryAngle: number | undefined;
  if (f.made) {
    const v = launchVelocity(angleDeg, power, origin, aspect);
    const disc = v.vh * v.vh + 2 * GRAVITY * (RELEASE_HEIGHT - RIM_HEIGHT);
    if (disc >= 0) {
      const t = (v.vh + Math.sqrt(disc)) / GRAVITY;
      const vs = v.vs * (1 - AIR_DRAG) ** t;
      const vh = v.vh - GRAVITY * t;
      entryAngle = deg(Math.atan2(-vh, vs));
    }
  }

  // Tipo de fallo
  let missKind: ShotResult['missKind'];
  if (!f.made) {
    if (f.touchedFloor && f.s < D - RIM_HALF) missKind = 'short';
    else if (f.touchedFloor && f.s > D + RIM_HALF) missKind = 'long';
    else if (f.lat < -band) missKind = 'left';
    else if (f.lat > band) missKind = 'right';
    else missKind = f.touchedBoard ? 'long' : 'short';
  }

  return {
    made: f.made,
    touchedRim: f.touchedRim,
    touchedBoard: f.touchedBoard,
    events,
    path,
    seconds: f.t,
    apex: f.apex,
    entryAngle,
    missKind,
  };
}

/** Clona estado de vuelo. */
export const cloneFlight = (f: Flight): Flight => ({ ...f });

// ============ PUNTERÍA DESDE ARRASTRE (DIRECTA, NO TIROCHINAS) ============

/**
 * Convierte arrastre en parámetros de tiro.
 * Arrastra HACIA donde quieres que vaya: arrastrar arriba-derecha → tira arriba-derecha.
 */
export function aimFromDrag(
  origin: Vec,
  pullEnd: Vec,
  aspect = 1
): AimResult {
  const a = safeAspect(aspect);

  // La medida empieza en el centro visible del balón, no en los pies del
  // jugador: así un clic sin arrastre no suma potencia ni altera el ángulo.
  const grip = project(setupFor(origin, a), 0, RELEASE_HEIGHT);
  const dragX = pullEnd.x - grip.x;
  const dragY = (pullEnd.y - grip.y) * a; // compensar aspect

  const length = Math.hypot(dragX, dragY) / 100; // normalizado a unidades cancha
  const power = clamp(length / MAX_PULL, 0, 1);

  // Eje de referencia: del tirador al aro
  const axisX = RIM_X - grip.x;
  const axisY = (RIM_Y - grip.y) * a;
  const axisDeg = deg(Math.atan2(-axisY, axisX)); // -Y porque pantalla Y crece hacia abajo

  // Dirección del arrastre
  const dragDeg = deg(Math.atan2(-dragY, dragX));

  // Diferencia = cuánto te desvías del centro
  let delta = dragDeg - axisDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;

  // Ángulo de lanzamiento: base + corrección por distancia
  const distance = shotDistance(origin, a);
  const baseAngle = IDEAL_ANGLE + Math.max(0, 28 - distance) * 1.2; // más cerca = más arco

  // Curva: componente perpendicular al eje (delta positivo = gira a la izquierda = curva negativa en convención world)
  const curve = clamp(-delta / 45, -1, 1); // ±45° desviación = curva máx

  // Ángulo final
  const angleDeg = clamp(baseAngle + delta * 0.25, MIN_ANGLE, MAX_ANGLE);

  // Velocidades para preview
  const velocity = launchVelocity(angleDeg, power, origin, a, curve);

  // Preview de trayectoria (simulación rápida sin colisiones complejas)
  const previewPath = generatePreviewPath(origin, velocity, a, setupFor(origin, a));

  return {
    angleDeg,
    power,
    curve,
    length,
    pullStart: grip,
    pullEnd,
    velocity,
    previewPath,
  };
}

/** Genera puntos de preview para mostrar mientras arrastras. */
function generatePreviewPath(
  origin: Vec,
  v: { vs: number; vh: number; vlat: number },
  aspect: number,
  setup: Setup
): Vec[] {
  const points: Vec[] = [];
  const D = Math.max(1, setup.distance);
  let s = 0, lat = 0, h = RELEASE_HEIGHT;
  let vs = v.vs, vlat = v.vlat, vh = v.vh;
  const dt = 0.02; // 50 Hz para preview (más rápido)

  points.push(project(setup, s, h, lat));

  for (let i = 0; i < 120 && s < D * 1.3 && h > -5; i++) {
    vh -= GRAVITY * dt;
    vs *= 1 - AIR_DRAG * dt;
    vlat *= 1 - SPIN_DECAY * dt;
    s += vs * dt;
    lat += vlat * dt;
    h += vh * dt;
    if (h < BALL_R) break;
    points.push(project(setup, s, h, lat));
  }
  return points;
}

/** Detecta si el puntero empieza cerca del balón. */
export function pointerNearBall(origin: Vec, pointer: Vec, aspect = 1, radius = 0.12): boolean {
  const a = safeAspect(aspect);
  const dx = (pointer.x - origin.x) / 100;
  const dy = ((pointer.y - origin.y) / 100) * a;
  return Math.hypot(dx, dy) <= radius;
}

// ============ POSICIONES DE TIRO ============

export const COURT_SPOTS: Vec[] = [
  { x: 26, y: 78 }, { x: 38, y: 84 }, { x: 50, y: 80 }, { x: 60, y: 72 },
  { x: 30, y: 62 }, { x: 46, y: 64 }, { x: 58, y: 58 }, { x: 22, y: 88 },
  { x: 66, y: 62 }, { x: 42, y: 90 }, { x: 34, y: 70 }, { x: 54, y: 76 },
];

export function courtSpot(attempt: number, seed = 0): Vec {
  const n = COURT_SPOTS.length;
  const a = Math.abs(Math.floor(attempt));
  const s = Math.abs(Math.floor(seed));
  const pick = (a * 7 + s * 3 + Math.floor(a / n) * 5) % n;
  const base = COURT_SPOTS[pick];
  const jitterX = (((a * 37 + s * 11) % 7) - 3) * 0.6;
  const jitterY = (((a * 23 + s * 13) % 7) - 3) * 0.5;
  return {
    x: Math.round(clamp(base.x + jitterX, 18, 70) * 10) / 10,
    y: Math.round(clamp(base.y + jitterY, 54, 91) * 10) / 10,
  };
}

/** Distancia al aro para UI. */
export const distanceToRim = shotDistance;

/**
 * Ángulo de entrada del balón en el aro para un lanzamiento limpio.
 * Lo usan los tests para comprobar que los tiros buenos entran cayendo.
 */
export function entryAngle(origin: Vec, angleDeg: number, power: number, aspect = 1): number {
  const v = launchVelocity(angleDeg, power, origin, aspect);
  const disc = v.vh * v.vh + 2 * GRAVITY * (RELEASE_HEIGHT - RIM_HEIGHT);
  if (disc < 0) return NaN;
  const t = (v.vh + Math.sqrt(disc)) / GRAVITY;
  const vs = v.vs * (1 - AIR_DRAG) ** t;
  const vh = v.vh - GRAVITY * t;
  return deg(Math.atan2(-vh, vs));
}