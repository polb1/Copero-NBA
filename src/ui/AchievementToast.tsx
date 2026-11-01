import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENTS, type AchievementDef } from '../engine/achievements';
import { useCareer } from '../store/store';

/**
 * Vigila la carrera y, cuando se desbloquea un logro mientras juegas, muestra un
 * modal pequeño abajo con confeti. Se puede cerrar tocándolo.
 */
export function AchievementWatcher() {
  const c = useCareer();
  const [queue, setQueue] = useState<AchievementDef[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const careerId = useRef<string | null>(null);

  useEffect(() => {
    if (!c) {
      seen.current = null;
      careerId.current = null;
      return;
    }
    const now = new Set(c.achievements);
    // carrera nueva o cargada: no celebramos lo que ya estaba
    if (seen.current === null || careerId.current !== c.id) {
      seen.current = now;
      careerId.current = c.id;
      return;
    }
    const nuevos = [...now].filter((id) => !seen.current!.has(id));
    seen.current = now;
    if (!nuevos.length) return;
    const defs = nuevos
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter((a): a is AchievementDef => Boolean(a));
    setQueue((q) => [...q, ...defs]);
  }, [c, c?.achievements]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 4200);
    return () => window.clearTimeout(id);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="ach-toast"
      role="status"
      aria-live="polite"
      onClick={() => setQueue((q) => q.slice(1))}
    >
      <div className="ach-confetti" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 4.5 + (i % 3) * 3) % 100}%`,
              animationDelay: `${(i % 7) * 90}ms`,
              background: ['#ff6b1a', '#f0c04d', '#4edea3', '#ffb596'][i % 4],
            }}
          />
        ))}
      </div>
      <span className="ach-toast-icon" aria-hidden="true">{current.icon}</span>
      <div className="ach-toast-body">
        <span className="ach-toast-kicker">Logro desbloqueado</span>
        <b>{current.title}</b>
        <small>{current.desc}</small>
      </div>
      {queue.length > 1 && <span className="ach-toast-more">+{queue.length - 1}</span>}
    </div>
  );
}
