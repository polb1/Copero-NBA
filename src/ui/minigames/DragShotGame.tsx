import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';
import { t } from '../../i18n/i18n';
import { motionReduced } from '../motion';
import {
  MIN_PULL,
  RIM_Y,
  aimFromDrag,
  canStartDrag,
  dragGeometry,
  flightPoint,
  flightPlan,
  randomCourtOrigin,
  resolveDragShot,
  rimPoint,
  type FlightPlan,
} from './dragShot';

/** The scoring helper lives in `dragShot.ts`; re-export keeps the old test contract. */
export { resolveDragShot };

type Phase = 'aim' | 'flight' | 'result';
type Pull = { x: number; y: number; length: number };

const INSTRUCTION = 'Toca el balón y arrastra hacia atrás. Suelta para lanzar.';
const HINT_BALL = 'Toca el balón y arrastra hacia atrás';
const HINT_SHORT = 'Arrastra más';
/** Hoop touch radius in arena-width fractions: pressing the rim does nothing. */
const RIM_TOUCH = 0.055;

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('button, a, input, textarea, select, [contenteditable="true"]'));
};

export function DragShotGame({ spec, onDone, onSimulate }: {
  spec: MinigameSpec;
  onDone: (made: number) => void;
  onSimulate: () => void;
}) {
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 100));
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [phase, setPhase] = useState<Phase>('aim');
  const [, setAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [plan, setPlan] = useState<FlightPlan | null>(null);
  const [pull, setPull] = useState<Pull | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const arena = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const phaseRef = useRef<Phase>('aim');
  const aspectRef = useRef(1);
  const angleRef = useRef(0);
  const powerRef = useRef(0);
  const madeRef = useRef(0);
  const attemptRef = useRef(0);
  const originRef = useRef(randomCourtOrigin(0, sessionSeed));
  const done = useRef(false);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  const mounted = useRef(true);
  const specRef = useRef(spec);
  const onDoneRef = useRef(onDone);
  specRef.current = spec;
  onDoneRef.current = onDone;

  const attempts = Math.max(1, Math.floor(spec.attempts) || 1);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
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

  /** Writes the ball position straight into the DOM (no setState per frame). */
  const placeBall = useCallback((x: number, y: number) => {
    const el = ballEl.current;
    if (!el) return;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  }, []);

  const measureAspect = useCallback(() => {
    const el = arena.current;
    if (!el) {
      aspectRef.current = 1;
      return;
    }
    const r = el.getBoundingClientRect();
    aspectRef.current =
      Number.isFinite(r.width) && r.width > 0 && Number.isFinite(r.height) && r.height > 0
        ? r.height / r.width
        : 1;
  }, []);

  const resetAim = useCallback(() => {
    angleRef.current = 0;
    powerRef.current = 0;
    startPointRef.current = null;
    movedRef.current = false;
    setAngle(0);
    setPower(0);
    setPull(null);
  }, []);

  const applyAim = useCallback((pointer: { x: number; y: number }) => {
    const aspect = aspectRef.current;
    const currentOrigin = originRef.current;
    const aim = aimFromDrag(currentOrigin, pointer, aspect);
    angleRef.current = aim.angleDeg;
    powerRef.current = aim.power;
    setAngle(aim.angleDeg);
    setPower(aim.power);
    setPull({
      x: clamp(pointer.x, 2, 98),
      y: clamp(pointer.y, 2, 98),
      length: aim.length,
    });
    return aim;
  }, []);

  const advance = useCallback(() => {
    if (!mounted.current) return;
    stopRaf();
    clearTimers();
    draggingRef.current = false;
    pointerIdRef.current = null;
    resetAim();
    setPlan(null);
    setFlash(null);
    setHint(null);
    phaseRef.current = 'aim';
    setPhase('aim');
    const next = attemptRef.current + 1;
    if (next >= Math.max(1, Math.floor(specRef.current.attempts) || 1)) {
      done.current = true;
      const last = randomCourtOrigin(attemptRef.current, sessionSeed);
      placeBall(last.x, last.y);
      onDoneRef.current(madeRef.current);
      return;
    }
    attemptRef.current = next;
    setAttempt(next);
    const nextOrigin = randomCourtOrigin(next, sessionSeed);
    originRef.current = nextOrigin;
    placeBall(nextOrigin.x, nextOrigin.y);
  }, [clearTimers, placeBall, resetAim, sessionSeed, stopRaf]);

  /** Verdict of a finished flight: scores it, flashes it and queues the next attempt. */
  const finish = useCallback((hit: boolean) => {
    if (!mounted.current) return;
    stopRaf();
    phaseRef.current = 'result';
    setPhase('result');
    draggingRef.current = false;
    pointerIdRef.current = null;
    resetAim();
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    if (hit) {
      madeRef.current += 1;
      setMade(madeRef.current);
    }
    setShots((s) => [...s, hit]);
    schedule(advance, specRef.current.attempts > 5 ? 520 : 800);
  }, [advance, resetAim, schedule, stopRaf]);

  const shoot = useCallback((angleDeg: number, pwr: number, pointer?: { x: number; y: number }) => {
    if (phaseRef.current !== 'aim' || done.current || !mounted.current) return;
    const shotAttempt = attemptRef.current;
    const shotSpec = specRef.current;
    const aspect = aspectRef.current;
    const currentOrigin = originRef.current;
    const shotPlan = flightPlan(shotAttempt, angleDeg, pwr, shotSpec, aspect, currentOrigin);
    const hit = pointer
      ? resolveDragShot(shotAttempt, pointer, shotSpec, aspect, currentOrigin)
      : shotPlan.verdict === 'make';

    phaseRef.current = 'flight';
    setPhase('flight');
    setPlan(shotPlan);
    setPull(null);
    setHint(null);
    draggingRef.current = false;
    pointerIdRef.current = null;

    if (motionReduced()) {
      const last = shotPlan.segs[shotPlan.segs.length - 1].to;
      placeBall(last.x, last.y);
      finish(hit);
      return;
    }

    const start = performance.now();
    const total = shotPlan.totalMs;
    const step = (now: number) => {
      rafRef.current = 0;
      if (!mounted.current) return;
      const ms = clamp(now - start, 0, total);
      const point = flightPoint(shotPlan, ms);
      placeBall(point.x, point.y);
      if (ms >= total) {
        finish(hit);
        return;
      }
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
  }, [finish, placeBall]);

  /** Aborts the aim without shooting (pointercancel, blur, tab hidden). */
  const cancelAim = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    resetAim();
  }, [resetAim]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopRaf();
      clearTimers();
    };
  }, [clearTimers, stopRaf]);

  useLayoutEffect(() => {
    if (phaseRef.current !== 'aim') return;
    const origin = randomCourtOrigin(attemptRef.current, sessionSeed);
    originRef.current = origin;
    placeBall(origin.x, origin.y);
  }, [attempt, placeBall, sessionSeed]);

  useEffect(() => {
    measureAspect();
    const onResize = () => measureAspect();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureAspect]);

  useEffect(() => {
    const onBlur = () => cancelAim();
    const onVisibility = () => { if (document.hidden) cancelAim(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cancelAim]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'aim' || done.current) return;
      if (isInteractiveTarget(e.target)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        measureAspect();
        angleRef.current = clamp(angleRef.current + (e.key === 'ArrowLeft' ? -2 : 2), -90, 90);
        setAngle(angleRef.current);
        setHint(null);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        powerRef.current = clamp(powerRef.current + (e.key === 'ArrowUp' ? 0.05 : -0.05), 0, 1);
        setPower(powerRef.current);
        setHint(null);
        measureAspect();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        measureAspect();
        if (powerRef.current < MIN_PULL) {
          setHint(HINT_SHORT);
          return;
        }
        shoot(angleRef.current, powerRef.current);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetAim();
        setHint(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [measureAspect, resetAim, shoot]);

  const point = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = arena.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    const w = r.width > 0 ? r.width : 1;
    const h = r.height > 0 ? r.height : 1;
    return { x: ((e.clientX - r.left) / w) * 100, y: ((e.clientY - r.top) / h) * 100 };
  };

  const releaseCapture = (e: ReactPointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* capture already gone */ }
  };

  /** A tap on the ball edge is not a drag: require a little movement before launching. */
  const dragMoved = (p: { x: number; y: number }): boolean => {
    const start = startPointRef.current;
    if (!start) return false;
    const dx = (p.x - start.x) / 100;
    const dy = ((p.y - start.y) / 100) * aspectRef.current;
    return Math.hypot(dx, dy) > 0.005;
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'aim' || done.current || draggingRef.current) return;
    measureAspect();
    const p = point(e);
    const currentOrigin = originRef.current;
    const g = dragGeometry(attemptRef.current, specRef.current, aspectRef.current, currentOrigin);
    const rimDx = (p.x - g.rim.x) / 100;
    const rimDy = ((p.y - g.rim.y) / 100) * aspectRef.current;
    if (Math.hypot(rimDx, rimDy) <= RIM_TOUCH) return; // Touching the rim does nothing.
    if (!canStartDrag(currentOrigin, p, aspectRef.current)) {
      resetAim();
      setHint(HINT_BALL);
      return;
    }
    e.preventDefault();
    setHint(null);
    pointerIdRef.current = e.pointerId;
    startPointRef.current = p;
    movedRef.current = false;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* not supported */ }
    draggingRef.current = true;
    applyAim(p);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
    if (phaseRef.current !== 'aim') return;
    e.preventDefault();
    const p = point(e);
    if (dragMoved(p)) movedRef.current = true;
    applyAim(p);
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    releaseCapture(e);
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (phaseRef.current !== 'aim' || done.current) return;
    e.preventDefault();
    const p = point(e);
    if (dragMoved(p)) movedRef.current = true;
    const aim = applyAim(p);
    if (!movedRef.current || aim.length < MIN_PULL) {
      resetAim();
      setHint(HINT_SHORT);
      return;
    }
    setHint(null);
    shoot(aim.angleDeg, aim.power, p);
  };

  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    releaseCapture(e);
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (phaseRef.current !== 'aim') return;
    resetAim();
  };

  const origin = randomCourtOrigin(attempt, sessionSeed);
  const rim = rimPoint(attempt);
  const aspect = Number.isFinite(aspectRef.current) && aspectRef.current > 0 ? aspectRef.current : 1;
  const num = Math.min(attempt + 1, attempts);

  let bandD = '';
  if (pull) {
    const bdx = pull.x - origin.x;
    const bdy = pull.y - origin.y;
    const screenLen = Math.hypot(bdx, bdy * aspect) || 1;
    const sag = Math.min(2.5, screenLen * 0.05);
    const midX = (origin.x + pull.x) / 2;
    const midY = (origin.y + pull.y) / 2;
    const ctrlX = midX - ((bdy * aspect) / screenLen) * sag;
    const ctrlY = midY + ((bdx / screenLen) * sag) / aspect;
    bandD = `M ${origin.x} ${origin.y} Q ${ctrlX} ${ctrlY} ${pull.x} ${pull.y}`;
  }

  const paintX = clamp(rim.x - 15, 3, 66);
  const rimL = rim.x - 7;
  const rimR = rim.x + 7;
  const arcL = rim.x - 40;
  const arcR = rim.x + 40;
  const freeThrowX = paintX + 15;

  const live = hint
    ? t(hint)
    : flash
      ? t(`Tiro ${num} de ${attempts}: ${flash === 'in' ? 'Dentro' : 'Fuera'}`)
      : '';

  return (
    <div className={`drag-game ${flash ?? ''}`}>
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
        aria-label={t(`Toca el balón y arrastra hacia atrás. Tiro ${num} de ${attempts}`)}
      >
        <svg className="drag-court" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect className="drag-court-floor" x="0" y="0" width="100" height="100" />
          <line className="drag-court-line" x1="2" y1="7" x2="98" y2="7" vectorEffect="non-scaling-stroke" />
          <rect className="drag-court-paint" x={paintX} y="7" width="30" height="42" vectorEffect="non-scaling-stroke" />
          <line className="drag-court-line" x1={paintX} y1="49" x2={paintX + 30} y2="49" vectorEffect="non-scaling-stroke" />
          <circle className="drag-court-line" cx={freeThrowX} cy="49" r="8" vectorEffect="non-scaling-stroke" />
          <path className="drag-court-line" d={`M ${arcL} 7 A 40 37 0 0 0 ${arcR} 7`} vectorEffect="non-scaling-stroke" />
          <path className="drag-court-line" d={`M ${rimL} ${RIM_Y} A 7 7 0 0 0 ${rimR} ${RIM_Y}`} vectorEffect="non-scaling-stroke" />
        </svg>

        <span
          className={`drag-board${plan?.board && phase === 'flight' ? ' shake' : ''}`}
          style={{
            left: `${rim.x}%`,
            top: `${RIM_Y - 13}%`,
            animationDelay: plan?.board && phase === 'flight' ? `${Math.round(plan.totalMs * 0.64)}ms` : undefined,
          }}
          aria-hidden="true"
        />
        <span className={`drag-net${flash === 'in' ? ' swish' : ''}`} style={{ left: `${rim.x}%`, top: `${RIM_Y + 2}%` }} aria-hidden="true" />
        <span
          className={`drag-rim${flash === 'out' && plan && !plan.board ? ' clang' : ''}`}
          style={{ left: `${rim.x}%`, top: `${RIM_Y}%` }}
          aria-hidden="true"
        />

        {phase === 'aim' && pull && (
          <>
            <svg className="drag-pull" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d={bandD} vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="drag-ghost" style={{ left: `${pull.x}%`, top: `${pull.y}%` }} aria-hidden="true" />
          </>
        )}

        <span
          className={`drag-ball${phase === 'flight' || phase === 'result' ? ' flying' : ''}`}
          ref={ballEl}
          style={{ left: `${origin.x}%`, top: `${origin.y}%` }}
          aria-hidden="true"
        />

        {hint && <span className="drag-hint" aria-hidden="true">{t(hint)}</span>}
        {flash && <span className="drag-msg">{flash === 'in' ? t('¡DENTRO!') : t('FUERA')}</span>}

        <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
      </div>

      <div className="drag-power" aria-hidden="true">
        <span style={{ width: `${Math.round(power * 100)}%` }} />
      </div>
      <div className="row between drag-meta">
        <span className="tiny dim">{t('Potencia')} {Math.round(power * 100)}%</span>
        <span className="tiny dim">{t('Tiro')} {num}/{attempts}</span>
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
