import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Archetype, Hand, Pos } from '../engine/types';
import { buildUserPlayer, FOCUS_POINTS, type NewCareerInput, type TalentProfile, type Route } from '../engine/career';
import { newCareer } from '../engine/api';
import { ARCHETYPES, POS_LABEL, TRAINING_AREAS, composites, specialization } from '../engine/attributes';
import { HEIGHT_RANGE } from '../engine/players';
import { COUNTRIES, UNIVERSITY_SUGGESTIONS, EURO_CLUBS, HIGH_SCHOOLS } from '../content/names';
import { newSeed } from '../engine/rng';
import { store } from '../store/store';
import { Icon } from '../ui/icons';
import { Avatar, OvrRing, SKINS, HAIRS } from '../ui/PlayerCard';
import { Radar } from '../ui/charts';
import { cm, ftIn } from '../ui/common';

const STEPS = ['Ritmo', 'Vía de entrada', 'Identidad', 'Físico y aspecto', 'Posición y estilo', 'Talento', 'Confirmar'];
const ACCENTS = ['#ff6b1a', '#3b82f6', '#22c55e', '#e11d48', '#a855f7', '#eab308', '#14b8a6', '#f4f4f5'];
const FOCUS_AREAS = ['shooting', 'finishing', 'playmaking', 'defense', 'athleticism', 'rebounding'] as const;

const ROUTES: { id: Route; icon: string; title: string; desc: string }[] = [
  { id: 'college', icon: '🎓', title: 'Prospecto universitario', desc: 'Una temporada NCAA, combine, entrevistas y draft. La vía clásica.' },
  { id: 'international', icon: '🌍', title: 'Jugador internacional', desc: 'Compites contra adultos en una liga europea antes de dar el salto.' },
  { id: 'alternative', icon: '🧗', title: 'Vía alternativa', desc: 'Sin draft. Two-way, G League, Exhibit 10 o Europa: gánate tu sitio.' },
  { id: 'drafted', icon: '⚡', title: 'Novato ya elegido', desc: 'Empieza directamente en la NBA. Ideal para partidas rápidas.' },
];

export function NewCareer() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [seed] = useState(newSeed);
  const [natQuery, setNatQuery] = useState('');
  const [f, setF] = useState<NewCareerInput>({
    first: '', last: '', jersey: '', number: 23, nat: 'ESP', birthplace: '', age: 19, height: 201, weight: 98, hand: 'R',
    pos: 'SF', arch: 'twoWay', origin: 'Duke', bio: '', route: 'college', draftedTier: 'first', mode: 'full', talent: 'balanced',
    focus: { shooting: 2, defense: 2, athleticism: 2 }, look: { skin: 2, hair: 1, accent: '#ff6b1a' },
  });
  const up = (patch: Partial<NewCareerInput>) => setF((x) => ({ ...x, ...patch }));
  const used = Object.values(f.focus).reduce((s, v) => s + (v ?? 0), 0);
  const preview = useMemo(() => buildUserPlayer(f, seed, 2026), [f, seed]);
  const comp = composites(preview.attrs);
  const archs = ARCHETYPES.filter((a) => a.positions.includes(f.pos));

  const setPos = (pos: Pos) => {
    const [lo, hi] = HEIGHT_RANGE[pos];
    const height = Math.min(hi, Math.max(lo, f.height));
    const arch = ARCHETYPES.find((a) => a.id === f.arch)?.positions.includes(pos) ? f.arch : ARCHETYPES.find((a) => a.positions.includes(pos))!.id;
    up({ pos, height, weight: Math.round(height * 0.52 - 6), arch });
  };
  const setRoute = (route: Route) => {
    const origin = route === 'college' ? 'Duke' : route === 'international' ? EURO_CLUBS[0] : route === 'alternative' ? HIGH_SCHOOLS[0] : 'Duke';
    up({ route, origin, age: route === 'alternative' ? 21 : route === 'international' ? 18 : 19 });
  };
  const canNext = step !== 2 || (f.first.trim().length > 0 && f.last.trim().length > 0 && f.number >= 0 && f.number <= 99);
  const start = () => {
    const input: NewCareerInput = { ...f, jersey: f.jersey.trim() || f.last.trim().toUpperCase(), birthplace: f.birthplace || COUNTRIES.find((c) => c.code === f.nat)!.name };
    const c = newCareer(input, seed);
    store.setCareer(c);
    nav('/play');
  };
  const countries = COUNTRIES.filter((c) => c.name.toLowerCase().includes(natQuery.toLowerCase()));

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      <div className="row between" style={{ marginBottom: 18 }}>
        <Link to="/" className="btn ghost sm"><Icon name="back" /> Inicio</Link>
        <span className="small dim">Paso {step + 1} de {STEPS.length}</span>
      </div>
      <div className="steps" style={{ marginBottom: 22 }} aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}</div>
      <div className="grid two-col">
        <div className="stack anim-in" key={step} style={{ gap: 18 }}>
          <div>
            <div className="eyebrow">Nueva carrera</div>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{STEPS[step]}</h1>
          </div>

          {step === 0 && (
            <div className="tiles" role="radiogroup" aria-label="Ritmo de carrera">
              {[
                { id: 'full' as const, icon: '📖', t: 'Carrera completa', d: 'Avanza partido a partido o por semanas. Decisiones frecuentes y control total.' },
                { id: 'quick' as const, icon: '⏩', t: 'Carrera rápida', d: 'Menos acontecimientos y simulación hasta el siguiente momento importante.' },
              ].map((m) => (
                <button key={m.id} className="tile" aria-pressed={f.mode === m.id} onClick={() => up({ mode: m.id })}>
                  <span className="icon">{m.icon}</span><span className="t">{m.t}</span><span className="d">{m.d}</span>
                </button>
              ))}
              <Link to="/daily" className="tile">
                <span className="icon">☀️</span><span className="t">Desafío diario</span><span className="d">Mismo jugador y misma semilla para todos hoy. Puntuación comparable.</span>
              </Link>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="tiles">
                {ROUTES.map((r) => (
                  <button key={r.id} className="tile" aria-pressed={f.route === r.id} onClick={() => setRoute(r.id)}>
                    <span className="icon">{r.icon}</span><span className="t">{r.title}</span><span className="d">{r.desc}</span>
                  </button>
                ))}
              </div>
              {f.route === 'drafted' && (
                <div className="field">
                  <label>Posición en el draft</label>
                  <div className="seg">
                    {(['lottery', 'first', 'second'] as const).map((t) => (
                      <button key={t} aria-pressed={f.draftedTier === t} onClick={() => up({ draftedTier: t })}>{t === 'lottery' ? 'Lotería (1-14)' : t === 'first' ? 'Primera ronda (15-30)' : 'Segunda ronda'}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className="grid g2">
              <div className="field"><label htmlFor="fn">Nombre</label><input id="fn" className="input" value={f.first} maxLength={20} onChange={(e) => up({ first: e.target.value })} placeholder="Ej.: Marc" autoFocus /></div>
              <div className="field"><label htmlFor="ln">Apellido</label><input id="ln" className="input" value={f.last} maxLength={22} onChange={(e) => up({ last: e.target.value })} placeholder="Ej.: Ferrer" /></div>
              <div className="field"><label htmlFor="js">Nombre en la camiseta</label><input id="js" className="input" value={f.jersey} maxLength={14} onChange={(e) => up({ jersey: e.target.value.toUpperCase() })} placeholder={f.last.toUpperCase() || 'APELLIDO'} /></div>
              <div className="field"><label htmlFor="no">Dorsal (0-99)</label><input id="no" className="input" type="number" min={0} max={99} value={f.number} onChange={(e) => up({ number: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} /></div>
              <div className="field span2">
                <label htmlFor="nat">Nacionalidad</label>
                <input id="nat" className="input" placeholder="Buscar país…" value={natQuery} onChange={(e) => setNatQuery(e.target.value)} />
                <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                  {countries.map((c) => (
                    <button key={c.code} className={`chip ${f.nat === c.code ? 'accent' : ''}`} style={{ cursor: 'pointer' }} onClick={() => up({ nat: c.code, birthplace: c.name })} aria-pressed={f.nat === c.code}>{c.flag} {c.name}</button>
                  ))}
                </div>
              </div>
              <div className="field"><label htmlFor="bp">Lugar de formación</label><input id="bp" className="input" value={f.birthplace} onChange={(e) => up({ birthplace: e.target.value })} placeholder="Ciudad o academia" /></div>
              <div className="field">
                <label htmlFor="age">Edad inicial: {f.age}</label>
                <input id="age" type="range" min={18} max={f.route === 'alternative' ? 24 : 22} value={f.age} onChange={(e) => up({ age: Number(e.target.value) })} />
              </div>
              <div className="field span2">
                <label htmlFor="org">{f.route === 'international' ? 'Club de procedencia' : f.route === 'college' ? 'Universidad' : 'Equipo de procedencia'}</label>
                <input id="org" className="input" list="orgs" value={f.origin} onChange={(e) => up({ origin: e.target.value })} />
                <datalist id="orgs">{(f.route === 'international' ? EURO_CLUBS : f.route === 'college' || f.route === 'drafted' ? UNIVERSITY_SUGGESTIONS : HIGH_SCHOOLS).map((o) => <option key={o} value={o} />)}</datalist>
                {f.route === 'college' && <span className="tiny dim">Las universidades se usan solo como referencia. Los rivales de la NCAA son ficticios.</span>}
              </div>
              <div className="field span2"><label htmlFor="bio">Biografía (opcional)</label><textarea id="bio" className="input" maxLength={400} value={f.bio} onChange={(e) => up({ bio: e.target.value })} placeholder="Creció jugando en las pistas de su barrio…" /></div>
            </div>
          )}

          {step === 3 && (
            <div className="grid g2">
              <div className="field">
                <label htmlFor="h">Altura: {cm(f.height)} ({ftIn(f.height)})</label>
                <input id="h" type="range" min={HEIGHT_RANGE[f.pos][0] - 4} max={HEIGHT_RANGE[f.pos][1] + 4} value={f.height} onChange={(e) => up({ height: Number(e.target.value) })} />
                <span className="tiny dim">Más alto: mejor rebote y tapón, menos velocidad.</span>
              </div>
              <div className="field">
                <label htmlFor="w">Peso: {f.weight} kg</label>
                <input id="w" type="range" min={Math.round(f.height * 0.4)} max={Math.round(f.height * 0.62)} value={f.weight} onChange={(e) => up({ weight: Number(e.target.value) })} />
                <span className="tiny dim">Más peso: más fuerza, menos aceleración.</span>
              </div>
              <div className="field">
                <label>Mano dominante</label>
                <div className="seg">{(['R', 'L'] as Hand[]).map((h) => <button key={h} aria-pressed={f.hand === h} onClick={() => up({ hand: h })}>{h === 'R' ? 'Diestro' : 'Zurdo'}</button>)}</div>
              </div>
              <div className="field">
                <label>Tono de piel</label>
                <div className="row wrap">{SKINS.map((s, i) => <button key={s} aria-label={`Tono ${i + 1}`} aria-pressed={f.look.skin === i} onClick={() => up({ look: { ...f.look, skin: i } })} style={{ width: 34, height: 34, borderRadius: '50%', background: s, border: f.look.skin === i ? '3px solid var(--accent)' : '2px solid var(--line-2)', cursor: 'pointer' }} />)}</div>
              </div>
              <div className="field">
                <label>Peinado</label>
                <div className="seg">{HAIRS.map((h, i) => <button key={h} aria-pressed={f.look.hair === i} onClick={() => up({ look: { ...f.look, hair: i } })}>{h}</button>)}</div>
              </div>
              <div className="field">
                <label>Color de la camiseta (previa)</label>
                <div className="row wrap">{ACCENTS.map((a) => <button key={a} aria-label={`Color ${a}`} aria-pressed={f.look.accent === a} onClick={() => up({ look: { ...f.look, accent: a } })} style={{ width: 30, height: 30, borderRadius: 8, background: a, border: f.look.accent === a ? '3px solid #fff' : '2px solid var(--line-2)', cursor: 'pointer' }} />)}</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <>
              <div className="field">
                <label>Posición</label>
                <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {(['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]).map((p) => (
                    <button key={p} className="tile" aria-pressed={f.pos === p} onClick={() => setPos(p)}>
                      <span className="t">{p}</span><span className="d">{POS_LABEL[p]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Arquetipo (afecta al desarrollo, a los roles ofrecidos y a la simulación)</label>
                <div className="tiles">
                  {archs.map((a) => (
                    <button key={a.id} className="tile" aria-pressed={f.arch === a.id} onClick={() => up({ arch: a.id as Archetype })}>
                      <span className="t">{a.label}</span><span className="d">{a.desc}</span>
                      <span className="tiny dim">Crece mejor en: {a.growth.map((g) => TRAINING_AREAS[g].label).join(', ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="tiles">
                {([
                  { id: 'raw', t: 'Diamante en bruto', d: 'OVR bajo, techo altísimo. Necesitarás paciencia y minutos.' },
                  { id: 'balanced', t: 'Equilibrado', d: 'Un punto de partida sólido con margen de mejora.' },
                  { id: 'ready', t: 'Listo para competir', d: 'Aporta desde el primer día, pero su techo es menor.' },
                ] as { id: TalentProfile; t: string; d: string }[]).map((x) => (
                  <button key={x.id} className="tile" aria-pressed={f.talent === x.id} onClick={() => up({ talent: x.id })}><span className="t">{x.t}</span><span className="d">{x.d}</span></button>
                ))}
              </div>
              <div className="card flat">
                <div className="row between" style={{ marginBottom: 12 }}>
                  <h3>Puntos de especialización</h3>
                  <span className={`chip ${used === FOCUS_POINTS ? 'good' : 'accent'}`}>{FOCUS_POINTS - used} por asignar</span>
                </div>
                <div className="grid g2">
                  {FOCUS_AREAS.map((a) => {
                    const v = f.focus[a] ?? 0;
                    return (
                      <div key={a} className="row between" style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '8px 12px' }}>
                        <div><b className="small">{TRAINING_AREAS[a].label}</b><div className="tiny dim">{TRAINING_AREAS[a].desc}</div></div>
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn sm" aria-label={`Quitar punto de ${TRAINING_AREAS[a].label}`} disabled={v === 0} onClick={() => up({ focus: { ...f.focus, [a]: v - 1 } })}>−</button>
                          <b className="num" style={{ width: 16, textAlign: 'center' }}>{v}</b>
                          <button className="btn sm" aria-label={`Añadir punto de ${TRAINING_AREAS[a].label}`} disabled={v >= 4 || used >= FOCUS_POINTS} onClick={() => up({ focus: { ...f.focus, [a]: v + 1 } })}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <div className="card hl">
              <h3 style={{ marginBottom: 12 }}>Resumen</h3>
              <div className="grid g2 small">
                <div><span className="dim">Ritmo:</span> {f.mode === 'full' ? 'Carrera completa' : 'Carrera rápida'}</div>
                <div><span className="dim">Vía:</span> {ROUTES.find((r) => r.id === f.route)!.title}</div>
                <div><span className="dim">Procedencia:</span> {f.origin}</div>
                <div><span className="dim">Especialización:</span> {specialization(f.pos, f.arch, preview.attrs)}</div>
                <div><span className="dim">Físico:</span> {cm(f.height)} · {f.weight} kg · {f.hand === 'R' ? 'Diestro' : 'Zurdo'}</div>
                <div><span className="dim">OVR / POT:</span> {preview.ovr} / {preview.pot}</div>
              </div>
              <p className="small muted" style={{ marginTop: 12 }}>El potencial es una proyección: no garantiza nada. Minutos, salud, entrenamiento y decisiones marcarán hasta dónde llegas.</p>
            </div>
          )}

          <div className="row between" style={{ marginTop: 6 }}>
            <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="back" /> Atrás</button>
            {step < STEPS.length - 1 ? (
              <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Siguiente <Icon name="arrow" /></button>
            ) : (
              <button className="btn primary lg" onClick={start}><Icon name="play" /> Empezar carrera</button>
            )}
          </div>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 20 }}>
          <div className="pcard" style={{ ['--team' as string]: f.look.accent }} data-num={f.number}>
            <div className="pcard-top">
              <Avatar skin={f.look.skin} hair={f.look.hair} color={f.look.accent} number={f.number} size={92} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="chip accent">#{f.number} · {f.pos}</span>
                <div className="pname" style={{ marginTop: 6 }}><small>{f.first || 'Nombre'}</small>{f.last || 'Apellido'}</div>
                <div className="tiny muted">{COUNTRIES.find((c) => c.code === f.nat)?.flag} {f.jersey || f.last.toUpperCase() || 'CAMISETA'}</div>
              </div>
              <OvrRing ovr={preview.ovr} pot={preview.pot} size={70} />
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Perfil proyectado</h3>
            <Radar axes={['Tiro', 'Interior', 'Creación', 'Defensa', 'Rebote', 'Físico']} values={[comp.three * 0.6 + comp.mid * 0.4, comp.inside, (comp.creation + comp.playmaking) / 2, comp.defense, comp.rebound, (preview.attrs.speed + preview.attrs.vert + preview.attrs.strength) / 3]} size={260} />
            <p className="tiny dim" style={{ textAlign: 'center' }}>{ARCHETYPES.find((a) => a.id === f.arch)?.label} · {specialization(f.pos, f.arch, preview.attrs)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
