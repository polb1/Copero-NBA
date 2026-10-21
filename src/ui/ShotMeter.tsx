import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../engine/types';
import { minigameHint } from '../content/minigames';
import { Icon } from './icons';

/** Where the green zone sits for each attempt (varies so it is not muscle memory). */
const zoneCenter = (i: number) => 32 + ((i * 37) % 36);

/**
 * Timing minigame: a marker sweeps across the meter; shoot (click, tap, Space or Enter) while it is
 * inside the green zone. The zone width comes from the player's shooting attributes and pressure.
 */
export function ShotMeter({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);
  const pos = useRef(0);
  const markerRef = useRef<HTMLDivElement>(null);
  const start = useRef(performance.now());
  const center = zoneCenter(attempt);
  const finished = attempt >= spec.attempts;

  useEffect(() => {
    if (finished) return;
    let raf = 0;
    start.current = performance.now();
    const tick = (now: number) => {
      const t = ((now - start.current) / 1000) * spec.speed;
      const phase = t % 2;
      pos.current = (phase < 1 ? phase : 2 - phase) * 100; // triangle wave 0..100..0
      if (markerRef.current) markerRef.current.style.left = `${pos.current}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [attempt, finished, spec.speed]);

  const shoot = useCallback(() => {
    if (locked || finished) return;
    const hit = Math.abs(pos.current - center) <= spec.zone / 2;
    setLocked(true);
    setFlash(hit ? 'in' : 'out');
    // A short buzz on phones that support it (Android); a no-op elsewhere.
    try { navigator.vibrate?.(hit ? [18, 40, 18] : 35); } catch { /* not supported */ }
    setShots((s) => [...s, hit]);
    const nextMade = made + (hit ? 1 : 0);
    setMade(nextMade);
    setTimeout(() => {
      setFlash(null);
      setLocked(false);
      const next = attempt + 1;
      setAttempt(next);
      if (next >= spec.attempts) setTimeout(() => onDone(nextMade), 350);
    }, spec.attempts > 5 ? 520 : 800);
  }, [locked, finished, center, spec.zone, spec.attempts, made, attempt, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shoot]);

  return (
    <div className="shot">
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {spec.attempts}</span>
      </div>
      <div className={`hoop ${flash ?? ''}`} aria-hidden="true">
        <div className="board" />
        <div className="rim" />
        <div className="net" />
        <div className="ball-fly"><Icon name="ball" size={28} /></div>
        {flash && <div className="shot-msg">{flash === 'in' ? '¡DENTRO!' : 'FUERA'}</div>}
      </div>
      {/* Fires on touch/press, not on release: a timing game must not lag behind the finger. Keyboard clicks (detail 0) still shoot. */}
      <button type="button" className="meter" onPointerDown={(e) => { e.preventDefault(); shoot(); }} onClick={(e) => { if (e.detail === 0) shoot(); }} disabled={locked || finished} aria-label={`Lanzar. Tiro ${Math.min(attempt + 1, spec.attempts)} de ${spec.attempts}`}>
        <span className="zone" style={{ left: `${center - spec.zone / 2}%`, width: `${spec.zone}%` }} />
        <span className="sweet" style={{ left: `${center - 0.6}%` }} />
        <div className="marker" ref={markerRef} />
      </button>
      <div className="shot-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: spec.attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">Clic, toque, Espacio o Enter para lanzar · zona {spec.zone}%</span>
        {!finished && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>Simular</button>}
      </div>
    </div>
  );
}
