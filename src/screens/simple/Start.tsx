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


const pickName = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export function Start() {
  const nav = useNavigate();
  const current = useCareer();
  // Another run starts from the last player's identity: two taps and you are playing again.
  const prev = current ? userOf(current) : null;
  const [mode, setMode] = useState<Mode>(current?.mode === 'full' ? 'full' : 'quick');
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
    // Empty fields get a typical name from the chosen country, so you can start with one tap.
    const surname = last.trim() || pickName(country.last);
    const input: NewCareerInput = {
      first: first.trim() || pickName(country.first),
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
            {playStreak() >= 2 && <p className="tiny streak">🔥 {playStreak()} días seguidos jugando</p>}
            {!current && careerHistory().length === 0 && <p className="tiny dim" style={{ margin: '4px 0 0', maxWidth: 420 }}>Elige país y posición y vive tu carrera desde los 18 años: draft, contratos, anillos y un legado que comparar en cada nueva partida.</p>}
          </div>
          <div className="seg" role="radiogroup" aria-label="Ritmo">
            <button aria-pressed={mode === 'full'} onClick={() => setMode('full')}>Intenso</button>
            <button aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>Normal</button>
          </div>
        </div>
        <div className="simple-cols">
          <section className="simple-col">
            <h3>Identidad</h3>
            <div style={{ display: 'grid', placeItems: 'center' }}><Jersey name={last} number={number} /></div>
            <div className="mini-fields">
              <label className="mini"><span>Nombre</span><input className="input" value={first} maxLength={20} onChange={(e) => setFirst(e.target.value)} placeholder="Opcional" /></label>
              <label className="mini"><span>Apellido</span><input className="input" value={last} maxLength={14} onChange={(e) => setLast(e.target.value)} placeholder="Aleatorio" /></label>
              <label className="mini" style={{ maxWidth: 90 }}><span>Número</span><input className="input" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} /></label>
            </div>
            <div className="mini"><span>Mano hábil</span>
              <div className="toggle2">
                <button aria-pressed={hand === 'L'} onClick={() => setHand('L')}>Izquierda</button>
                <button aria-pressed={hand === 'R'} onClick={() => setHand('R')}>Derecha</button>
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
                  {nat === c.code && <span className="check">✓</span>}
                </button>
              ))}
            </div>
          </section>

          <section className="simple-col">
            <h3>Posición</h3>
            <CourtPicker value={pos} onChange={pickPos} />
            <div className="mini"><span>Estilo</span>
              <div className="chips">
                {archs.map((a) => <button key={a.id} className={`chip ${arch === a.id ? 'accent' : ''}`} aria-pressed={arch === a.id} title={a.desc} onClick={() => setArch(a.id)}>{a.label}</button>)}
              </div>
            </div>
          </section>
        </div>
        <div className="start-challenge">
          <span>🎯 <b>Reto de esta carrera:</b> {challenge.label}</span>
          <button type="button" className="btn sm ghost" onClick={() => setSeed(newSeed())} aria-label="Cambiar reto">🎲 Otro</button>
        </div>
        <div className="simple-foot">
          {current ? <button className="btn pill" onClick={() => nav('/play')}>Volver</button> : <Link to="/careers" className="btn pill">Mis carreras</Link>}
          {replacing && <span className="small dim foot-hint">Empezar de nuevo reemplaza la carrera actual.</span>}
          <button className="btn pill light" disabled={creating} onClick={confirm}>{creating ? 'Creando tu liga…' : replacing ? 'Empezar de nuevo' : last.trim() ? 'Confirmar identidad' : 'Empezar'}</button>
        </div>
      </div>
    </div>
  );
}
