import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../../engine/types';
import { minigameHint } from '../../content/minigames';
import { t } from '../../i18n/i18n';

/** Where the bullseye sits on each attempt (varies so it is not muscle memory). */
const targetCenter = (i: number) => 25 + ((i * 41) % 50);

/**
 * Aiming minigame: a vertical line sweeps across the target; tap (or press Space/Enter) while it
 * crosses the green circle. The circle radius comes from the player's attributes and pressure.
 */
export function TargetGame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [made, setMade] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<'in' | 'out' | null>(null);
  const [locked, setLocked] = useState(false);
  const pos = useRef(0);
  const lineRef = useRef<HTMLSpanElement>(null);
  const start = useRef(performance.now());
  const center = targetCenter(attempt);
  const finished = attempt >= spec.attempts;

  useEffect(() => {
    if (finished) return;
    let raf = 0;
    start.current = performance.now();
    const tick = (now: number) => {
      const elapsed = ((now - start.current) / 1000) * spec.speed;
      const phase = elapsed % 2;
      pos.current = (phase < 1 ? phase : 2 - phase) * 100; // triangle wave 0..100..0
      if (lineRef.current) lineRef.current.style.left = `${pos.current}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [attempt, finished, spec.speed]);

  const fire = useCallback(() => {
    if (locked || finished) return;
    const hit = Math.abs(pos.current - center) <= spec.zone / 2;
    setLocked(true);
    setFlash(hit ? 'in' : 'out');
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
        fire();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fire]);

  return (
    <div className={`target-game ${flash ?? ''}`}>
      <div className="shot-top">
        <span className="tiny dim">{minigameHint(spec.kind)}</span>
        <span className="shot-score"><b>{made}</b> / {spec.attempts}</span>
      </div>
      {/* Fires on touch/press, not on release: a timing game must not lag behind the finger. Keyboard clicks (detail 0) still shoot. */}
      <button
        type="button"
        className="target-arena"
        onPointerDown={(e) => { e.preventDefault(); fire(); }}
        onClick={(e) => { if (e.detail === 0) fire(); }}
        disabled={locked || finished}
        aria-label={t(`Lanzar a la diana. Tiro ${Math.min(attempt + 1, spec.attempts)} de ${spec.attempts}`)}
      >
        <span className="target-ring" style={{ left: `${center}%`, width: `${spec.zone}%` }} />
        <span className="target-line" ref={lineRef} />
        {flash && <span className="target-msg">{flash === 'in' ? t('¡DIANA!') : t('FUERA')}</span>}
      </button>
      <div className="mg-dots" aria-label={`${made} aciertos`}>
        {Array.from({ length: spec.attempts }, (_, i) => <span key={i} className={i < shots.length ? (shots[i] ? 'hit' : 'miss') : ''} />)}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="tiny dim">{t('Clic, toque, Espacio o Enter para lanzar')} · {t('diana')} {spec.zone}%</span>
        {!finished && shots.length === 0 && <button type="button" className="btn sm ghost" onClick={onSimulate}>{t('Simular')}</button>}
      </div>
    </div>
  );
}
