import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { hashString } from '../../engine/rng';
import { t } from '../../i18n/i18n';

const LANES = 3;
/** The open lane stays visible this long, then hides. Longer zones = more reading time. */
const readMs = (zone: number) => 900 + zone * 20;
/** After the lane hides, the player has this long to pick before it counts as a miss. */
const pickMs = 2000;

/** Deterministic per-attempt draw: which lane is open. */
function roll(kind: string, attempt: number) {
  return hashString(`${kind}|${attempt}|choice|${LANES}`) % LANES;
}

/**
 * Memory minigame: one of three lanes is shown open for a moment; when all lanes look the same the
 * player taps the one that was open. Too slow (or the wrong lane) is a miss.
 */
export function ChoiceGame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const attempts = Math.max(1, spec.attempts);
  const stepMs = attempts > 5 ? 520 : 800;
  const readingMs = readMs(spec.zone);
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);

  const timers = useRef<number[]>([]);
  const endTimer = useRef(0);
  const resolved = useRef(false);
  const done = useRef(false);
  const attemptRef = useRef(0);
  const madeRef = useRef(0);
  const correctRef = useRef(0);
  const hidden = useRef(false);
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
    setLocked(true);
    setPicked(touched);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    madeRef.current += hit ? 1 : 0;
    setMade(madeRef.current);
    setShots((s) => [...s, hit]);
    schedule(() => {
      setFlash(null);
      setPicked(null);
      setOpen(false);
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

  /** Arms the next attempt: show the open lane, hide it, then start the pick clock. */
  useEffect(() => {
    if (attempt >= attempts) return;
    clearTimers();
    attemptRef.current = attempt;
    resolved.current = false;
    hidden.current = false;
    correctRef.current = roll(spec.kind, attempt);
    setOpen(true);
    setPicked(null);
    setFlash(null);
    setLocked(false);
    schedule(() => {
      if (resolved.current || attemptRef.current !== attempt) return;
      hidden.current = true;
      setOpen(false);
      schedule(() => {
        if (resolved.current || attemptRef.current !== attempt) return;
        resolve(false, null);
      }, pickMs);
    }, readingMs);
  }, [attempt, attempts, spec.kind, readingMs, schedule, resolve, clearTimers]);

  const pick = useCallback((i: number) => {
    if (resolved.current) return;
    if (!hidden.current) return; // the memory phase: touching an open lane is not scored
    resolve(i === correctRef.current, i);
  }, [resolve]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > LANES) return;
      e.preventDefault();
      pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick]);

  useEffect(() => () => {
    clearTimers();
    if (endTimer.current) window.clearTimeout(endTimer.current);
  }, [clearTimers]);

  return (
    <div className={`choice-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {attempts}</span>
      </div>
      <div className="choice-lanes">
        {Array.from({ length: LANES }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`choice-lane${open && correctRef.current === i ? ' open' : ''}${picked === i ? ' picked' : ''}`}
            onPointerDown={(e) => { e.preventDefault(); pick(i); }}
            onClick={(e) => { if (e.detail === 0) pick(i); }}
            disabled={locked}
            aria-label={t(`Carril ${i + 1}. Intento ${Math.min(attempt + 1, attempts)} de ${attempts}`)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="choice-msg" role="status">
        {flash ? (flash === 'in' ? t('¡CORRECTO!') : t('FALLO')) : open ? t('Memoriza el carril abierto') : t('Toca el carril que estaba abierto')}
      </div>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Toca el carril o pulsa 1-3')} · {t('lectura')} {readingMs} ms</span>
        {!locked && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
