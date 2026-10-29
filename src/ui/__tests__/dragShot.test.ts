/** @vitest-environment node */
import {
  BALL_R,
  COURT_SPOTS,
  RIM_X,
  RIM_Y,
  MAX_FLIGHT_S,
  MIN_PULL,
  RIM_HALF,
  RIM_HEIGHT,
  RELEASE_HEIGHT,
  SUBSTEP,
  aimFromDrag,
  courtSpot,
  createFlight,
  entryAngle,
  pointerNearBall,
  project,
  setupFor,
  shotDistance,
  simulateShot,
  stepFlight,
  type Vec,
} from '../minigames/dragShot';

const spec = { zone: 30 };
const ASPECT = 0.675;

/** Busca un (ángulo, potencia) que entre desde `origin`. */
function findShot(origin: Vec, aspect = ASPECT): { angle: number; power: number } | null {
  for (let angle = 25; angle <= 75; angle += 1) {
    for (let power = 0.05; power <= 1.0001; power += 0.004) {
      if (simulateShot(origin, angle, power, spec, aspect).made) {
        return { angle, power: Math.round(power * 1000) / 1000 };
      }
    }
  }
  return null;
}

describe('física de proyectil', () => {
  const spot = { x: 38, y: 84 };
  const shot = findShot(spot)!;

  it('cada posición de la cancha tiene al menos un tiro que entra', () => {
    for (const s of COURT_SPOTS) {
      expect(findShot(s), `sin solución desde ${s.x},${s.y}`).not.toBeNull();
    }
  });

  it('la trayectoria es una parábola de verdad, no una recta', () => {
    const sim = simulateShot(spot, shot.angle, shot.power, spec, ASPECT);
    expect(sim.made).toBe(true);
    const start = sim.path[0];
    const end = sim.path[sim.path.length - 1];
    // Punto medio del vuelo: si fuese una recta estaría sobre la cuerda.
    const mid = sim.path[Math.floor(sim.path.length / 2)];
    const chordY = (start.y + end.y) / 2;
    expect(mid.y).toBeLessThan(chordY - 12);
  });

  it('sube antes de bajar: el pico está por encima del aro', () => {
    const setup = setupFor(spot, ASPECT);
    const f = createFlight(spot, shot.angle, shot.power, ASPECT);
    let peakS = f.s;
    let peakH = f.h;
    let guard = 0;
    while (!f.done && guard < MAX_FLIGHT_S / SUBSTEP + 4) {
      stepFlight(f, SUBSTEP, spec, setup);
      if (f.h > peakH) {
        peakH = f.h;
        peakS = f.s;
      }
      guard += 1;
    }
    expect(peakH).toBeGreaterThan(RELEASE_HEIGHT + 8);
    expect(peakS).toBeGreaterThan(0);
    expect(peakH).toBeGreaterThan(RIM_HEIGHT + 4);
  });

  it('el ángulo de entrada en el aro es realista (35°–80°)', () => {
    const entry = entryAngle(spot, shot.angle, shot.power, ASPECT);
    expect(entry).toBeGreaterThan(35);
    expect(entry).toBeLessThan(80);
  });

  it('poca potencia se queda corta y mucha se pasa', () => {
    const weak = simulateShot(spot, shot.angle, Math.max(0.05, shot.power - 0.25), spec, ASPECT);
    const strong = simulateShot(spot, shot.angle, Math.min(1, shot.power + 0.35), spec, ASPECT);
    expect(weak.made).toBe(false);
    expect(strong.made).toBe(false);
  });

  it('el aro es sólido: hay tiros que rebotan en el hierro y no entran', () => {
    const setup = setupFor(spot, ASPECT);
    let found = false;
    for (let angle = 40; angle <= 70 && !found; angle += 1) {
      for (let power = 0.1; power <= 1.0001 && !found; power += 0.005) {
        const f = createFlight(spot, angle, power, ASPECT);
        let guard = 0;
        while (!f.done && guard < MAX_FLIGHT_S / SUBSTEP + 4) {
          stepFlight(f, SUBSTEP, spec, setup);
          guard += 1;
        }
        if (f.touchedRim) {
          expect(f.made).toBe(false);
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('no se puede anotar después de tocar el suelo', () => {
    const setup = setupFor(spot, ASPECT);
    const f = createFlight(spot, shot.angle, 0.1, ASPECT);
    let guard = 0;
    while (!f.done && guard < MAX_FLIGHT_S / SUBSTEP + 4) {
      stepFlight(f, SUBSTEP, spec, setup);
      guard += 1;
    }
    expect(f.made).toBe(false);
    expect(f.touchedFloor).toBe(true);
  });
});

describe('proyección a pantalla', () => {
  it('la salida cae en las manos del tirador y la llegada en el aro', () => {
    const setup = setupFor({ x: 30, y: 80 }, ASPECT);
    const release = project(setup, 0, RELEASE_HEIGHT);
    expect(release.x).toBeCloseTo(30, 4);
    expect(release.y).toBeLessThan(80);
    const atRim = project(setup, setup.distance, RIM_HEIGHT);
    expect(atRim.x).toBeCloseTo(RIM_X, 4);
    expect(atRim.y).toBeCloseTo(RIM_Y, 4);
    // Más altura = más arriba en pantalla.
    expect(project(setup, setup.distance * 0.5, RIM_HEIGHT + 10).y)
      .toBeLessThan(project(setup, setup.distance * 0.5, RIM_HEIGHT).y);
  });

  it('la distancia al aro crece al alejarse del mismo', () => {
    expect(shotDistance({ x: 60, y: 60 }, ASPECT)).toBeLessThan(shotDistance({ x: 24, y: 90 }, ASPECT));
  });
});

describe('arrastre (tirachinas)', () => {
  const origin = { x: 40, y: 80 };

  it('tirar hacia abajo-izquierda lanza hacia arriba-derecha', () => {
    const aim = aimFromDrag(origin, { x: 30, y: 95 }, ASPECT);
    expect(aim.angleDeg).toBeGreaterThan(30);
    expect(aim.angleDeg).toBeLessThan(70);
    expect(aim.power).toBeGreaterThan(MIN_PULL);
  });

  it('arrastrar más da más potencia', () => {
    const small = aimFromDrag(origin, { x: 35, y: 88 }, ASPECT);
    const big = aimFromDrag(origin, { x: 20, y: 99 }, ASPECT);
    expect(big.power).toBeGreaterThan(small.power);
    expect(big.power).toBeLessThanOrEqual(1);
  });

  it('hay que empezar cerca del balón', () => {
    expect(pointerNearBall(origin, { x: 41, y: 81 }, ASPECT)).toBe(true);
    expect(pointerNearBall(origin, { x: 78, y: 34 }, ASPECT)).toBe(false);
  });
});

describe('posiciones de tiro', () => {
  it('cada tiro sale desde un sitio distinto', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const p = courtSpot(i, 7);
      seen.add(`${p.x},${p.y}`);
    }
    expect(seen.size).toBe(8);
  });

  it('siempre se tira desde delante del aro y dentro de la cancha', () => {
    for (let i = 0; i < 40; i += 1) {
      const p = courtSpot(i, 3);
      expect(p.x).toBeGreaterThan(10);
      expect(p.x).toBeLessThan(70);
      expect(p.y).toBeGreaterThan(50);
      expect(p.y).toBeLessThan(93);
      expect(shotDistance(p, ASPECT)).toBeGreaterThan(RIM_HALF + BALL_R);
    }
  });
});
