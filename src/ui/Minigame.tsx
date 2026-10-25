import { useEffect, useRef, useState } from 'react';
import type { MinigameSpec } from '../engine/types';
import { t } from '../i18n/i18n';
import { ShotMeter } from './ShotMeter';
import { TargetGame } from './minigames/TargetGame';
import { PowerGame } from './minigames/PowerGame';
import { ReactionGame } from './minigames/ReactionGame';
import { ChoiceGame } from './minigames/ChoiceGame';
import { DragShotGame } from './minigames/DragShotGame';

const COUNTDOWN_STEP_MS = 900;

/** Dispatches a challenge to the widget that plays it. Absent mechanic (saves v1) = shot meter. */
export function Minigame({ spec, onDone, onSimulate }: { spec: MinigameSpec; onDone: (made: number) => void; onSimulate: () => void }) {
  const [count, setCount] = useState(3);
  const [ready, setReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (ready) return;
    const id = window.setTimeout(() => {
      if (count <= 1) setReady(true);
      else setCount(count - 1);
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(id);
  }, [count, ready]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < 8 || r.bottom > window.innerHeight - 8) {
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  if (!ready) {
    return (
      <div
        className="minigame-countdown"
        ref={box}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`${t('Prepárate…')} ${count}`}
      >
        <span className="mg-count-label">{t('Prepárate…')}</span>
        <strong key={count} className="mg-count-num" aria-hidden="true">{count}</strong>
        <div className="mg-count-track" aria-hidden="true"><span key={count} /></div>
        <span className="mg-count-hint" aria-hidden="true">3 · 2 · 1</span>
      </div>
    );
  }

  const game = (() => {
    switch (spec.mechanic ?? 'meter') {
      case 'target':
        return <TargetGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
      case 'power':
        return <PowerGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
      case 'reaction':
        return <ReactionGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
      case 'choice':
        return <ChoiceGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
      case 'drag':
        return <DragShotGame spec={spec} onDone={onDone} onSimulate={onSimulate} />;
      default:
        return <ShotMeter spec={spec} onDone={onDone} onSimulate={onSimulate} />;
    }
  })();

  return <div ref={box}>{game}</div>;
}
