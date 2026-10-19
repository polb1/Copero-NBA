import { useEffect } from 'react';
import type { Career } from '../../engine/types';
import { canAfford, chooseOption, dismissEvent, playMinigame } from '../../engine/api';
import { cashOf } from '../../engine/mindset';
import { fmtMoney } from '../../engine/contracts';
import { CATEGORY_LABEL } from '../../content/events';
import { store } from '../../store/store';
import { CATEGORY_ICON } from '../../ui/simple';
import { ShotMeter } from '../../ui/ShotMeter';
import { CATEGORY_SCENE, Scene } from '../../ui/Scene';
import { SCENE_EMOJI, sceneForOption } from '../../ui/life';

/** Narrative decision rendered as Copero-style cards inside the career screen. */
export function EventModalInline({ c }: { c: Career }) {
  const ev = c.pendingEvent!;
  // After a decision the season resumes on its own until the next one.
  const weeks = window.matchMedia('(max-width: 760px)').matches ? 1 : 2;
  const next = () => store.actLive('Simulando…', weeks, dismissEvent);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (ev.resolved) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
        return;
      }
      if (ev.minigame) return; // the shot meter handles its own keys
      const n = Number(e.key);
      if (n >= 1 && n <= ev.options.length) store.act((x) => chooseOption(x, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ev]);
  const icon = CATEGORY_ICON[ev.category] ?? '🏀';
  const afford = (i: number) => canAfford(c, i);
  return (
    <div className="decision">
      <Scene kind={CATEGORY_SCENE[ev.category] ?? 'arena'} variant={ev.defId} height={170}>
        <span className="chip accent">{icon} {CATEGORY_LABEL[ev.category] ?? ev.category}</span>
        <h2>{ev.title}</h2>
      </Scene>
      <p className="small muted desc">{ev.text}</p>
      {!ev.resolved && ev.minigame ? (
        <ShotMeter key={ev.defId + ev.title} spec={ev.minigame} onDone={(made) => store.act((x) => playMinigame(x, made))} onSimulate={() => store.act((x) => chooseOption(x, 0))} />
      ) : !ev.resolved ? (
        <div className="choices">
          {ev.options.map((o, i) => {
            const kind = sceneForOption(o.label + ' ' + o.desc, CATEGORY_SCENE[ev.category] ?? 'arena');
            return (
            <button key={i} className={`choice with-img ${afford(i) ? '' : 'locked'}`} disabled={!afford(i)} onClick={() => store.act((x) => chooseOption(x, i))}>
              <Scene kind={kind} variant={`${ev.defId}-${i}`} height={96} still className="choice-img" />
              <span className="choice-emoji" aria-hidden="true">{SCENE_EMOJI[kind]}</span>
              <span className="tiny dim">Opción {i + 1}</span>
              <b className="choice-title">{o.label}</b>
              <span className="choice-body">{o.desc}</span>
              {o.cost ? <span className={`cost ${afford(i) ? '' : 'short'}`}>{afford(i) ? `Cuesta ${fmtMoney(o.cost)}` : `Te faltan ${fmtMoney(o.cost - cashOf(c))}`}</span> : null}
            </button>
            );
          })}
        </div>
      ) : (
        <div className="result anim-in">
          <p>{ev.resolved.result}</p>
          {ev.resolved.effectsSummary.length > 0 && (
            <div className="effects" style={{ marginTop: 10 }}>
              {ev.resolved.effectsSummary.map((e) => {
                const neutral = /Presión|Fatiga/.test(e);
                const tone = neutral ? '' : /\+|Trofeo/.test(e) ? 'good' : /−|-\d/.test(e) ? 'bad' : '';
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
