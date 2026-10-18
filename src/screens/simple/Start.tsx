import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Archetype, Hand, Mode, Pos } from '../../engine/types';
import { ARCHETYPES, TRAINING_AREAS } from '../../engine/attributes';
import { HEIGHT_RANGE } from '../../engine/players';
import { COUNTRIES, HIGH_SCHOOLS } from '../../content/names';
import { EURO_CLUBS, NCAA_PROGRAMS, type Club } from '../../data/clubs';
import type { NewCareerInput, Route } from '../../engine/career';
import { newCareer } from '../../engine/api';
import { newSeed } from '../../engine/rng';
import { store } from '../../store/store';
import { CourtPicker, Jersey } from '../../ui/simple';
import { Flag } from '../../ui/Flag';

const ROUTES: { id: Route; label: string; hint: string }[] = [
  { id: 'college', label: 'Universidad', hint: 'Temporada NCAA y draft' },
  { id: 'international', label: 'Europa', hint: 'Liga europea y draft' },
  { id: 'alternative', label: 'Sin draft', hint: 'Two-way, G League o Europa' },
  { id: 'drafted', label: 'Ya drafteado', hint: 'Empiezas en la NBA' },
];

export function Start() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('quick');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [number, setNumber] = useState(23);
  const [hand, setHand] = useState<Hand>('R');
  const [nat, setNat] = useState('ESP');
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<Pos>('SF');
  const [arch, setArch] = useState<Archetype>('twoWay');
  const [route, setRoute] = useState<Route>('college');
  const [college, setCollege] = useState('Baylor');
  const [euroClub, setEuroClub] = useState('Joventut Badalona');
  const clubList: Club[] = route === 'international' ? EURO_CLUBS : NCAA_PROGRAMS;
  const clubName = route === 'international' ? euroClub : college;
  const setClub = route === 'international' ? setEuroClub : setCollege;
  const club = clubList.find((c) => c.name === clubName);
  const leagues = [...new Set(clubList.map((c) => c.league))];

  const archs = ARCHETYPES.filter((a) => a.positions.includes(pos));
  const pickPos = (p: Pos) => {
    setPos(p);
    if (!ARCHETYPES.find((a) => a.id === arch)!.positions.includes(p)) setArch(ARCHETYPES.find((a) => a.positions.includes(p))!.id);
  };
  const countries = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const ready = last.trim().length > 0;

  const confirm = () => {
    const [lo, hi] = HEIGHT_RANGE[pos];
    const height = Math.round((lo + hi) / 2);
    const growth = ARCHETYPES.find((a) => a.id === arch)!.growth.filter((g) => g !== 'balanced') as (keyof typeof TRAINING_AREAS)[];
    const focus: NewCareerInput['focus'] = growth.length ? Object.fromEntries(growth.map((g) => [g, Math.floor(10 / growth.length)])) : { shooting: 2, defense: 2, playmaking: 2, athleticism: 2, rebounding: 2 };
    const country = COUNTRIES.find((c) => c.code === nat)!;
    const input: NewCareerInput = {
      first: first.trim() || country.first[0],
      last: last.trim(),
      jersey: last.trim().toUpperCase(),
      number,
      nat,
      birthplace: country.name,
      age: route === 'alternative' ? 21 : route === 'international' ? 18 : 19,
      height,
      weight: Math.round(height * 0.52 - 6),
      hand,
      pos,
      arch,
      origin: route === 'international' ? euroClub : route === 'alternative' ? HIGH_SCHOOLS[0] : college,
      bio: '',
      route,
      draftedTier: 'first',
      mode,
      talent: 'balanced',
      focus,
      look: { skin: 2, hair: 1, accent: '#c2410c' },
    };
    store.setCareer(newCareer(input, newSeed()));
    nav('/play');
  };

  return (
    <div className="simple-wrap">
      <div className="simple-panel anim-in">
        <div className="simple-head">
          <h2>Definí tu identidad</h2>
          <div className="seg" role="radiogroup" aria-label="Ritmo">
            <button aria-pressed={mode === 'full'} onClick={() => setMode('full')}>Intenso</button>
            <button aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>Normal</button>
            <Link to="/daily" className="seg-link">Diario</Link>
          </div>
        </div>
        <div className="simple-cols">
          <section className="simple-col">
            <h3>Identidad</h3>
            <div style={{ display: 'grid', placeItems: 'center' }}><Jersey name={last} number={number} /></div>
            <div className="mini-fields">
              <label className="mini"><span>Nombre</span><input className="input" value={first} maxLength={20} onChange={(e) => setFirst(e.target.value)} placeholder="Opcional" /></label>
              <label className="mini"><span>Apellido</span><input className="input" value={last} maxLength={14} onChange={(e) => setLast(e.target.value)} placeholder="APELLIDO" autoFocus /></label>
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
            <div className="mini"><span>Inicio</span>
              <div className="chips">
                {ROUTES.map((r) => <button key={r.id} className={`chip ${route === r.id ? 'accent' : ''}`} aria-pressed={route === r.id} title={r.hint} onClick={() => setRoute(r.id)}>{r.label}</button>)}
              </div>
            </div>
            {(route === 'college' || route === 'international') && (
              <div className="mini">
                <span>{route === 'college' ? 'Universidad' : 'Club'}</span>
                <div className="row" style={{ gap: 6 }}>
                  <select className="input" value={clubName} onChange={(e) => setClub(e.target.value)} aria-label={route === 'college' ? 'Universidad' : 'Club'}>
                    {leagues.map((lg) => (
                      <optgroup key={lg} label={lg}>
                        {clubList.filter((c) => c.league === lg).map((c) => <option key={c.name} value={c.name}>{'★'.repeat(4 - c.tier)} {c.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" className="btn sm" title="Elegir al azar" aria-label="Club al azar" onClick={() => setClub(clubList[Math.floor(Math.random() * clubList.length)].name)}>🎲</button>
                </div>
                <span className="club-hint">{club ? (club.tier === 1 ? 'Gigante: más victorias y escaparate, pero menos minutos para ti.' : club.tier === 2 ? 'Equilibrado: buen nivel y minutos razonables.' : 'Modesto: tendrás el balón y muchos minutos, con menos victorias.') : ''}</span>
              </div>
            )}
          </section>
        </div>
        <div className="simple-foot">
          <button className="btn pill" onClick={() => nav('/')}>Volver</button>
          <Link to="/new" className="small dim">Personalización avanzada</Link>
          <button className="btn pill light" disabled={!ready} onClick={confirm}>Confirmar identidad</button>
        </div>
      </div>
    </div>
  );
}
