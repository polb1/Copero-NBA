import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { clamp } from '../../engine/rng';
import { t } from '../../i18n/i18n';

const RIM_Y = 36;
const ballX = (attempt: number) => 12 + ((attempt * 29) % 18);
const ballY = (attempt: number) => 62 + ((attempt * 17) % 20);
const rimX = (attempt: number) => 72 + ((attempt * 37) % 22);

/** Pure scoring: an angle/power pair is good if it is close to the line to the rim. */
export function resolveDragShot(
  attempt: number,
  angleDeg: number,
  power: number,
  spec: Pick<MinigameSpec, 'kind' | 'zone'>,
): boolean {
  const dx = rimX(attempt) - ballX(attempt);
  const dy = RIM_Y - ballY(attempt);
  const optimal = (Math.atan2(dy, dx) * 180) / Math.PI;
  const dist = Math.hypot(dx, dy) / 100;
  const idealPower = clamp(dist, 0.3, 0.9);
  const angleTol = clamp(spec.zone * 0.45 - 4, 3, 18);
  const powerTol = clamp(spec.zone / 300, 0.05, 0.16);
  return Math.abs(angleDeg - optimal) <= angleTol && Math.abs(power - idealPower) <= powerTol;
}

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
  const [, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [rebound, setRebound] = useState(false);
  const reboundRef = useRef(false);
  const retryUsed = useRef(false);
  const reboundTimer = useRef(0);

  const arena = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const powerRef = useRef(0);
  const madeRef = useRef(0);
  const attemptRef = useRef(0);
  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const onDoneRef = useRef(onDone);
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

  useEffect(() => () => {
    clearTimers();
    if (reboundTimer.current) window.clearTimeout(reboundTimer.current);
  }, [clearTimers]);

  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = arena.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const aim = (x: number, y: number) => {
    const dx = x - ballX(attempt);
    const dy = y - ballY(attempt);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const p = clamp(Math.hypot(dx, dy) / 100, 0, 1);
    angleRef.current = a;
    powerRef.current = p;
    setAngle(a);
    setPower(p);
  };

  const advance = useCallback(() => {
    setFlash(null);
    setLocked(false);
    setPower(0);
    setAngle(0);
    retryUsed.current = false;
    const next = attemptRef.current + 1;
    if (next >= spec.attempts) {
      done.current = true;
      onDoneRef.current(madeRef.current);
      return;
    }
    attemptRef.current = next;
    setAttempt(next);
  }, [spec.attempts]);

  const resolve = useCallback((a: number, p: number) => {
    if (locked || done.current) return;
    const hit = resolveDragShot(attemptRef.current, a, p, spec);
    setLocked(true);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    if (hit) {
      madeRef.current += 1;
      setMade(madeRef.current);
      setShots((s) => [...s, true]);
      schedule(advance, spec.attempts > 5 ? 520 : 800);
      return;
    }
    if (retryUsed.current) {
      setShots((s) => [...s, false]);
      schedule(advance, spec.attempts > 5 ? 520 : 800);
      return;
    }
    retryUsed.current = true;
    reboundRef.current = true;
    setRebound(true);
    reboundTimer.current = window.setTimeout(() => {
      if (!reboundRef.current) return;
      reboundRef.current = false;
      setRebound(false);
      setShots((s) => [...s, false]);
      advance();
    }, 1100);
  }, [locked, spec, schedule, advance]);

  const putback = useCallback(() => {
    if (!reboundRef.current) return;
    reboundRef.current = false;
    setRebound(false);
    if (reboundTimer.current) window.clearTimeout(reboundTimer.current);
    setFlash(null);
    setLocked(false);
    setPower(0);
    setAngle(0);
  }, []);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    draggingRef.current = true;
    const p = point(e);
    aim(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const p = point(e);
    aim(p.x, p.y);
  };

  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    setDragging(false);
    draggingRef.current = false;
    const p = point(e);
    const dx = p.x - ballX(attempt);
    const dy = p.y - ballY(attempt);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const pw = clamp(Math.hypot(dx, dy) / 100, 0, 1);
    resolve(a, pw);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
        resolve(angleRef.current, powerRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resolve]);

  const bx = ballX(attempt);
  const by = ballY(attempt);
  const rX = rimX(attempt);
  const rad = (angle * Math.PI) / 180;
  const endX = bx + Math.cos(rad) * power * 100;
  const endY = by + Math.sin(rad) * power * 100;

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
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label={t(`Arrastra y suelta. Tiro ${Math.min(attempt + 1, spec.attempts)} de ${spec.attempts}`)}
      >
        <span className="drag-board" style={{ left: `${rX}%`, top: `${RIM_Y - 18}%` }} />
        <span className="drag-net" style={{ left: `${rX}%`, top: `${RIM_Y + 2}%` }} />
        <span className="drag-rim" style={{ left: `${rX}%`, top: `${RIM_Y}%` }} />
        <svg className="drag-arc" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={`M ${bx} ${by} Q ${(bx + endX) / 2} ${Math.min(by, endY) - 18 - 15 * power} ${endX} ${endY}`}
          />
        </svg>
        <span className="drag-ball" style={{ left: `${bx}%`, top: `${by}%` }} />
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
    </div>
  );
}