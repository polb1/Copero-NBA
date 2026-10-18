// Small pieces that give the simple screen movement and feedback.
import { useEffect, useRef, useState } from 'react';
import type { Career } from '../engine/types';
import { fmtDate, seasonLabel } from '../engine/schedule';
import { teamOf, userOf } from '../engine/career';
import { Scene, type SceneKind } from './Scene';
import { GOLD_OVR, ovrTone } from './simple';
import { store, useStore } from '../store/store';

/** Animates a number towards its new value and reports the last change. */
export function useCountUp(value: number, ms = 900) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState<{ v: number; key: number } | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    setDelta({ v: value - from, key: Date.now() });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const hide = setTimeout(() => setDelta(null), 2600);
    return () => { cancelAnimationFrame(raf); clearTimeout(hide); };
  }, [value, ms]);
  return { shown, delta };
}

export function OvrTile({ ovr }: { ovr: number }) {
  const { shown, delta } = useCountUp(ovr);
  const gold = shown >= GOLD_OVR;
  const wentGold = !!delta && ovr >= GOLD_OVR && ovr - delta.v < GOLD_OVR;
  return (
    <div className={`ovr-tile ${gold ? 'gold' : ''} ${delta ? 'bump' : ''} ${wentGold ? 'went-gold' : ''}`} style={{ background: ovrTone(shown) }} key={delta?.key ?? 'ovr'} title={gold ? 'Nivel oro (80+)' : undefined}>
      <small>OVR</small>
      <b>{shown}</b>
      {wentGold ? <span className="ovr-delta gold-up">¡ORO!</span> : delta && <span className={`ovr-delta ${delta.v > 0 ? 'up' : 'down'}`}>{delta.v > 0 ? `+${delta.v}` : delta.v}</span>}
    </div>
  );
}

/** Skips the animation up to the next decision (the simulation itself is the same). */
function SkipButton() {
  const fast = useStore((s) => s.simFast);
  return <button type="button" className="btn sm ghost skip-btn" disabled={fast} onClick={() => store.fastForward()}>{fast ? '⏩…' : 'Saltar ⏩'}</button>;
}

/** What the screen shows while the season is being simulated: date and progress, never results. */
export function SimProgress({ c, label }: { c: Career; label: string }) {
  const L = c.league;
  const t = teamOf(c);
  const u = userOf(c);
  let pct = 0.03;
  let phase = label;
  if (c.phase === 'regular' || (c.phase === 'predraft' && c.predraft?.step === 'season')) {
    pct = Math.min(0.86, (L.day / Math.max(1, L.lastDay)) * 0.86);
    phase = L.day >= L.allStarDay && L.day <= L.allStarDay + 4 ? 'Fin de semana del All-Star' : L.day > 0 ? 'Temporada regular' : 'Pretemporada';
  } else if (c.phase === 'postseason') {
    const round = Math.max(0, ...(L.postseason?.series.map((s) => s.round) ?? [0]));
    pct = 0.86 + round * 0.035;
    phase = round === 0 ? 'Play-In' : round === 4 ? 'Finales NBA' : `Playoffs · ronda ${round}`;
  } else if (c.phase === 'season-end') {
    pct = 1;
    phase = 'Temporada terminada';
  }
  const scenes: SceneKind[] = ['arena', 'training', 'arena', 'clutch', 'arena'];
  const scene = c.phase === 'postseason' ? 'clutch' : scenes[Math.floor(L.day / 30) % scenes.length];
  return (
    <div className="decision sim-live" aria-live="polite">
      <Scene kind={scene} variant={`${L.season}-${Math.floor(L.day / 30)}`} height={170}>
        <span className="chip accent">{seasonLabel(L.season)}</span>
        <h2>{phase}</h2>
      </Scene>
      <div className="sim-row">
        <div className="dribble" aria-hidden="true">🏀</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row between small"><span className="muted">{L.day > 0 ? fmtDate(L.season, L.day) : 'Training camp'}</span><span className="dim">{t ? t.city : u.teamId ?? c.satellite?.teamName ?? ''}</span></div>
          <div className="sim-bar"><span style={{ width: `${Math.round(pct * 100)}%` }} /></div>
          <div className="tiny dim" style={{ marginTop: 6 }}>Los resultados se revelan al final de la temporada.</div>
        </div>
        <SkipButton />
      </div>
    </div>
  );
}

const OPTION_SCENES: [RegExp, SceneKind][] = [
  [/zapatill|marca deportiva/, 'sneakers'],
  [/m[eé]dic|rehabil|especialista|fisio|molestia|lesi|recupera/, 'medical'],
  [/descans|dormir|hotel|piernas|horas/, 'rest'],
  [/agente|agencia|contrato|firm|extens|cl[aá]usula/, 'contract'],
  [/traspaso|salir|destino|mercado|irse|llamadas/, 'travel'],
  [/prensa|entrevista|podcast|declar|p[uú]blic|rueda|titulares|medios|disculp/, 'press'],
  [/redes|tuit|viral|v[ií]deo|anuncio|serie|c[aá]maras/, 'phone'],
  [/dinero|invert|\$|patrocin|lujo|cobr|negocio|fondo|bonus|millones/, 'money'],
  [/familia|casa|amigo|hogar/, 'family'],
  [/selecci[oó]n|pa[ií]s|torneo|medalla/, 'national'],
  [/retir|legado|despedida|[uú]ltimo a[nñ]o|capit/, 'trophy'],
  [/compa[nñ]er|grupo|vestuario|cena|mentor|veterano|novato/, 'locker'],
  [/entren[ao]dor|reuni[oó]n|rol|minutos|banquillo|titular|sistema/, 'coach'],
  [/entren|trabaj|gimnas|fuerza|ejerc|reto|tiro|campus|mec[aá]nica|v[ií]deo/, 'training'],
  [/rival|duelo|pista|partido|jugar|canastas|equipo|estren|sin miedo|atr[eé]v/, 'arena'],
];

/** Small icon per scene, shown on phones where the option photos are hidden. */
export const SCENE_EMOJI: Record<SceneKind, string> = {
  arena: '🏀', training: '💪', locker: '🤝', coach: '📋', press: '🎤', medical: '🩺', contract: '✍️', money: '💰', sneakers: '👟',
  phone: '📱', trophy: '🏆', draft: '🎓', travel: '✈️', national: '🏅', summer: '☀️', family: '🏠', clutch: '⏱️', contest: '🎯',
  college: '📚', europe: '🌍', rest: '😴', rivalry: '⚔️',
};

/** Picks an image for an option card from its wording, like Copero's illustrated choices. */
export function sceneForOption(text: string, fallback: SceneKind): SceneKind {
  const t = text.toLowerCase();
  for (const [re, kind] of OPTION_SCENES) if (re.test(t)) return kind;
  return fallback;
}
