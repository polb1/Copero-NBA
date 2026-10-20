import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { t } from '../../i18n/i18n';

/** Where the green band sits on each attempt (varies so it is not muscle memory). */
const powerCenter = (i: number) => 20 + ((i * 43) % 60);

/**
 * Charge minigame: hold (pointer or Space/Enter) to fill the bar and release inside the green band.
 * The bar fills at `spec.speed` bars per second; the band width comes from the player's attributes.
 */
export function PowerGame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);
  const [held, setHeld] = useState(false);
  const fillRef = useRef(0);
  const fillEl = useRef<HTMLSpanElement>(null);

  /** Writes the charge into the DOM directly: a per-frame React state update would re-render on mobile. */
  const paintFill = useCallback((v: number) => {
    fillRef.current = v;
    if (fillEl.current) fillEl.current.style.width = `${v}%`;
  }, []);

  const holding = useRef(false);
  const raf = useRef(0);
  const center = powerCenter(attempt);
  const finished = attempt >= spec.attempts;

  const stopLoop = useCallback(() => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
  }, []);

  /** Starts charging. Guarded so a repeated keydown or a second pointer never starts twice. */
  const begin = useCallback(() => {
    if (holding.current || locked || finished) return;
    holding.current = true;
    setHeld(true);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paintFill(Math.min(100, fillRef.current + spec.speed * 100 * dt));
      if (fillRef.current >= 100) {
        raf.current = 0;
        return; // full bar: keep the charge until release, the value cannot grow further
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [locked, finished, spec.speed, paintFill]);

  /** Releases and scores the attempt. A release without a charge is ignored. */
  const release = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    setHeld(false);
    stopLoop();
    if (locked || finished) {
      paintFill(0);
      return;
    }
    const hit = Math.abs(fillRef.current - center) <= spec.zone / 2;
    setLocked(true);
    setFlash(hit ? 'in' : 'out');
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    setShots((s) => [...s, hit]);
    const nextMade = made + (hit ? 1 : 0);
    setMade(nextMade);
    setTimeout(() => {
      setFlash(null);
      setLocked(false);
      paintFill(0);
      const next = attempt + 1;
      setAttempt(next);
      if (next >= spec.attempts) setTimeout(() => onDone(nextMade), 350);
    }, spec.attempts > 5 ? 520 : 800);
  }, [locked, finished, center, spec.zone, spec.attempts, made, attempt, onDone, stopLoop, paintFill]);

  /** A lost focus or a cancelled pointer is not a release: drop the charge without scoring it. */
  const abort = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    setHeld(false);
    stopLoop();
    paintFill(0);
  }, [stopLoop, paintFill]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Enter') return;
      e.preventDefault();
      if (e.repeat) return;
      begin();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Enter') return;
      e.preventDefault();
      release();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', abort);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', abort);
      holding.current = false;
      stopLoop();
    };
  }, [begin, release, abort, stopLoop, paintFill]);

  return (
    <div className={`power-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {spec.attempts}</span>
      </div>
      <button
        type="button"
        className="power-track"
        onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); begin(); }}
        onPointerUp={(e) => { e.preventDefault(); release(); }}
        onPointerCancel={() => abort()}
        onContextMenu={(e) => e.preventDefault()}
        disabled={locked || finished}
        aria-label={t(`Mantén pulsado. Intento ${Math.min(attempt + 1, spec.attempts)} de ${spec.attempts}`)}
      >
        <span className="power-band" style={{ left: `${center - spec.zone / 2}%`, width: `${spec.zone}%` }} />
        <span className="power-fill" ref={fillEl} />
        {flash && <span className="power-msg">{flash === 'in' ? t('¡DENTRO!') : t('FUERA')}</span>}
      </button>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: spec.attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{held ? t('¡Suelta!') : t('Mantén pulsado y suelta dentro de la franja')} · {t('franja')} {spec.zone}%</span>
        {!finished && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
