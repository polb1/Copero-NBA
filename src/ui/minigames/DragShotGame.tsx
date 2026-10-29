import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';
import { t } from '../../i18n/i18n';
import { motionReduced } from '../motion';
import {
  BACKBOARD_BOTTOM,
  BACKBOARD_OFFSET,
  BACKBOARD_TOP,
  MIN_PULL,
  RIM_HEIGHT,
  RIM_X,
  RIM_Y,
  RIM_HALF,
  SUBSTEP,
  aimFromDrag,
  courtSpot,
  createFlight,
  pointerNearBall,
  project,
  setupFor,
  simulateShot,
  stepFlight,
  type Flight,
  type Setup,
  type Vec,
} from './dragShot';

type Phase = 'aim' | 'flight' | 'result';
type MissKind = 'short' | 'long' | 'side';
interface Aim { pointer: Vec; angleDeg: number; power: number }

const INSTRUCTION = 'Arrastra el balón hacia atrás y suelta para lanzar';
const HINT_BALL = 'Empieza el arrastre sobre el balón';
const HINT_SHORT = 'Arrastra más para coger potencia';
const RESULT_MS = 900;

const isInteractive = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('button, a, input, textarea, select, [contenteditable="true"]'));
};

export function DragShotGame({ spec, onDone, onSimulate }: {
  spec: MinigameSpec;
  onDone: (made: number) => void;
  onSimulate: () => void;
}) {
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 1000));
  const attempts = Math.max(1, Math.floor(spec.attempts) || 1);

  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>('aim');
  const [aim, setAim] = useState<Aim | null>(null);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<'in' | 'out' | null>(null);
  const [missKind, setMissKind] = useState<MissKind | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Vec>(() => courtSpot(0, sessionSeed));

  const arena = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLSpanElement>(null);
  const trailEl = useRef<SVGPolylineElement>(null);

  const phaseRef = useRef<Phase>('aim');
  const aspectRef = useRef(0.675);
  const setupRef = useRef<Setup>(setupFor(courtSpot(0, sessionSeed), 0.675));
  const flightRef = useRef<Flight | null>(null);
  const trailRef = useRef<Vec[]>([]);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  const dragging = useRef(false);
  const pointerId = useRef<number | null>(null);
  const startPoint = useRef<Vec | null>(null);
  const moved = useRef(false);
  const angleRef = useRef(0);
  const powerRef = useRef(0);
  const madeRef = useRef(0);
  const attemptRef = useRef(0);
  const done = useRef(false);
  const mounted = useRef(true);
  const specRef = useRef(spec);
  const onDoneRef = useRef(onDone);
  specRef.current = spec;
  onDoneRef.current = onDone;

  const stopRaf = useCallback(() => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const paintBall = useCallback((p: Vec) => {
    const el = ballEl.current;
    if (!el) return;
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
  }, []);

  const paintTrail = useCallback((points: Vec[]) => {
    const el = trailEl.current;
    if (!el) return;
    el.setAttribute('points', points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
  }, []);

  const measure = useCallback(() => {
    const el = arena.current;
    const r = el?.getBoundingClientRect();
    const a = r && r.width > 0 && r.height > 0 && Number.isFinite(r.height / r.width) ? r.height / r.width : 0.675;
    aspectRef.current = a > 0 ? a : 0.675;
    setupRef.current = setupFor(origin, aspectRef.current);
    const p = project(setupRef.current, 0, 13);
    paintBall(p);
  }, [origin, paintBall]);

  const resetAim = useCallback(() => {
    dragging.current = false;
    pointerId.current = null;
    startPoint.current = null;
    moved.current = false;
    angleRef.current = 0;
    powerRef.current = 0;
    setAim(null);
    setAngle(0);
    setPower(0);
  }, []);

  const beginShot = useCallback((nextOrigin: Vec) => {
    setupRef.current = setupFor(nextOrigin, aspectRef.current);
    flightRef.current = null;
    trailRef.current = [];
    paintTrail([]);
    paintBall(project(setupRef.current, 0, 13));
  }, [paintBall, paintTrail]);

  const advance = useCallback(() => {
    if (!mounted.current) return;
    stopRaf();
    clearTimers();
    resetAim();
    setResult(null);
    setMissKind(null);
    setHint(null);
    phaseRef.current = 'aim';
    setPhase('aim');
    const next = attemptRef.current + 1;
    if (next >= specRef.current.attempts) {
      done.current = true;
      onDoneRef.current(madeRef.current);
      return;
    }
    attemptRef.current = next;
    setAttempt(next);
    const spot = courtSpot(next, sessionSeed);
    setOrigin(spot);
    beginShot(spot);
  }, [beginShot, clearTimers, resetAim, sessionSeed, stopRaf]);

  const finish = useCallback((made_: boolean, kind: MissKind | null) => {
    if (!mounted.current) return;
    stopRaf();
    phaseRef.current = 'result';
    setPhase('result');
    resetAim();
    setResult(made_ ? 'in' : 'out');
    setMissKind(kind);
    try { navigator.vibrate?.(made_ ? [16, 36, 16] : 34); } catch { /* sin soporte */ }
    if (made_) {
      madeRef.current += 1;
      setMade(madeRef.current);
    }
    setShots((s) => [...s, made_]);
    schedule(advance, RESULT_MS);
  }, [advance, resetAim, schedule, stopRaf]);

  /** Lanza el balón con la puntería actual y simula el vuelo fotograma a fotograma. */
  const shoot = useCallback((angleDeg: number, pwr: number) => {
    if (phaseRef.current !== 'aim' || done.current || !mounted.current) return;
    if (pwr < MIN_PULL) {
      setHint(HINT_SHORT);
      return;
    }
    const setup = setupRef.current;
    const flight = createFlight(setup.origin, angleDeg, pwr, setup.aspect);
    flightRef.current = flight;
    trailRef.current = [project(setup, flight.s, flight.h)];
    phaseRef.current = 'flight';
    setPhase('flight');
    setAim(null);
    setHint(null);
    resetAim();
    phaseRef.current = 'flight';

    if (motionReduced()) {
      const sim = simulateShot(setup.origin, angleDeg, pwr, specRef.current, setup.aspect);
      const last = sim.path[sim.path.length - 1] ?? project(setup, 0, 13);
      paintBall(last);
      const kind: MissKind | null = sim.made ? null : sim.touchedBoard ? 'long' : 'short';
      finish(sim.made, kind);
      return;
    }

    let acc = 0;
    let last = performance.now();
    let maxS = 0;
    const loop = (now: number) => {
      rafRef.current = 0;
      if (!mounted.current || !flightRef.current) return;
      const f = flightRef.current;
      acc += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      while (acc >= SUBSTEP && !f.done) {
        stepFlight(f, SUBSTEP, specRef.current, setup);
        acc -= SUBSTEP;
        if (f.s > maxS) maxS = f.s;
      }
      const p = project(setup, f.s, f.h);
      paintBall(p);
      const trail = trailRef.current;
      trail.push(p);
      if (trail.length > 14) trail.shift();
      paintTrail(trail);

      if (f.done) {
        const kind: MissKind | null = f.made
          ? null
          : f.touchedBoard || maxS > setup.distance + RIM_HALF
            ? 'long'
            : maxS < setup.distance - RIM_HALF
              ? 'short'
              : 'side';
        finish(f.made, kind);
        return;
      }
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
  }, [finish, paintBall, paintTrail, resetAim]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopRaf();
      clearTimers();
    };
  }, [clearTimers, stopRaf]);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  useLayoutEffect(() => {
    beginShot(origin);
  }, [beginShot, origin]);

  const point = (e: ReactPointerEvent<HTMLDivElement>): Vec => {
    const el = arena.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    const w = r.width > 0 ? r.width : 1;
    const h = r.height > 0 ? r.height : 1;
    return { x: ((e.clientX - r.left) / w) * 100, y: ((e.clientY - r.top) / h) * 100 };
  };

  const applyAim = (p: Vec) => {
    const setup = setupRef.current;
    const a = aimFromDrag(setup.origin, p, setup.aspect);
    angleRef.current = a.angleDeg;
    powerRef.current = a.power;
    setAngle(a.angleDeg);
    setPower(a.power);
    setAim({ pointer: { x: a.pullX, y: a.pullY }, angleDeg: a.angleDeg, power: a.power });
    return a;
  };

  const dragMoved = (p: Vec): boolean => {
    const s = startPoint.current;
    if (!s) return false;
    const dx = (p.x - s.x) / 100;
    const dy = ((p.y - s.y) / 100) * aspectRef.current;
    return Math.hypot(dx, dy) > 0.004;
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'aim' || done.current || dragging.current) return;
    measure();
    const p = point(e);
    if (!pointerNearBall(setupRef.current.origin, p, aspectRef.current)) {
      resetAim();
      setHint(HINT_BALL);
      return;
    }
    e.preventDefault();
    setHint(null);
    dragging.current = true;
    pointerId.current = e.pointerId;
    startPoint.current = p;
    moved.current = false;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* sin soporte */ }
    applyAim(p);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || pointerId.current !== e.pointerId || phaseRef.current !== 'aim') return;
    e.preventDefault();
    const p = point(e);
    if (dragMoved(p)) moved.current = true;
    applyAim(p);
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* ya no hay captura */ }
    if (!dragging.current) return;
    dragging.current = false;
    if (phaseRef.current !== 'aim' || done.current) return;
    e.preventDefault();
    const p = point(e);
    if (dragMoved(p)) moved.current = true;
    const a = applyAim(p);
    if (!moved.current || a.length < MIN_PULL) {
      resetAim();
      setHint(HINT_SHORT);
      return;
    }
    shoot(a.angleDeg, a.power);
  };

  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* nada */ }
    if (phaseRef.current === 'aim') resetAim();
    dragging.current = false;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'aim' || done.current || isInteractive(e.target)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        angleRef.current = clamp(angleRef.current + (e.key === 'ArrowLeft' ? -2 : 2), -20, 80);
        setAngle(angleRef.current);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        powerRef.current = clamp(powerRef.current + (e.key === 'ArrowUp' ? 0.04 : -0.04), 0, 1);
        setPower(powerRef.current);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        shoot(angleRef.current, powerRef.current);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetAim();
        setHint(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetAim, shoot]);

  useEffect(() => {
    const onBlur = () => { if (phaseRef.current === 'aim') resetAim(); };
    const onVis = () => { if (document.hidden && phaseRef.current === 'aim') resetAim(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [resetAim]);

  // --- Geometría de la cancha (en el viewBox 0..100, deformado por el aspecto).
  const setup = setupRef.current;
  const originProj = project(setup, 0, 0);
  const boardX = (() => {
    const p = project(setup, setup.distance + BACKBOARD_OFFSET, RIM_HEIGHT);
    return p.x;
  })();
  const boardTopY = (() => {
    const p = project(setup, setup.distance + BACKBOARD_OFFSET, BACKBOARD_TOP);
    return Math.max(4, p.y);
  })();
  const boardBottomY = (() => {
    const p = project(setup, setup.distance + BACKBOARD_OFFSET, BACKBOARD_BOTTOM);
    return p.y;
  })();

  // Ancho del aro en pantalla, con un mínimo para que siempre se vea.
  const rimWidth = Math.max(7, (Math.abs(RIM_X - setup.origin.x) * (2 * RIM_HALF)) / Math.max(1, setup.distance));
  const rimStart = { x: RIM_X - rimWidth / 2, y: RIM_Y };
  const rimEnd = { x: RIM_X + rimWidth / 2, y: RIM_Y };

  const pullPath = (() => {
    if (!aim) return '';
    const o = project(setup, 0, 13);
    const dx = aim.pointer.x - o.x;
    const dy = aim.pointer.y - o.y;
    const len = Math.hypot(dx, dy) || 1;
    const sag = Math.min(2.2, len * 0.06);
    const mx = (o.x + aim.pointer.x) / 2;
    const my = (o.y + aim.pointer.y) / 2;
    return `M ${o.x} ${o.y} Q ${mx - (dy / len) * sag} ${my + (dx / len) * sag} ${aim.pointer.x} ${aim.pointer.y}`;
  })();

  const live = hint
    ? t(hint)
    : result
      ? t(`Tiro ${Math.min(attempt + 1, attempts)} de ${attempts}: ${result === 'in' ? 'Dentro' : 'Fuera'}`)
      : '';

  const missLabel = missKind === 'short' ? 'Corto' : missKind === 'long' ? 'Largo' : 'Desviado';

  return (
    <div className={`drag-game ${result ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{t(INSTRUCTION)}</span>
        <span className="shot-score"><b>{made}</b> / {attempts}</span>
      </div>

      <div
        className="drag-arena"
        ref={arena}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        tabIndex={0}
        aria-label={t(`Arrastra el balón hacia atrás y suelta. Tiro ${Math.min(attempt + 1, attempts)} de ${attempts}`)}
      >
        <svg className="drag-court" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="dragFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#241a12" />
              <stop offset="60%" stopColor="#33231546" />
              <stop offset="100%" stopColor="#4a2f1b" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#dragFloor)" />
          {/* suelo: bandas de madera */}
          <g className="drag-wood" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={-10 + i * 15} y1="100" x2={26 + i * 9} y2="56" />
            ))}
          </g>
          {/* líneas de la cancha en perspectiva */}
          <path className="drag-line" d="M 6 96 L 30 56 L 96 56" vectorEffect="non-scaling-stroke" />
          <path className="drag-line" d="M 0 74 L 22 56" vectorEffect="non-scaling-stroke" />
          <ellipse className="drag-line" cx={boardX - 60} cy="78" rx="30" ry="9" vectorEffect="non-scaling-stroke" />
          {/* poste y tablero */}
          <line className="drag-pole" x1={boardX} y1={RIM_Y} x2={boardX} y2="94" vectorEffect="non-scaling-stroke" />
          <line className="drag-board" x1={boardX} y1={boardTopY} x2={boardX} y2={boardBottomY} vectorEffect="non-scaling-stroke" />
          {/* aro */}
          <line className="drag-rim" x1={rimStart.x} y1={rimStart.y} x2={rimEnd.x} y2={rimEnd.y} vectorEffect="non-scaling-stroke" />
          {/* red */}
          <path
            className="drag-net"
            d={`M ${rimStart.x} ${rimStart.y} L ${rimStart.x + rimWidth * 0.18} ${rimStart.y + 9} L ${rimStart.x + rimWidth * 0.82} ${rimStart.y + 9} L ${rimEnd.x} ${rimEnd.y}`}
            vectorEffect="non-scaling-stroke"
          />
          <path className="drag-net-line" d={`M ${rimStart.x + rimWidth * 0.5} ${rimStart.y + 9} L ${rimStart.x + rimWidth * 0.5} ${rimStart.y + 1}`} vectorEffect="non-scaling-stroke" />
          <polyline className="drag-trail" ref={trailEl} points="" />
          {aim && <path className="drag-pull" d={pullPath} vectorEffect="non-scaling-stroke" />}
        </svg>

        <span className="drag-shadow" style={{ left: `${originProj.x}%`, top: `${originProj.y}%` }} aria-hidden="true" />
        <span className="drag-player" style={{ left: `${originProj.x}%`, top: `${originProj.y}%` }} aria-hidden="true" />

        <span
          className={`drag-ball${phase === 'flight' ? ' flying' : ''}`}
          ref={ballEl}
          style={{ left: `${project(setup, 0, 13).x}%`, top: `${project(setup, 0, 13).y}%` }}
          aria-hidden="true"
        />

        {aim && (
          <span
            className="drag-ghost"
            style={{ left: `${aim.pointer.x}%`, top: `${aim.pointer.y}%` }}
            aria-hidden="true"
          />
        )}

        {result && (
          <span className={`drag-msg ${result}`}>
            {result === 'in' ? t('¡DENTRO!') : t(missLabel)}
          </span>
        )}
        {hint && <span className="drag-hint" aria-hidden="true">{t(hint)}</span>}
        <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
      </div>

      <div className="drag-power" aria-hidden="true">
        <span style={{ width: `${Math.round(power * 100)}%` }} />
      </div>
      <div className="row between drag-meta">
        <span className="tiny dim">{t('Potencia')} {Math.round(power * 100)}% · {t('Ángulo')} {Math.round(angle)}°</span>
        <span className="tiny dim">{t('Tiro')} {Math.min(attempt + 1, attempts)}/{attempts}</span>
      </div>

      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => (
          <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />
        ))}
      </div>

      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">
          {t('Flechas: ángulo y potencia')} · {t('Espacio/Enter: lanzar')} · {t('zona')} {spec.zone}%
        </span>
        {phase === 'aim' && shots.length === 0 && (
          <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>
        )}
      </div>
    </div>
  );
}
