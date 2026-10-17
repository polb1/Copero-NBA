import { useEffect } from 'react';
import { store, useCareer } from '../store/store';
import { chooseOption, dismissEvent, playMinigame } from '../engine/api';
import { CATEGORY_LABEL } from '../content/events';
import { Icon } from './icons';
import { ShotMeter } from './ShotMeter';

export function EventModal() {
  const c = useCareer();
  const ev = c?.pendingEvent;

  useEffect(() => {
    if (!ev) return;
    const onKey = (e: KeyboardEvent) => {
      if (ev.resolved) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          store.act(dismissEvent);
        }
        return;
      }
      if (ev.minigame) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ev.options.length) store.act((x) => chooseOption(x, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev]);

  if (!c || !ev) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <div className="modal">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="chip accent">{CATEGORY_LABEL[ev.category] ?? ev.category}</span>
          <span className="tiny dim">Decisión</span>
        </div>
        <h2 id="ev-title" style={{ fontSize: '2rem', marginBottom: 10 }}>{ev.title}</h2>
        <p className="muted" style={{ fontSize: '1rem', marginBottom: 20 }}>{ev.text}</p>
        {!ev.resolved && ev.minigame ? (
          <ShotMeter key={ev.defId + ev.title} spec={ev.minigame} onDone={(made) => store.act((x) => playMinigame(x, made))} onSimulate={() => store.act((x) => chooseOption(x, 0))} />
        ) : !ev.resolved ? (
          <div className="stack">
            {ev.options.map((o, i) => (
              <button key={i} className="opt" onClick={() => store.act((x) => chooseOption(x, i))} autoFocus={i === 0}>
                <div className="row between"><b>{o.label}</b><kbd>{i + 1}</kbd></div>
                <span>{o.desc}</span>
              </button>
            ))}
            <p className="tiny dim" style={{ marginTop: 4 }}>Las consecuencias exactas no se revelan: dependen de tu situación y del azar.</p>
          </div>
        ) : (
          <div className="stack anim-in">
            <div className="card flat" style={{ borderColor: 'var(--line-2)' }}>
              <div className="tiny dim" style={{ marginBottom: 6 }}>{ev.minigame ? (ev.resolved.option === 0 ? 'Lanzamiento simulado' : 'Lanzamiento jugado') : `Elegiste: ${ev.options[ev.resolved.option].label}`}</div>
              <p style={{ fontSize: '1rem' }}>{ev.resolved.result}</p>
              {ev.resolved.effectsSummary.length > 0 && (
                <div className="effects" style={{ marginTop: 12 }}>
                  {ev.resolved.effectsSummary.map((e) => (
                    <span key={e} className={`chip ${/\+/.test(e) && !/Presión|Fatiga/.test(e) ? 'good' : /−|-\d/.test(e) && !/Presión|Fatiga/.test(e) ? 'bad' : ''}`}>{e}</span>
                  ))}
                </div>
              )}
            </div>
            <button className="btn primary lg" onClick={() => store.act(dismissEvent)} autoFocus>
              Continuar <Icon name="arrow" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
