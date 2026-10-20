import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { hashString } from '../../engine/rng';
import { t } from '../../i18n/i18n';

/** Deterministic per-attempt draw: which cell lights up and how long the player has to wait first. */
function roll(kind: string, attempt: number, slots: number) {
  const h = hashString(`${kind}|${attempt}|reaction|${slots}`);
  return { cell: (h >>> 13) % slots, delay: 300 + (h % 601) }; // delay 300..900 ms
}

/** Time the player has to touch the lit cell: the declared window scaled by the zone. */
const reactionWindowMs = (spec: MinigameSpec) => Math.max(1, Math.round(((spec.windowMs ?? 1200) * spec.zone) / 100));

/**
 * Reflex minigame: after a short unknown delay one cell lights up; tap it (or press its number) inside
 * the reaction window. The window is `windowMs * zone / 100`; both come from the player's attributes.
 */
export function ReactionGame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const slots = Math.min(4, Math.max(3, spec.slots ?? 4));
  const attempts = Math.max(1, spec.attempts);
  const stepMs = attempts > 5 ? 520 : 800;
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);

  const timers = useRef<number[]>([]);
  const endTimer = useRef(0);
  const resolved = useRef(false);
  const done = useRef(false);
  const attemptRef = useRef(0);
  const madeRef = useRef(0);
  const litRef = useRef<number | null>(null);
  const litAt = useRef(0);
  const windowRef = useRef(0);
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

  /** Scores the attempt at most once; a late timer or a second touch is ignored. */
  const resolve = useCallback((hit: boolean, touched: number | null) => {
    if (resolved.current) return;
    resolved.current = true;
    litRef.current = null; // no more touches until the next attempt
    setLocked(true);
    setPicked(touched);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    madeRef.current += hit ? 1 : 0;
    setMade(madeRef.current);
    setShots((s) => [...s, hit]);
    schedule(() => {
      setFlash(null);
      setLit(null);
      setPicked(null);
      const next = attemptRef.current + 1;
      if (next >= attempts) {
        // Own timer: the attempt effect clears its own timers, not this one.
        endTimer.current = window.setTimeout(() => {
          if (done.current) return;
          done.current = true;
          onDoneRef.current(madeRef.current);
        }, 350);
        return;
      }
      attemptRef.current = next;
      setAttempt(next);
    }, stepMs);
  }, [schedule, stepMs, attempts]);

  /** Arms the next attempt: one light after a deterministic delay, then the reaction window. */
  useEffect(() => {
    if (attempt >= attempts) return;
    clearTimers();
    attemptRef.current = attempt;
    resolved.current = false;
    litRef.current = null;
    litAt.current = 0;
    setLit(null);
    setPicked(null);
    setFlash(null);
    setLocked(false);
    const { cell, delay } = roll(spec.kind, attempt, slots);
    const reactionWindow = reactionWindowMs(spec);
    windowRef.current = reactionWindow;
    schedule(() => {
      if (resolved.current || attemptRef.current !== attempt) return;
      litRef.current = cell;
      litAt.current = performance.now();
      setLit(cell);
      schedule(() => {
        if (resolved.current || attemptRef.current !== attempt) return;
        resolve(false, null);
      }, reactionWindow);
    }, delay);
  }, [attempt, attempts, spec.kind, spec.windowMs, spec.zone, slots, schedule, resolve, clearTimers]);

  const pick = useCallback((i: number) => {
    if (resolved.current) return;
    const correct = litRef.current;
    if (correct === null) return; // still waiting: an early touch is not scored
    const elapsed = performance.now() - litAt.current;
    resolve(i === correct && elapsed <= windowRef.current, i);
  }, [resolve]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > slots) return;
      e.preventDefault();
      pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, slots]);

  useEffect(() => () => {
    clearTimers();
    if (endTimer.current) window.clearTimeout(endTimer.current);
  }, [clearTimers]);

  return (
    <div className={`react-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {attempts}</span>
      </div>
      <div className={`react-grid c${slots}`}>
        {Array.from({ length: slots }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`react-cell${lit === i ? ' lit' : ''}${picked === i ? ' picked' : ''}`}
            onPointerDown={(e) => { e.preventDefault(); pick(i); }}
            onClick={(e) => { if (e.detail === 0) pick(i); }}
            disabled={locked}
            aria-label={t(`Celda ${i + 1}. Intento ${Math.min(attempt + 1, attempts)} de ${attempts}`)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="react-msg" role="status">
        {flash ? (flash === 'in' ? t('¡AHORA!') : t('TARDE')) : lit !== null ? t('¡Toca la celda iluminada!') : t('Prepárate…')}
      </div>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Toca la celda o pulsa 1-' + slots)} · {t('ventana')} {reactionWindowMs(spec)} ms</span>
        {!locked && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
