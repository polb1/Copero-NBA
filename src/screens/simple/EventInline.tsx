import { useEffect } from 'react';
import type { Career } from '../../engine/types';
import { chooseOption, dismissEvent, runUntilDecision } from '../../engine/api';
import { CATEGORY_LABEL } from '../../content/events';
import { store } from '../../store/store';
import { CATEGORY_ICON } from '../../ui/simple';

/** Narrative decision rendered as Copero-style cards inside the career screen. */
export function EventModalInline({ c }: { c: Career }) {
  const ev = c.pendingEvent!;
  // After a decision the season resumes on its own until the next one.
  const next = () => store.actAsync('Simulando…', (x) => { dismissEvent(x); runUntilDecision(x); });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (ev.resolved) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= ev.options.length) store.act((x) => chooseOption(x, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev]);
  const icon = CATEGORY_ICON[ev.category] ?? '🏀';
  return (
    <div className="decision">
      <span className="chip accent" style={{ marginBottom: 6 }}>{icon} {CATEGORY_LABEL[ev.category] ?? ev.category}</span>
      <h2>{ev.title}</h2>
      <p className="small muted" style={{ marginTop: 4 }}>{ev.text}</p>
      {!ev.resolved ? (
        <div className="choices">
          {ev.options.map((o, i) => (
            <button key={i} className="choice" onClick={() => store.act((x) => chooseOption(x, i))}>
              <span className="tiny dim">Opción {i + 1}</span>
              <b className="choice-title">{o.label}</b>
              <span className="choice-body">{o.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="result anim-in">
          <p>{ev.resolved.result}</p>
          {ev.resolved.effectsSummary.length > 0 && (
            <div className="effects" style={{ marginTop: 10 }}>
              {ev.resolved.effectsSummary.map((e) => {
                const neutral = /Presión|Fatiga/.test(e);
                const tone = neutral ? '' : /\+/.test(e) ? 'good' : /−|-\d/.test(e) ? 'bad' : '';
                return <span key={e} className={`chip ${tone}`}>{e}</span>;
              })}
            </div>
          )}
          <button className="btn pill light" style={{ marginTop: 14 }} onClick={next} autoFocus>Continuar</button>
        </div>
      )}
    </div>
  );
}
