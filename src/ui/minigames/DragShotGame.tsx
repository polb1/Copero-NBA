import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';
import { t } from '../../i18n/i18n';
import { motionReduced } from '../motion';
import {
  RIM_Y,
  aimFromPointer,
  ballX,
  ballY,
  dragGeometry,
  flightPathD,
  flightPoint,
  flightPlan,
  resolveDragShot,
  rimX,
  shotError,
  type FlightPlan,
} from './dragShot';

/** The scoring helper lives in `dragShot.ts`; re-export keeps the old test contract. */
export { resolveDragShot };

type Phase = 'aim' | 'flight' | 'result' | 'rebound' | 'settle';
type AimTone = 'good' | 'near' | 'bad';

export function DragShotGame({ spec, onDone, onSimulate }: {
  spec: MinigameSpec;
  onDone: (made: number) => void;
  onSimulate: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [rebound, setRebound] = useState(false);
  const [phase, setPhase] = useState<Phase>('aim');
  const [aimTone, setAimTone] = useState<AimTone>('bad');
  const [plan, setPlan] = useState<FlightPlan | null>(null);

  const arena = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('aim');
  const aspectRef = useRef(1);
  const angleRef = useRef(0);
  const powerRef = useRef(0);
  const madeRef = useRef(0);
  const attemptRef = useRef(0);
  const done = useRef(false);
  const retryUsed = useRef(false);
  const reboundRef = useRef(false);
  const reboundTimer = useRef(0);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  const mounted = useRef(true);
  const specRef = useRef(spec);
  const onDoneRef = useRef(onDone);
  specRef.current = spec;
  onDoneRef.current = onDone;

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  /** Writes the ball position straight into the DOM (no setState per frame). */
  const placeBall = useCallback((x: number, y: number) => {
    const el = ballEl.current;
    if (!el) return;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopRaf();
      clearTimers();
      if (reboundTimer.current) {
        window.clearTimeout(reboundTimer.current);
        reboundTimer.current = 0;
      }
    };
  }, [clearTimers, stopRaf]);

  const advance = useCallback(() => {
    if (!mounted.current) return;
    stopRaf();
    clearTimers();
    if (reboundTimer.current) {
      window.clearTimeout(reboundTimer.current);
      reboundTimer.current = 0;
    }
    reboundRef.current = false;
    retryUsed.current = false;
    angleRef.current = 0;
    powerRef.current = 0;
    setRebound(false);
    setFlash(null);
    setPlan(null);
    setAngle(0);
    setPower(0);
    setLocked(false);
    phaseRef.current = 'aim';
    setPhase('aim');
    const next = attemptRef.current + 1;
    if (next >= specRef.current.attempts) {
      done.current = true;
      placeBall(ballX(attemptRef.current), ballY(attemptRef.current));
      onDoneRef.current(madeRef.current);
      return;
    }
    attemptRef.current = next;
    setAttempt(next);
    placeBall(ballX(next), ballY(next));
  }, [clearTimers, placeBall, stopRaf]);

  /** Verdict of a finished flight: scores it, flashes it and drives the rebound or the next attempt. */
  const finish = useCallback((hit: boolean) => {
    if (!mounted.current) return;
    phaseRef.current = 'result';
    setPhase('result');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    const delay = specRef.current.attempts > 5 ? 520 : 800;
    if (hit) {
      madeRef.current += 1;
      setMade(madeRef.current);
      setShots((s) => [...s, true]);
      setFlash('in');
      schedule(advance, delay);
      return;
    }
    if (!retryUsed.current) {
      retryUsed.current = true;
      setFlash('out');
      reboundRef.current = true;
      setRebound(true);
      phaseRef.current = 'rebound';
      setPhase('rebound');
      reboundTimer.current = window.setTimeout(() => {
        reboundTimer.current = 0;
        if (!mounted.current || !reboundRef.current) return;
        reboundRef.current = false;
        setRebound(false);
        setShots((s) => [...s, false]);
        advance();
      }, 1100);
      return;
    }
    setShots((s) => [...s, false]);
    setFlash('out');
    schedule(advance, delay);
  }, [advance, schedule]);

  const resolve = useCallback((a: number, p: number) => {
    if (phaseRef.current !== 'aim' || done.current || !mounted.current) return;
    const shotPlan = flightPlan(attemptRef.current, a, p, specRef.current, aspectRef.current);
    const hit = resolveDragShot(attemptRef.current, a, p, specRef.current, aspectRef.current);
    phaseRef.current = 'flight';
    setPhase('flight');
    setLocked(true);
    setPlan(shotPlan);
    draggingRef.current = false;
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

  const putback = useCallback(() => {
    if (!reboundRef.current) return;
    reboundRef.current = false;
    if (reboundTimer.current) {
      window.clearTimeout(reboundTimer.current);
      reboundTimer.current = 0;
    }
    angleRef.current = 0;
    powerRef.current = 0;
    setRebound(false);
    setFlash(null);
    setPlan(null);
    setLocked(false);
    setAngle(0);
    setPower(0);
    phaseRef.current = 'aim';
    setPhase('aim');
    placeBall(ballX(attemptRef.current), ballY(attemptRef.current));
  }, [placeBall]);

  /** Aborts the aim without shooting (pointercancel, blur, tab hidden). */
  const cancelAim = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    angleRef.current = 0;
    powerRef.current = 0;
    setAngle(0);
    setPower(0);
    setAimTone('bad');
  }, []);

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

  const measureAspect = () => {
    const el = arena.current;
    if (!el) {
      aspectRef.current = 1;
      return;
    }
    const r = el.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    aspectRef.current = Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 ? h / w : 1;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'aim') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        angleRef.current = clamp(angleRef.current + (e.key === 'ArrowLeft' ? -2 : 2), -90, 90);
        setAngle(angleRef.current);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        powerRef.current = clamp(powerRef.current + (e.key === 'ArrowUp' ? 0.05 : -0.05), 0, 1);
        setPower(powerRef.current);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        measureAspect();
        resolve(angleRef.current, powerRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resolve]);

  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = arena.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const aim = (x: number, y: number) => {
    const g = dragGeometry(attemptRef.current, specRef.current, aspectRef.current);
    const a = aimFromPointer(g, x, y);
    angleRef.current = a.angleDeg;
    powerRef.current = a.power;
    setAngle(a.angleDeg);
    setPower(a.power);
    const err = shotError(g, a.angleDeg, a.power);
    if (err.hit) {
      setAimTone('good');
      return;
    }
    const near = Math.abs(err.angleDelta) <= g.angleTol * 1.8 && Math.abs(err.powerDelta) <= g.powerTol * 1.8;
    setAimTone(near ? 'near' : 'bad');
  };

  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* capture already gone */ }
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'aim' || done.current) return;
    e.preventDefault();
    measureAspect();
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    const p = point(e);
    aim(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || phaseRef.current !== 'aim') return;
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const p = point(e);
    aim(p.x, p.y);
  };

  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    release(e);
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (phaseRef.current !== 'aim') return;
    e.preventDefault();
    const p = point(e);
    aim(p.x, p.y);
    resolve(angleRef.current, powerRef.current);
  };

  const cancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    release(e);
    if (!draggingRef.current) return; // Already in flight: the verdict already decided runs to the end.
    draggingRef.current = false;
    if (phaseRef.current !== 'aim') return;
    angleRef.current = 0;
    powerRef.current = 0;
    setAngle(0);
    setPower(0);
    setAimTone('bad');
  };

  const bx = ballX(attempt);
  const by = ballY(attempt);
  const rX = rimX(attempt);
  const arcD = phase === 'aim' ? flightPathD(flightPlan(attempt, angle, power, spec, aspectRef.current)) : '';
  const num = Math.min(attempt + 1, spec.attempts);

  return (
    <div className={`drag-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{t('Arrastra el balón y suelta para lanzar')}</span>
        <span className="shot-score"><b>{made}</b> / {spec.attempts}</span>
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
        aria-label={t(`Arrastra y suelta. Tiro ${num} de ${spec.attempts}`)}
      >
        <span className="drag-board" style={{ left: `${rX}%`, top: `${RIM_Y - 18}%` }} />
        <span className="drag-net" style={{ left: `${rX}%`, top: `${RIM_Y + 2}%` }} />
        <span className="drag-rim" style={{ left: `${rX}%`, top: `${RIM_Y}%` }} />
        <svg className={`drag-arc ${aimTone}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={arcD} />
        </svg>
        <svg className="drag-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={plan ? flightPathD(plan) : ''} />
        </svg>
        <span className="drag-ball" ref={ballEl} style={{ left: `${bx}%`, top: `${by}%` }} />
        {rebound && (
          <button
            type="button"
            className="drag-rebound"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); putback(); }}
            onClick={(e) => { if (e.detail === 0) putback(); }}
          >
            ¡Rebote!
          </button>
        )}
        {flash && <span className="drag-msg">{flash === 'in' ? t('¡DENTRO!') : t('FUERA')}</span>}
      </div>
      <div className="drag-power"><span style={{ width: `${Math.round(power * 100)}%` }} /></div>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: spec.attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Flechas para apuntar · Espacio/Enter para lanzar')} · {t('zona')} {spec.zone}%</span>
        {!locked && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
      {!motionReduced() && <span className="tiny dim" style={{ display: 'block', marginTop: 6 }}>🖱️ Trayectoria completa</span>}
      <div className="sr-only" aria-live="polite">
        {flash ? t(`Tiro ${num}/${spec.attempts}: ${flash === 'in' ? 'Dentro' : 'Fuera'}`) : ''}
      </div>
    </div>
  );
}
