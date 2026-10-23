import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { t } from '../../i18n/i18n';

const slotPos = (attempt: number, slot: number, sec: number, motion: number) => {
  const phase = ((attempt * 37 + slot * 91) % 360) * (Math.PI / 180);
  return {
    x: 50 + 34 * Math.sin(sec * motion * 1.3 + phase + slot * 1.7),
    y: 50 + 28 * Math.cos(sec * motion * 1.1 + phase + slot * 2.3),
  };
};

export function TargetGame({ spec, onDone, onSimulate }: {
  spec: MinigameSpec;
  onDone: (made: number) => void;
  onSimulate: () => void;
}) {
  const slots = Math.min(4, Math.max(1, spec.slots ?? 1));
  const attempts = Math.max(1, spec.attempts);
  const timeoutMs = Math.max(900, Math.min(2600, 3000 - spec.speed * 1200));
  const motion = 1.1 + Math.min(1, Math.max(0, spec.speed)) * 0.9;
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const raf = useRef(0);
  const timer = useRef(0);
  const resolved = useRef(false);
  const madeRef = useRef(0);
  const attemptRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const clear = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const resolve = useCallback((hit: boolean) => {
    if (resolved.current) return;
    resolved.current = true;
    clear();
    setLocked(true);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    madeRef.current += hit ? 1 : 0;
    setMade(madeRef.current);
    setShots((s) => [...s, hit]);
    timer.current = window.setTimeout(() => {
      setFlash(null);
      setLocked(false);
      const next = attemptRef.current + 1;
      if (next >= attempts) {
        onDoneRef.current(madeRef.current);
        return;
      }
      attemptRef.current = next;
      setAttempt(next);
    }, attempts > 5 ? 520 : 800);
  }, [attempts, clear]);

  useEffect(() => {
    resolved.current = false;
    const start = performance.now();
    const tick = (now: number) => {
      const sec = (now - start) / 1000;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const p = slotPos(attempt, i, sec, motion);
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    timer.current = window.setTimeout(() => resolve(false), timeoutMs);
    return clear;
  }, [attempt, timeoutMs, resolve, clear, motion]);

  useEffect(() => () => clear(), [clear]);

  const size = Math.max(16, Math.min(42, spec.zone * 0.65));

  return (
    <div className={`target-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {attempts}</span>
      </div>
      <div className="target-arena">
        {Array.from({ length: slots }, (_, i) => (
          <button
            key={i}
            type="button"
            ref={(el) => { refs.current[i] = el; }}
            className={`target-dot ${i === 0 ? 'active' : 'decoy'}`}
            style={{ width: size, height: size }}
            onPointerDown={(e) => { e.preventDefault(); resolve(i === 0); }}
            onClick={(e) => { if (e.detail === 0) resolve(i === 0); }}
            disabled={locked}
            aria-label={i === 0 ? t('Toca la diana antes de que se cierre') : t('Diana señuelo')}
          />
        ))}
        {flash && <span className="target-msg">{flash === 'in' ? t('¡DIANA!') : t('FUERA')}</span>}
      </div>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Toca la diana antes de que se cierre')} · {t('diana')} {spec.zone}%</span>
        {!locked && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
