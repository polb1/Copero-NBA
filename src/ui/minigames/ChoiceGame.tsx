import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { t } from '../../i18n/i18n';

const LANES = 5;
/** How many lanes light up per attempt: easier levels ask for a shorter sequence. */
const seqLenFor = (tier: MinigameSpec['tier']) => (tier === 'hard' ? 4 : tier === 'easy' ? 2 : 3);
/** Reading time before the sequence starts. */
const leadMs = 300;
/** How long each lane of the sequence stays lit. */
const flashMsFor = (tier: MinigameSpec['tier']) => (tier === 'hard' ? 240 : tier === 'easy' ? 400 : 320);
/** Dark pause between two steps of the sequence. */
const gapMs = 90;
/** Time to repeat the whole sequence on the buttons. */
const inputMs = 2800;
/** Feedback pause between attempts. */
const stepMs = 520;

/**
 * Varied sequence per attempt. Consecutive steps never share a lane.
 * Generates an unpredictable pattern across games and attempts.
 */
function buildSequence(_kind: string, _attempt: number, length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    let lane = Math.floor(Math.random() * LANES);
    if (i > 0 && lane === seq[i - 1]) {
      // Pick randomly from the other 4 lanes so there is no fixed "+1 modulo" pattern
      lane = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
    }
    seq.push(lane);
  }
  return seq;
}

type Phase = 'lead' | 'show' | 'input' | 'done';

/**
 * Memory minigame: a deterministic sequence of lanes lights up; when the buttons wake up the player
 * repeats it in order. A wrong lane, or not finishing inside the input window, is a miss.
 */
export function ChoiceGame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const attempts = Math.max(1, spec.attempts);
  const seqLen = seqLenFor(spec.tier);
  const flashMs = flashMsFor(spec.tier);
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>('lead');
  const [lit, setLit] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [entry, setEntry] = useState(0);

  const timers = useRef<number[]>([]);
  const endTimer = useRef(0);
  const resolved = useRef(false);
  const done = useRef(false);
  const attemptRef = useRef(0);
  const madeRef = useRef(0);
  const seqRef = useRef<number[]>([]);
  const entryRef = useRef(0);
  const phaseRef = useRef<Phase>('lead');
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
    phaseRef.current = 'done';
    setPhase('done');
    setLit(null);
    setPicked(touched);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    madeRef.current += hit ? 1 : 0;
    setMade(madeRef.current);
    setShots((s) => [...s, hit]);
    schedule(() => {
      setFlash(null);
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
  }, [schedule, attempts]);

  /** Arms the next attempt: lead-in, one lit lane per step, then the input window. */
  useEffect(() => {
    if (attempt >= attempts) return;
    clearTimers();
    attemptRef.current = attempt;
    resolved.current = false;
    const seq = buildSequence(spec.kind, attempt, seqLen);
    seqRef.current = seq;
    entryRef.current = 0;
    phaseRef.current = 'lead';
    setPhase('lead');
    setEntry(0);
    setLit(null);
    setPicked(null);
    setFlash(null);

    let at = leadMs;
    for (let i = 0; i < seq.length; i++) {
      const lane = seq[i];
      const last = i === seq.length - 1;
      schedule(() => {
        if (resolved.current || attemptRef.current !== attempt) return;
        phaseRef.current = 'show';
        setPhase('show');
        setLit(lane);
      }, at);
      at += flashMs;
      schedule(() => {
        if (resolved.current || attemptRef.current !== attempt) return;
        setLit(null);
      }, at);
      if (!last) at += gapMs;
    }
    schedule(() => {
      if (resolved.current || attemptRef.current !== attempt) return;
      phaseRef.current = 'input';
      setPhase('input');
      setLit(null);
      schedule(() => {
        if (resolved.current || attemptRef.current !== attempt) return;
        resolve(false, null);
      }, inputMs);
    }, at);
  }, [attempt, attempts, spec.kind, seqLen, flashMs, schedule, resolve, clearTimers]);

  const tap = useCallback((i: number) => {
    if (resolved.current || phaseRef.current !== 'input') return;
    const seq = seqRef.current;
    if (entryRef.current >= seq.length) return;
    if (i !== seq[entryRef.current]) {
      resolve(false, i);
      return;
    }
    entryRef.current += 1;
    setEntry(entryRef.current);
    if (entryRef.current >= seq.length) resolve(true, i);
  }, [resolve]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > LANES) return;
      e.preventDefault();
      tap(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

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
            className={`choice-lane${lit === i ? ' open' : ''}${picked === i ? ' picked' : ''}`}
            onPointerDown={(e) => { e.preventDefault(); tap(i); }}
            onClick={(e) => { if (e.detail === 0) tap(i); }}
            disabled={phase !== 'input'}
            aria-label={t(`Carril ${i + 1}. Intento ${Math.min(attempt + 1, attempts)} de ${attempts}`)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="choice-msg" role="status">
        {flash
          ? (flash === 'in' ? t('¡CORRECTO!') : t('FALLO'))
          : phase === 'input'
            ? t('Repite la secuencia')
            : phase === 'show'
              ? t('Memoriza la secuencia')
              : t('Prepárate…')}
      </div>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Toca los carriles o pulsa 1-5')} · {entry} / {seqLen}</span>
        {phase !== 'done' && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
