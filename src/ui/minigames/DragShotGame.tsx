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
  RELEASE_HEIGHT,
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
  type AimResult,
} from './dragShot';

type Phase = 'aim' | 'flight' | 'result';
type MissKind = 'short' | 'long' | 'left' | 'right';

const INSTRUCTION = 'Arrastra el balón HACIA donde quieres tirar y suelta';
const HINT_BALL = 'Empieza el arrastre sobre el balón';
const HINT_SHORT = 'Arrastra más lejos para más potencia';
const RESULT_MS = 1000;

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
  const [aim, setAim] = useState<AimResult | null>(null);
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<'in' | 'out' | null>(null);
  const [missKind, setMissKind] = useState<MissKind | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Vec>(() => courtSpot(0, sessionSeed));

  const arena = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLSpanElement>(null);
  const trailEl = useRef<SVGPolylineElement>(null);
  const previewEl = useRef<SVGPolylineElement>(null);

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

  const paintPreview = useCallback((points: Vec[]) => {
    const el = previewEl.current;
    if (!el) return;
    if (points.length < 2) { el.setAttribute('points', ''); return; }
    el.setAttribute('points', points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
  }, []);

  const measure = useCallback(() => {
    const el = arena.current;
    const r = el?.getBoundingClientRect();
    const a = r && r.width > 0 && r.height > 0 && Number.isFinite(r.height / r.width)
      ? r.height / r.width : 0.675;
    aspectRef.current = a > 0 ? a : 0.675;
    setupRef.current = setupFor(origin, aspectRef.current);
    const p = project(setupRef.current, 0, RELEASE_HEIGHT);
    paintBall(p);
  }, [origin, paintBall]);

  const resetAim = useCallback(() => {
    dragging.current = false;
    pointerId.current = null;
    startPoint.current = null;
    moved.current = false;
    setAim(null);
    setAngle(0);
    setPower(0);
    paintPreview([]);
  }, [paintPreview]);

  const beginShot = useCallback((nextOrigin: Vec) => {
    setupRef.current = setupFor(nextOrigin, aspectRef.current);
    flightRef.current = null;
    trailRef.current = [];
    paintTrail([]);
    paintPreview([]);
    const p = project(setupRef.current, 0, RELEASE_HEIGHT);
    paintBall(p);
  }, [paintBall, paintTrail, paintPreview]);

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
    try { navigator.vibrate?.(made_ ? [20, 40, 20] : 60); } catch { /* noop */ }
    if (made_) {
      madeRef.current += 1;
      setMade(madeRef.current);
    }
    setShots((s) => [...s, made_]);
    schedule(advance, RESULT_MS);
  }, [advance, resetAim, schedule, stopRaf]);

  /** Lanza con parámetros actuales y anima frame a frame. */
  const shoot = useCallback((angleDeg: number, pwr: number, curve: number) => {
    if (phaseRef.current !== 'aim' || done.current || !mounted.current) return;
    if (pwr < MIN_PULL) {
      setHint(HINT_SHORT);
      return;
    }
    const setup = setupRef.current;
    const flight = createFlight(setup.origin, angleDeg, pwr, setup.aspect, curve);
    flightRef.current = flight;
    trailRef.current = [project(setup, flight.s, flight.h, flight.lat)];
    phaseRef.current = 'flight';
    setPhase('flight');
    setAim(null);
    setHint(null);
    resetAim();

    if (motionReduced()) {
      const sim = simulateShot(setup.origin, angleDeg, pwr, specRef.current, setup.aspect);
      const last = sim.path[sim.path.length - 1] ?? project(setup, 0, RELEASE_HEIGHT);
      paintBall(last);
      const kind: MissKind | null = sim.made ? null
        : sim.touchedBoard || sim.events.some(e => e === 'floor' && sim.path[sim.path.length-1].x > setup.distance)
          ? 'long' : 'short';
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

      const p = project(setup, f.s, f.h, f.lat);
      paintBall(p);

      const trail = trailRef.current;
      trail.push(p);
      if (trail.length > 20) trail.shift();
      paintTrail(trail);

      if (f.done) {
        const kind: MissKind | null = f.made
          ? null
          : f.touchedBoard || maxS > setup.distance + RIM_HALF * 2
            ? 'long'
            : maxS < setup.distance - RIM_HALF * 2
              ? 'short'
              : f.lat < 0 ? 'left' : 'right';
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

  // --- POINTER HANDLING (arrastre DIRECTO) ---

  const point = (e: ReactPointerEvent<HTMLDivElement>): Vec => {
    const el = arena.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    const w = r.width > 0 ? r.width : 1;
    const h = r.height > 0 ? r.height : 1;
    return { x: ((e.clientX - r.left) / w) * 100, y: ((e.clientY - r.top) / h) * 100 };
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
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }

    // Preview inicial
    const a = aimFromDrag(setupRef.current.origin, p, aspectRef.current);
    setAim(a);
    setAngle(a.angleDeg);
    setPower(a.power);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || pointerId.current !== e.pointerId || phaseRef.current !== 'aim') return;
    e.preventDefault();
    const p = point(e);
    if (!moved.current && startPoint.current) {
      const dx = (p.x - startPoint.current.x) / 100;
      const dy = ((p.y - startPoint.current.y) / 100) * aspectRef.current;
      if (Math.hypot(dx, dy) > 0.004) moved.current = true;
    }

    const a = aimFromDrag(setupRef.current.origin, p, aspectRef.current);
    setAim(a);
    setAngle(a.angleDeg);
    setPower(a.power);
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
    if (!dragging.current) return;
    dragging.current = false;
    if (phaseRef.current !== 'aim' || done.current) return;
    e.preventDefault();

    const p = point(e);
    if (!moved.current && startPoint.current) {
      const dx = (p.x - startPoint.current.x) / 100;
      const dy = ((p.y - startPoint.current.y) / 100) * aspectRef.current;
      if (Math.hypot(dx, dy) > 0.004) moved.current = true;
    }
    const a = aimFromDrag(setupRef.current.origin, p, aspectRef.current);

    if (!moved.current || a.length < MIN_PULL) {
      resetAim();
      setHint(HINT_SHORT);
      return;
    }
    shoot(a.angleDeg, a.power, a.curve);
  };

  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
    if (phaseRef.current === 'aim') resetAim();
    dragging.current = false;
  };

  // --- KEYBOARD ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'aim' || done.current || isInteractive(e.target)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const newAngle = clamp(angle + (e.key === 'ArrowLeft' ? -2 : 2), 28, 75);
        setAngle(newAngle);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const newPower = clamp(power + (e.key === 'ArrowUp' ? 0.05 : -0.05), 0, 1);
        setPower(newPower);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (power >= MIN_PULL) shoot(angle, power, 0);
        else setHint(HINT_SHORT);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetAim();
        setHint(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [angle, power, resetAim, shoot]);

  useEffect(() => {
    const onBlur = () => { if (phaseRef.current === 'aim') resetAim(); };
    const onVis = () => { if (document.hidden && phaseRef.current === 'aim') resetAim(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); };
  }, [resetAim]);

  // --- GEOMETRÍA CANCHA (viewBox 0..100) ---

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

  const rimWidth = Math.max(7, (Math.abs(RIM_X - setup.origin.x) * (2 * RIM_HALF)) / Math.max(1, setup.distance));
  const rimStart = { x: RIM_X - rimWidth / 2, y: RIM_Y };
  const rimEnd = { x: RIM_X + rimWidth / 2, y: RIM_Y };

  const live = hint
    ? t(hint)
    : result
      ? t(`Tiro ${Math.min(attempt + 1, attempts)} de ${attempts}: ${result === 'in' ? 'Dentro' : 'Fuera'}`)
      : '';

  const missLabel = missKind === 'short' ? 'Corto' : missKind === 'long' ? 'Largo' : missKind === 'left' ? 'Izquierda' : 'Derecha';

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
        aria-label={t(`Arrastra el balón hacia donde quieras tirar. Tiro ${Math.min(attempt + 1, attempts)} de ${attempts}`)}
      >
        <svg className="drag-court" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="dragFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1510" />
              <stop offset="50%" stopColor="#2d1f15" />
              <stop offset="100%" stopColor="#3d2a18" />
            </linearGradient>
            <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e8a030" />
              <stop offset="50%" stopColor="#ffcc44" />
              <stop offset="100%" stopColor="#e8a030" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill="url(#dragFloor)" />

          {/* Suelo: bandas madera perspectiva */}
          <g className="drag-wood" aria-hidden="true" stroke="#2a1a10" strokeWidth="0.3" opacity="0.4">
            {Array.from({ length: 10 }, (_, i) => (
              <line key={i} x1={-15 + i * 18} y1="100" x2={20 + i * 10} y2="56" />
            ))}
          </g>

          {/* Líneas cancha */}
          <path className="drag-line" d="M 6 96 L 28 56 L 96 56" vectorEffect="non-scaling-stroke" stroke="#4a3520" strokeWidth="0.6" fill="none" />
          <path className="drag-line" d="M 0 74 L 20 56" vectorEffect="non-scaling-stroke" stroke="#4a3520" strokeWidth="0.6" fill="none" />
          <ellipse className="drag-line" cx={boardX - 55} cy="78" rx="28" ry="8" vectorEffect="non-scaling-stroke" stroke="#4a3520" strokeWidth="0.5" fill="none" />

          {/* Zona pintada (key) */}
          <path className="drag-line" d={`M ${boardX - 12} 56 L ${boardX - 12} 72`} vectorEffect="non-scaling-stroke" stroke="#4a3520" strokeWidth="0.5" fill="none" />
          <ellipse cx={boardX - 12} cy="64" rx="12" ry="6" vectorEffect="non-scaling-stroke" stroke="#4a3520" strokeWidth="0.5" fill="none" />

          {/* Poste y tablero */}
          <line className="drag-pole" x1={boardX} y1={RIM_Y} x2={boardX} y2="94" vectorEffect="non-scaling-stroke" stroke="#555" strokeWidth="1.2" />
          <line className="drag-board" x1={boardX} y1={boardTopY} x2={boardX} y2={boardBottomY} vectorEffect="non-scaling-stroke" stroke="#fff" strokeWidth="3" filter="url(#glow)" />
          <rect x={boardX - 0.8} y={boardBottomY} width="1.6" height={boardTopY - boardBottomY} fill="#fff" opacity="0.9" rx="0.8" />

          {/* Aro */}
          <line className="drag-rim" x1={rimStart.x} y1={rimStart.y} x2={rimEnd.x} y2={rimEnd.y} vectorEffect="non-scaling-stroke" stroke="url(#rimGrad)" strokeWidth="1.8" filter="url(#glow)" />
          <line className="drag-rim" x1={rimStart.x} y1={rimStart.y} x2={rimEnd.x} y2={rimEnd.y} vectorEffect="non-scaling-stroke" stroke="#b8860b" strokeWidth="0.6" />

          {/* Red */}
          <path
            className="drag-net"
            d={`M ${rimStart.x} ${rimStart.y} L ${rimStart.x + rimWidth * 0.15} ${rimStart.y + 10} L ${rimStart.x + rimWidth * 0.85} ${rimStart.y + 10} L ${rimEnd.x} ${rimEnd.y}`}
            vectorEffect="non-scaling-stroke"
            stroke="#e8e0d0"
            strokeWidth="0.4"
            fill="none"
          />
          <path className="drag-net-line" d={`M ${rimStart.x + rimWidth * 0.5} ${rimStart.y + 10} L ${rimStart.x + rimWidth * 0.5} ${rimStart.y + 1}`} vectorEffect="non-scaling-stroke" stroke="#e8e0d0" strokeWidth="0.3" />

          {/* Trayectoria PREVIEW (mientras arrastras) */}
          {aim && aim.previewPath.length > 1 && (
            <polyline
              ref={previewEl}
              points={aim.previewPath.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
              className="drag-preview"
              vectorEffect="non-scaling-stroke"
              stroke="#ffcc44"
              strokeWidth="1.2"
              strokeDasharray="4,3"
              fill="none"
              opacity="0.8"
            />
          )}

          {/* Trayectoria REAL (durante vuelo) */}
          <polyline className="drag-trail" ref={trailEl} points="" vectorEffect="non-scaling-stroke" stroke="#ffcc44" strokeWidth="1.5" fill="none" opacity="0.9" />

          {/* Línea de arrastre (guía visual) */}
          {aim && (
            <path
              className="drag-pull"
              d={( () => {
                const o = project(setup, 0, RELEASE_HEIGHT);
                const dx = aim.pullEnd.x - o.x;
                const dy = aim.pullEnd.y - o.y;
                const len = Math.hypot(dx, dy) || 1;
                const sag = Math.min(3, len * 0.08);
                const mx = (o.x + aim.pullEnd.x) / 2;
                const my = (o.y + aim.pullEnd.y) / 2;
                return `M ${o.x} ${o.y} Q ${mx - (dy / len) * sag} ${my + (dx / len) * sag} ${aim.pullEnd.x} ${aim.pullEnd.y}`;
              })()}
              vectorEffect="non-scaling-stroke"
              stroke="#ffcc44"
              strokeWidth="2"
              strokeDasharray="6,4"
              fill="none"
              opacity="0.7"
            />
          )}
        </svg>

        {/* Sombra balón */}
        <span className="drag-shadow" style={{ left: `${originProj.x}%`, top: `${originProj.y + 2}%` }} aria-hidden="true" />

        {/* Jugador (silhouette) */}
        <span className="drag-player" style={{ left: `${originProj.x}%`, top: `${originProj.y}%` }} aria-hidden="true" />

        {/* Balón */}
        <span
          className={`drag-ball${phase === 'flight' ? ' flying' : ''}`}
          ref={ballEl}
          style={{ left: `${project(setup, 0, RELEASE_HEIGHT).x}%`, top: `${project(setup, 0, RELEASE_HEIGHT).y}%` }}
          aria-hidden="true"
        />

        {/* Ghost pointer mientras arrastras */}
        {aim && (
          <span
            className="drag-ghost"
            style={{ left: `${aim.pullEnd.x}%`, top: `${aim.pullEnd.y}%` }}
            aria-hidden="true"
          />
        )}

        {/* Mensaje resultado */}
        {result && (
          <span className={`drag-msg ${result}`}>
            {result === 'in' ? t('¡DENTRO!') : t(missLabel)}
          </span>
        )}
        {hint && <span className="drag-hint" aria-hidden="true">{t(hint)}</span>}
        <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
      </div>

      {/* Barra potencia */}
      <div className="drag-power" aria-hidden="true" role="progressbar" aria-valuenow={Math.round(power * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.round(power * 100)}%` }} />
      </div>

      <div className="row between drag-meta">
        <span className="tiny dim">{t('Potencia')} {Math.round(power * 100)}% · {t('Ángulo')} {Math.round(angle)}°</span>
        <span className="tiny dim">{t('Tiro')} {Math.min(attempt + 1, attempts)}/{attempts}</span>
      </div>

      {/* Puntos aciertos */}
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => (
          <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />
        ))}
      </div>

      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">
          {t('Flechas: ángulo/potencia')} · {t('Espacio/Enter: lanzar')} · {t('Esc: cancelar')} · {t('zona')} {spec.zone}%
        </span>
        {phase === 'aim' && shots.length === 0 && (
          <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>
        )}
      </div>
    </div>
  );
}