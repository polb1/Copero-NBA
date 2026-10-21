import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Archetype, Hand, Mode, Pos } from '../../engine/types';
import { ARCHETYPES, TRAINING_AREAS } from '../../engine/attributes';
import { HEIGHT_RANGE } from '../../engine/players';
import { COUNTRIES } from '../../content/names';
import type { NewCareerInput } from '../../engine/career';
import { newCareer } from '../../engine/api';
import { newSeed } from '../../engine/rng';
import { CHALLENGES, rollChallenge } from '../../engine/challenges';
import { careerHistory, playStreak, store, useCareer } from '../../store/store';
import { userOf } from '../../engine/career';
import { CourtPicker, Jersey } from '../../ui/simple';
import { Flag } from '../../ui/Flag';
import { LangSwitch } from '../../ui/LangSwitch';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { useKitColors } from '../../ui/flagColors';
import { Icon, type IconName } from '../../ui/icons';


/** What each position does on court, in plain words for people new to basketball. */
const POS_INFO: Record<Pos, { name: string; icon: IconName; role: string }> = {
  PG: { name: 'Base', icon: 'brain', role: 'Sube el balón y organiza el ataque. Reparte asistencias. Suele ser el más bajo y rápido.' },
  SG: { name: 'Escolta', icon: 'target', role: 'El tirador del equipo: anota desde lejos y también ataca el aro.' },
  SF: { name: 'Alero', icon: 'bolt', role: 'El más versátil: anota, defiende y juega tanto dentro como fuera.' },
  PF: { name: 'Ala-pívot', icon: 'dumbbell', role: 'Juega cerca del aro: rebotes, bloqueos y defensa interior.' },
  C: { name: 'Pívot', icon: 'brick', role: 'El más alto: protege el aro, coge rebotes y anota bajo la canasta.' },
};
const POS_ORDER: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export function Start() {
  const nav = useNavigate();
  const current = useCareer();
  // Another run starts from the last player's identity: two taps and you are playing again.
  const prev = current ? userOf(current) : null;
  const [mode, setMode] = useState<Mode>(current?.mode === 'full' || current?.mode === 'express' ? current.mode : 'quick');
  const [first, setFirst] = useState(prev?.first ?? '');
  const [last, setLast] = useState(prev?.last ?? '');
  const [number, setNumber] = useState(current?.profile.number ?? 23);
  const [hand, setHand] = useState<Hand>(prev?.hand ?? 'R');
  const [nat, setNat] = useState(prev?.nat ?? 'ESP');
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<Pos>(prev?.pos ?? 'SF');
  const [arch, setArch] = useState<Archetype>(prev?.arch ?? 'twoWay');
  // The seed decides the career's challenge, so it is shown (and can be re-rolled) before starting.
  const [seed, setSeed] = useState(newSeed);
  const [creating, setCreating] = useState(false);
  const [posHelp, setPosHelp] = useState(false);
  const [askReplace, setAskReplace] = useState(false);
  const kit = useKitColors(nat);
  const named = !!(first.trim() || last.trim());
  const replacing = !!current && current.phase !== 'retired';
  const challenge = CHALLENGES[rollChallenge(seed)];

  const archs = ARCHETYPES.filter((a) => a.positions.includes(pos));
  const pickPos = (p: Pos) => {
    setPos(p);
    if (!ARCHETYPES.find((a) => a.id === arch)!.positions.includes(p)) setArch(ARCHETYPES.find((a) => a.positions.includes(p))!.id);
  };
  // The chosen country stays on top so it is visible without scrolling the list.
  const countries = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => Number(b.code === nat) - Number(a.code === nat) || a.name.localeCompare(b.name, 'es'));

  const confirm = () => {
    const [lo, hi] = HEIGHT_RANGE[pos];
    const height = Math.round((lo + hi) / 2);
    const growth = ARCHETYPES.find((a) => a.id === arch)!.growth.filter((g) => g !== 'balanced') as (keyof typeof TRAINING_AREAS)[];
    const focus: NewCareerInput['focus'] = growth.length ? Object.fromEntries(growth.map((g) => [g, Math.floor(10 / growth.length)])) : { shooting: 2, defense: 2, playmaking: 2, athleticism: 2, rebounding: 2 };
    const country = COUNTRIES.find((c) => c.code === nat)!;
    if (!named) return;
    // One name is enough: on its own it becomes the surname shown on the jersey.
    const surname = last.trim() || first.trim();
    const input: NewCareerInput = {
      first: last.trim() ? first.trim() : '',
      last: surname,
      jersey: surname.toUpperCase(),
      number,
      nat,
      birthplace: country.name,
      age: 18,
      height,
      weight: Math.round(height * 0.52 - 6),
      hand,
      pos,
      arch,
      // Empty origin: after the agency decision the game offers three clubs from the player's country.
      origin: '',
      bio: '',
      route: 'international',
      draftedTier: 'first',
      mode,
      talent: 'balanced',
      focus,
      look: { skin: 2, hair: 1, accent: '#c2410c' },
    };
    // Generating the league takes a moment on phones: show it on the button first, then build.
    setCreating(true);
    setTimeout(() => {
      store.setCareer(newCareer(input, seed));
      nav('/play');
    }, 30);
  };

  return (
    <div className="simple-wrap">
      <div className="simple-panel start-panel anim-in">
        <div className="simple-head">
          <div>
            <h2>Crea tu jugador</h2>
            {playStreak() >= 2 && <p className="tiny streak"><Icon name="flame" size={13} /> {playStreak()} días seguidos jugando</p>}
            {!current && careerHistory().length === 0 && <p className="tiny dim" style={{ margin: '4px 0 0', maxWidth: 420 }}>Elige país y posición y vive tu carrera desde los 18 años: draft, contratos, anillos y un legado que comparar en cada nueva partida.</p>}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <LangSwitch />
          <div className="seg" role="radiogroup" aria-label="Ritmo">
            <button aria-pressed={mode === 'express'} title="1 decisión por temporada" onClick={() => setMode('express')}>Exprés</button>
            <button aria-pressed={mode === 'quick'} title="2-3 decisiones por temporada" onClick={() => setMode('quick')}>Normal</button>
            <button aria-pressed={mode === 'full'} title="4-5 decisiones por temporada" onClick={() => setMode('full')}>Larga</button>
          </div>
          <p className="mode-hint">{mode === 'express' ? '1 decisión por temporada' : mode === 'full' ? '4-5 decisiones por temporada' : '2-3 decisiones por temporada'}</p>
          </div>
        </div>
        <div className="simple-cols">
          <section className="simple-col">
            <h3>Identidad</h3>
            <div style={{ display: 'grid', placeItems: 'center' }}><Jersey name={last.trim() || first.trim()} number={number} color={kit.color} trim={kit.trim} text={kit.text} /></div>
            <div className="name-fields">
              <label className="name-field"><span>Nombre</span><input className="input" value={first} maxLength={20} onChange={(e) => setFirst(e.target.value)} placeholder="Ej.: Marc" autoComplete="off" /></label>
              <label className="name-field"><span>Apellido</span><input className="input" value={last} maxLength={14} onChange={(e) => setLast(e.target.value)} placeholder="Ej.: Gasol" autoComplete="off" /></label>
              {!named && <p className="name-hint">Escribe al menos un nombre o un apellido.</p>}
            </div>
            <div className="mini-fields">
              <label className="mini" style={{ maxWidth: 90 }}><span>Número</span><input className="input" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} /></label>
              <div className="mini"><span>Mano hábil</span>
                <div className="toggle2">
                  <button aria-pressed={hand === 'L'} onClick={() => setHand('L')}>Izquierda</button>
                  <button aria-pressed={hand === 'R'} onClick={() => setHand('R')}>Derecha</button>
                </div>
              </div>
            </div>
          </section>

          <section className="simple-col">
            <h3>Nacionalidad</h3>
            <input className="input" placeholder="Buscar país" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar país" />
            <div className="country-grid">
              {countries.map((c) => (
                <button key={c.code} className={`country ${nat === c.code ? 'on' : ''}`} aria-pressed={nat === c.code} onClick={() => setNat(c.code)}>
                  <Flag code={c.code} size={28} />
                  <span>{c.name}</span>
                  {nat === c.code && <span className="check"><Icon name="check" size={13} /></span>}
                </button>
              ))}
            </div>
          </section>

          <section className="simple-col">
            <h3>Posición</h3>
            <CourtPicker value={pos} onChange={pickPos} />
            <div className="pos-info">
              <b><Icon name={POS_INFO[pos].icon} size={16} /> {POS_INFO[pos].name} <span className="dim">({pos})</span></b>
              <p>{POS_INFO[pos].role}</p>
              <button type="button" className="pos-help-btn" aria-expanded={posHelp} onClick={() => setPosHelp((v) => !v)}>{posHelp ? 'Ocultar' : '¿Qué hace cada posición?'}</button>
              {posHelp && (
                <ul className="pos-help">
                  {POS_ORDER.map((p) => (
                    <li key={p} className={p === pos ? 'on' : ''} onClick={() => pickPos(p)}>
                      <span className="pos-tag">{p}</span>
                      <span><b>{POS_INFO[p].name}</b> {POS_INFO[p].role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mini"><span>Estilo de juego</span>
              <div className="chips">
                {archs.map((a) => <button key={a.id} className={`chip ${arch === a.id ? 'accent' : ''}`} aria-pressed={arch === a.id} onClick={() => setArch(a.id)}>{a.label}</button>)}
              </div>
              <p className="style-desc">{ARCHETYPES.find((a) => a.id === arch)!.desc}</p>
            </div>
          </section>
        </div>
        <div className="start-challenge">
          <span><Icon name="target" size={13} /> <b>Reto de esta carrera:</b> {challenge.label}</span>
          <button type="button" className="btn sm ghost" onClick={() => setSeed(newSeed())} aria-label="Cambiar reto"><Icon name="dice" size={13} /> Otro</button>
        </div>
        <div className="simple-foot">
          {current ? <button className="btn pill" onClick={() => nav('/play')}>Volver</button> : <Link to="/careers" className="btn pill">Mis carreras</Link>}
          {replacing && <span className="small dim foot-hint">Empezar de nuevo reemplaza la carrera actual.</span>}
          <button className="btn pill light" disabled={creating || !named} title={named ? undefined : 'Escribe al menos un nombre o un apellido.'} onClick={() => (replacing ? setAskReplace(true) : confirm())}>{creating ? 'Creando tu liga…' : replacing ? 'Empezar de nuevo' : 'Empezar carrera'}</button>
        </div>
      </div>
      {askReplace && prev && current && (
        <ConfirmModal icon={<Icon name="refresh" size={44} />} kicker="Nueva carrera" title="¿Empezar de nuevo?" confirmLabel="Sí, empezar" cancelLabel="Volver" danger
          onCancel={() => setAskReplace(false)} onConfirm={() => { setAskReplace(false); confirm(); }}>
          <p>{`Tu carrera actual con ${[prev.first, prev.last].filter(Boolean).join(' ')} (${prev.age} años) se perderá.`}</p>
          <p>Solo las carreras terminadas se guardan en Mis carreras.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
