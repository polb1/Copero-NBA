import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';

/**
 * Física de tiro 2.5D para el minijuego.
 *
 * El fallo del modelo anterior era usar la `y` de pantalla como altura: la
 * canasta está "al fondo" (arriba) y el jugador delante (abajo), así que esa
 * `y` es PROFUNDIDAD, no altura. Aquí la simulación ocurre en un plano real
 * (distancia `s`, altura `h`) y luego se proyecta a la pantalla:
 *
 *   pantalla = origen + (canasta - origen) * (s / D) + (0, -h / aspecto)
 *
 * Con eso el balón sale del jugador, sube y cae dentro del aro con una
 * parábola de verdad, y el resultado lo decide la simulación (gravedad, aro y
 * tablero sólidos). Nada está precalculado ni guiado.
 */

/** Centro del aro en pantalla (porcentajes de la cancha). */
export const RIM_X = 80;
export const RIM_Y = 46;
/** Semiancho del aro, en unidades de distancia. */
export const RIM_HALF = 2.0;
/** Altura del aro sobre el suelo de la canasta. */
export const RIM_HEIGHT = 22;
/** Altura de salida del balón sobre los pies del tirador. */
export const RELEASE_HEIGHT = 15.5;
export const BALL_R = 0.9;
export const LIP_R = 0.15;
export const BACKBOARD_OFFSET = 2.2;
export const BACKBOARD_TOP = RIM_HEIGHT + 9;
export const BACKBOARD_BOTTOM = RIM_HEIGHT - 1;

/** Gravedad en unidades de distancia por segundo². */
export const GRAVITY = 70;
/** Mapeo potencia → velocidad inicial. */
export const SPEED_MIN = 20;
export const SPEED_MAX = 150;
/** Arrastre necesario para lanzar / potencia máxima. */
export const MIN_PULL = 0.05;
/** Ángulo de referencia: arrastrar recto hacia atrás lanza a 50°. */
export const AIM_BASE_ANGLE = 50;
/** Cuánto sube/baja el ángulo al desviar el arrastre de la recta. */
export const AIM_TILT_GAIN = 0.4;
export const MAX_PULL = 0.55;
/** Paso fijo (240 Hz) para que el balón no atraviese el aro. */
export const SUBSTEP = 1 / 240;
export const MAX_FLIGHT_S = 5;

export interface Vec { x: number; y: number }

export interface Flight {
  /** Distancia recorrida sobre la línea tirador→canasta. */
  s: number;
  /** Altura sobre el suelo. */
  h: number;
  vs: number;
  vh: number;
  t: number;
  done: boolean;
  made: boolean;
  touchedRim: boolean;
  touchedBoard: boolean;
  touchedFloor: boolean;
  apex: number;
}

export type ShotEvent = 'rim' | 'board' | 'floor' | 'score';

export interface ShotResult {
  made: boolean;
  touchedRim: boolean;
  touchedBoard: boolean;
  events: ShotEvent[];
  /** Trayectoria en pantalla, un punto por subpaso. */
  path: Vec[];
  seconds: number;
  /** Altura máxima alcanzada, en unidades de distancia. */
  apex: number;
}

export interface Setup {
  origin: Vec;
  /** Distancia horizontal (en el plano) entre tirador y aro. */
  distance: number;
  aspect: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

export const safeAspect = (aspect: number): number =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

/** Distancia real (en unidades de cancha) entre el tirador y el aro. */
export function shotDistance(origin: Vec, aspect = 1): number {
  const a = safeAspect(aspect);
  return Math.hypot(RIM_X - origin.x, (RIM_Y - origin.y) * a);
}

export function setupFor(origin: Vec, aspect = 1): Setup {
  return { origin: { ...origin }, distance: shotDistance(origin, aspect), aspect: safeAspect(aspect) };
}

/**
 * Escala visual de la altura: la cancha está dibujada en perspectiva, así que
 * el arco se pinta como un abultamiento sobre la recta tirador→aro (no como
 * altura a escala real, que saldría enorme).
 */
export const VISUAL_ARC = 1.9;
/** El balón sale de las manos, no de los pies: subida visual en el punto de salida. */
export const RELEASE_LIFT = 7;

/**
 * Proyecta un punto del plano (s, h) a la pantalla. Con `s=0` cae exactamente
 * en las manos del tirador y con `s=D, h=RIM_HEIGHT` exactamente en el aro.
 */
export function project(setup: Setup, s: number, h: number): Vec {
  const D = Math.max(1, setup.distance);
  const k = s / D;
  const kLine = clamp(k, -0.6, 1.6);
  const kRef = clamp(k, 0, 1);
  const lineY = setup.origin.y + (RIM_Y - setup.origin.y) * kLine;
  // Altura que tendría la recta tirador→aro en este punto.
  const refH = RELEASE_HEIGHT + (RIM_HEIGHT - RELEASE_HEIGHT) * kRef;
  return {
    x: setup.origin.x + (RIM_X - setup.origin.x) * kLine,
    y: lineY - (h - refH) * VISUAL_ARC - RELEASE_LIFT * (1 - kRef),
  };
}

/**
 * El balón tiene que caer dentro, no colarse plano: la velocidad vertical de
 * bajada debe superar esta fracción de la horizontal (45° de entrada).
 */
export const MIN_ENTRY_SLOPE = 0.45;

/** Franja de acierto alrededor del centro del aro. */
/**
 * Margen de ayuda a la puntería: si el balón cruza el plano del aro dentro de
 * este margen (algo mayor que el aro real) cuenta como dentro y se centra en el
 * aro al dibujarlo. Sin esto el gesto exigía una precisión de milímetros y no
 * entraba nunca.
 */
export function assistBand(zone: number): number {
  return scoringBand(zone) * 1.8;
}

export function scoringBand(zone: number): number {
  const z = Number.isFinite(zone) ? zone : 30;
  return clamp(RIM_HALF + z * 0.05, RIM_HALF, RIM_HALF + 2.2);
}

/**
 * Velocidad que haría entrar el balón justo en el aro desde `origin` con este
 * ángulo. Es la referencia con la que se normaliza la potencia: así el punto
 * dulce cae siempre hacia el 50 % del arrastre, en vez de moverse entre el 16 %
 * y el 66 % según la distancia.
 */
export function idealSpeed(origin: Vec, angleDeg: number, aspect = 1): number {
  const distance = shotDistance(origin, aspect);
  const theta = rad(clamp(angleDeg, 20, 84));
  const rise = RIM_HEIGHT - RELEASE_HEIGHT;
  const denom = 2 * Math.cos(theta) ** 2 * (distance * Math.tan(theta) - rise);
  if (!(denom > 0.5)) return 60;
  const v2 = (GRAVITY * distance * distance) / denom;
  return clamp(Math.sqrt(Math.max(0, v2)), 18, 150);
}

/**
 * Velocidad de salida. La potencia ya viene normalizada por `idealSpeed` de la
 * distancia: 0.5 = tiro perfecto, menos se queda corto, más se pasa.
 */
export function launchVelocity(
  angleDeg: number,
  power: number,
  origin?: Vec,
  aspect = 1,
): { vs: number; vh: number } {
  const p = clamp(Number.isFinite(power) ? power : 0, 0, 1);
  const reference = origin ? idealSpeed(origin, angleDeg, aspect) : 60;
  const speed = clamp(reference * (0.72 + 0.56 * p), SPEED_MIN, SPEED_MAX);
  const theta = rad(clamp(Number.isFinite(angleDeg) ? angleDeg : 0, -30, 85));
  return { vs: speed * Math.cos(theta), vh: speed * Math.sin(theta) };
}

export function createFlight(origin: Vec, angleDeg: number, power: number, aspect = 1): Flight {
  const v = launchVelocity(angleDeg, power, origin, aspect);
  return {
    s: 0,
    h: RELEASE_HEIGHT,
    vs: v.vs,
    vh: v.vh,
    t: 0,
    done: false,
    made: false,
    touchedRim: false,
    touchedBoard: false,
    touchedFloor: false,
    apex: RELEASE_HEIGHT,
  };
}

/** Rebote especular con pérdida de energía. */
function reflect(f: Flight, ns: number, nh: number, restitution: number): void {
  const dot = f.vs * ns + f.vh * nh;
  f.vs = (f.vs - 2 * dot * ns) * restitution;
  f.vh = (f.vh - 2 * dot * nh) * restitution;
}

/**
 * Avanza el vuelo `dt` segundos (muta) y devuelve lo que ha tocado. La colisión
 * se resuelve sacando el balón del obstáculo y reflejando la velocidad.
 */
export function stepFlight(
  f: Flight,
  dt: number,
  spec: Pick<MinigameSpec, 'zone'>,
  setup: Setup,
): ShotEvent[] {
  const events: ShotEvent[] = [];
  if (f.done) return events;
  const D = Math.max(1, setup.distance);
  const prevH = f.h;

  f.vh -= GRAVITY * dt;
  f.s += f.vs * dt;
  f.h += f.vh * dt;
  f.t += dt;
  if (f.h > f.apex) f.apex = f.h;

  // --- Acierto: el balón cruza el plano del aro bajando, dentro de la
  // abertura y sin haber tocado tablero ni suelo antes.
  const band = assistBand(spec.zone);
  if (
    !f.made &&
    !f.touchedBoard &&
    !f.touchedFloor &&
    !f.touchedRim &&
    f.vh < 0 &&
    -f.vh >= f.vs * MIN_ENTRY_SLOPE &&
    prevH >= RIM_HEIGHT &&
    f.h <= RIM_HEIGHT &&
    Math.abs(f.s - D) <= band
  ) {
    f.made = true;
    f.done = true;
    // Se centra en el aro para que el dibujo coincida con el acierto.
    f.s = D;
    f.h = RIM_HEIGHT;
    events.push('score');
    return events;
  }

  // --- Aro: dos círculos sólidos (delantero y trasero).
  for (const lip of [D - RIM_HALF, D + RIM_HALF]) {
    const ds = f.s - lip;
    const dh = f.h - RIM_HEIGHT;
    const dist = Math.hypot(ds, dh);
    const minDist = LIP_R + BALL_R;
    if (dist > 0.0001 && dist < minDist) {
      const ns = ds / dist;
      const nh = dh / dist;
      const push = minDist - dist;
      f.s += ns * push;
      f.h += nh * push;
      reflect(f, ns, nh, 0.42);
      f.vs *= 0.84;
      f.touchedRim = true;
      events.push('rim');
    }
  }

  // --- Tablero: plano vertical detrás del aro.
  const boardS = D + BACKBOARD_OFFSET;
  if (
    f.s + BALL_R >= boardS &&
    f.h >= BACKBOARD_BOTTOM &&
    f.h <= BACKBOARD_TOP &&
    f.vs > 0
  ) {
    f.s = boardS - BALL_R;
    f.vs = -f.vs * 0.46;
    f.vh *= 0.9;
    f.touchedBoard = true;
    events.push('board');
  }

  // --- Suelo: bota y muere cuando se queda sin energía.
  if (f.h <= BALL_R) {
    f.h = BALL_R;
    f.touchedFloor = true;
    if (Math.abs(f.vh) < 26) {
      f.done = true;
      events.push('floor');
      return events;
    }
    f.vh = Math.abs(f.vh) * 0.34;
    f.vs *= 0.7;
    events.push('floor');
  }

  if (f.s > D + 26 || f.s < -8) {
    f.done = true;
    events.push('floor');
    return events;
  }
  if (f.t >= MAX_FLIGHT_S) f.done = true;
  return events;
}

/** Simula un tiro completo; lo usan los tests y el modo sin animación. */
export function simulateShot(
  origin: Vec,
  angleDeg: number,
  power: number,
  spec: Pick<MinigameSpec, 'zone'>,
  aspect = 1,
): ShotResult {
  const setup = setupFor(origin, aspect);
  const f = createFlight(origin, angleDeg, power, aspect);
  const events: ShotEvent[] = [];
  const path: Vec[] = [project(setup, f.s, f.h)];
  let guard = 0;
  while (!f.done && guard < MAX_FLIGHT_S / SUBSTEP + 4) {
    events.push(...stepFlight(f, SUBSTEP, spec, setup));
    path.push(project(setup, f.s, f.h));
    guard += 1;
  }
  return {
    made: f.made,
    touchedRim: f.touchedRim,
    touchedBoard: f.touchedBoard,
    events,
    path,
    seconds: f.t,
    apex: f.apex,
  };
}

export const cloneFlight = (f: Flight): Flight => ({ ...f });

/**
 * Puntería de tirachinas: arrastras el balón en contra del objetivo y sale
 * disparado al lado contrario. El ángulo devuelto es el de lanzamiento sobre
 * la línea tirador→canasta.
 */
export function aimFromDrag(
  origin: Vec,
  pointer: Vec,
  aspect = 1,
): { angleDeg: number; power: number; length: number; pullX: number; pullY: number } {
  const a = safeAspect(aspect);
  const dx = origin.x - pointer.x;
  // Arrastrar hacia abajo (y de pantalla mayor) lanza hacia arriba.
  const dy = (pointer.y - origin.y) * a;
  const length = Math.hypot(dx, dy) / 100;

  // Eje de referencia: desde el BALÓN (las manos, que es donde se agarra y
  // donde el jugador ve la línea) hasta el aro, no desde los pies.
  const handY = origin.y - RELEASE_LIFT;
  const axisX = RIM_X - origin.x;
  const axisY = -(RIM_Y - handY) * a;
  const axisDeg = (Math.atan2(axisY, axisX) * 180) / Math.PI;

  // Ángulo respecto a "tirar recto hacia atrás" (el lanzamiento apunta al aro):
  // ese gesto da el arco de referencia (50°) y desviarse hacia abajo lo sube.
  // Así el gesto natural entra, en vez de salir plano como antes.
  const dragDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // El lanzamiento "recto" apunta justo al aro; su ángulo es el del eje.
  let delta = dragDeg - axisDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;

  // Cuanto más cerca está el aro, más vertical tiene que ser el tiro.
  const distance = shotDistance(origin, a);
  const base = AIM_BASE_ANGLE + Math.max(0, 32 - distance) * 1.7;

  return {
    angleDeg: clamp(base + delta * AIM_TILT_GAIN, 20, 84),
    power: clamp(length / MAX_PULL, 0, 1),
    length,
    pullX: clamp(pointer.x, 0, 100),
    pullY: clamp(pointer.y, 0, 100),
  };
}

export function pointerNearBall(origin: Vec, pointer: Vec, aspect = 1, radius = 0.14): boolean {
  const a = safeAspect(aspect);
  const dx = (pointer.x - origin.x) / 100;
  const dy = ((pointer.y - origin.y) / 100) * a;
  return Math.hypot(dx, dy) <= radius;
}

/** Posiciones de tiro: variedad de distancia y ángulo, siempre delante del aro. */
export const COURT_SPOTS: Vec[] = [
  { x: 26, y: 78 }, // ala izquierda
  { x: 38, y: 84 }, // frontal lejano
  { x: 50, y: 80 }, // frontal media
  { x: 60, y: 72 }, // ala derecha cercana
  { x: 30, y: 62 }, // media distancia izquierda
  { x: 46, y: 64 }, // media distancia frontal
  { x: 58, y: 58 }, // media distancia derecha
  { x: 22, y: 88 }, // esquina lejana
  { x: 66, y: 62 }, // tiro corto
  { x: 42, y: 90 }, // muy lejos, frontal
];

/**
 * Una posición distinta para cada tiro: determinista por (tiro, semilla) y sin
 * repetir la del tiro anterior.
 */
export function courtSpot(attempt: number, seed = 0): Vec {
  const n = COURT_SPOTS.length;
  const a = Math.abs(Math.floor(attempt));
  const s = Math.abs(Math.floor(seed));
  const pick = (a * 7 + s * 3 + Math.floor(a / n) * 5) % n;
  const base = COURT_SPOTS[pick];
  const jitterX = (((a * 37 + s * 11) % 7) - 3) * 0.7;
  const jitterY = (((a * 23 + s * 13) % 7) - 3) * 0.6;
  return {
    x: Math.round(clamp(base.x + jitterX, 18, 70) * 10) / 10,
    y: Math.round(clamp(base.y + jitterY, 54, 91) * 10) / 10,
  };
}

/**
 * Ángulo de entrada del balón en el aro para un lanzamiento limpio. Lo usan
 * los tests para comprobar que los tiros buenos entran como en la realidad
 * (entre ~35° y ~65° sobre la horizontal).
 */
export function entryAngle(origin: Vec, angleDeg: number, power: number, aspect = 1): number {
  const v = launchVelocity(angleDeg, power, origin, aspect);
  const disc = v.vh * v.vh + 2 * GRAVITY * (RELEASE_HEIGHT - RIM_HEIGHT);
  if (disc < 0) return NaN;
  const t = (v.vh + Math.sqrt(disc)) / GRAVITY;
  const vs = v.vs;
  const vh = v.vh - GRAVITY * t;
  return (Math.atan2(-vh, vs) * 180) / Math.PI;
}

/** Distancia a la canasta para una posición, en unidades de cancha. */
export const distanceToRim = shotDistance;
