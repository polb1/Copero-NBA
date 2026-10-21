import { useEffect, useRef, useState } from 'react';
import type { Career } from '../../engine/types';
import { canAfford, chooseOption, dismissEvent, playMinigame, selectMinigameTier } from '../../engine/api';
import { cashOf } from '../../engine/mindset';
import { fmtMoney } from '../../engine/contracts';
import { CATEGORY_LABEL } from '../../content/events';
import { store } from '../../store/store';
import { CATEGORY_GLYPH } from '../../ui/simple';
import { Icon } from '../../ui/icons';
import { Minigame } from '../../ui/Minigame';
import { CATEGORY_SCENE, Scene } from '../../ui/Scene';
import { sceneForOption } from '../../ui/life';

const ROLL_MS = 2000;

/**
 * The risky option's roll, made visible: a marker sweeps over the odds bar (green = goes well,
 * red = goes badly), slows down and lands on the side that came out, then the verdict pops.
 * The outcome is already decided by the engine; this only shows it.
 */
function OddsRoll({ odds, lucky, seed }: { odds: number; lucky: boolean; seed: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [done, setDone] = useState(still);
  // Landing spot inside the zone that came out, stable for a given result.
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = (h % 1000) / 1000;
  const land = lucky ? 4 + r * Math.max(1, odds - 8) : odds + 4 + r * Math.max(1, 100 - odds - 8);
  useEffect(() => {
    if (still) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ROLL_MS);
      // Starts on the other side and swings across both zones, each pass shorter, until it settles.
      const from = lucky ? 96 : 4;
      const x = Math.max(1, Math.min(99, land + (from - land) * (1 - t) ** 1.6 * Math.cos(t * Math.PI * 5)));
      if (marker.current) marker.current.style.left = `${x}%`;
      if (t < 1) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [land, lucky, still]);
  return (
    <div className={`roll ${done ? (lucky ? 'won' : 'lost') : 'rolling'}`} role="status" aria-live="polite">
      <div className="roll-bar">
        <span className="roll-good" style={{ width: `${odds}%` }}>{odds} %</span>
        <span className="roll-bad">{100 - odds} %</span>
        <span ref={marker} className="roll-marker" style={{ left: `${done ? land : lucky ? 96 : 4}%` }} />
      </div>
      <div className="roll-verdict">{done ? (lucky ? <><Icon name="check" size={13} /> ¡Sale bien!</> : <><Icon name="flame" size={13} /> Sale mal</>) : <><Icon name="dice" size={13} /> Tirando…</>}</div>
    </div>
  );
}

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
  const icon = <Icon name={CATEGORY_GLYPH[ev.category] ?? 'ball'} size={13} />;
  const afford = (i: number) => canAfford(c, i);
  const mg = ev.minigame;
  const tiers = ev.minigameTiers;
  const tierKey = ev.defId + ev.title + (ev.minigameTier ?? '');
  return (
    <div className="decision">
      <Scene kind={CATEGORY_SCENE[ev.category] ?? 'arena'} variant={ev.defId} height={120}>
        <span className="chip accent">{icon} {CATEGORY_LABEL[ev.category] ?? ev.category}</span>
        <h2>{ev.title}</h2>
      </Scene>
      <p className="small muted desc">{ev.text}</p>
      {!ev.resolved && mg ? (
        <>
          {tiers && tiers.length > 1 && (
            <div className="tiers" role="group" aria-label="Dificultad">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tier ${ev.minigameTier === t.id ? 'on' : ''}`}
                  onClick={() => store.act((x) => selectMinigameTier(x, t.id))}
                >
                  <b>{t.label}</b>
                  <span className="tiny dim">{t.desc}</span>
                </button>
              ))}
            </div>
          )}
          {(mg.reward || mg.risk) && (
            <div className="risk-row">
              {mg.reward && <span className="chip good">Recompensa ×{mg.reward.mul}</span>}
              {mg.risk && <span className="chip bad">Riesgo de lesión {Math.round(mg.risk.injury * 100)}%</span>}
            </div>
          )}
          <Minigame key={tierKey} spec={mg} onDone={(made) => store.act((x) => playMinigame(x, made))} onSimulate={() => store.act((x) => chooseOption(x, 0))} />
        </>
      ) : !ev.resolved ? (
        <div className="choices">
          {ev.options.map((o, i) => {
            const kind = sceneForOption(o.label + ' ' + o.desc, CATEGORY_SCENE[ev.category] ?? 'arena');
            return (
            <button key={i} className={`choice with-img ${afford(i) ? '' : 'locked'}`} disabled={!afford(i)} onClick={() => store.act((x) => chooseOption(x, i))}>
              <Scene kind={kind} variant={`${ev.defId}-${i}`} height={64} still className="choice-img" />
              <b className="choice-title">{o.label}</b>
              <span className="choice-body">{o.desc}</span>
              {o.odds !== undefined && <span className="odds" title="Probabilidad según tu estado actual"><span className="odds-bar"><span style={{ width: `${o.odds}%` }} /></span><span><b className="good">{o.odds} %</b> sale bien · <b className="bad">{100 - o.odds} %</b> sale mal</span></span>}
              {o.cost ? <span className={`cost ${afford(i) ? '' : 'short'}`}>{afford(i) ? `Cuesta ${fmtMoney(o.cost)}` : `Te faltan ${fmtMoney(o.cost - cashOf(c))}`}</span> : null}
            </button>
            );
          })}
        </div>
      ) : (
        <div className={`result anim-in ${ev.resolved.odds !== undefined ? 'has-roll' : ''}`}>
          {ev.resolved.odds !== undefined && <OddsRoll key={ev.defId + ev.title} odds={ev.resolved.odds} lucky={!!ev.resolved.lucky} seed={ev.resolved.result} />}
          <p className="result-text">{ev.resolved.result}</p>
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
