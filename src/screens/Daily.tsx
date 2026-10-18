import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dailyPreset, todayKey } from '../engine/daily';
import { newCareer } from '../engine/api';
import { buildUserPlayer } from '../engine/career';
import { ARCHETYPES, POS_LABEL, TRAINING_AREAS } from '../engine/attributes';
import { DAILY_MAX_SEASONS } from '../engine/config';
import { dailyRecords, listSlots, loadCareer, store } from '../store/store';
import { Card, PageHead, cm, natName } from '../ui/common';
import { Avatar, OvrRing } from '../ui/PlayerCard';
import { Icon } from '../ui/icons';
import { Flag } from '../ui/Flag';

const ROUTE: Record<string, string> = { college: 'Prospecto universitario', international: 'Jugador internacional', alternative: 'Vía alternativa (sin draft)', drafted: 'Novato elegido' };

export function Daily() {
  const nav = useNavigate();
  const key = todayKey();
  const preset = useMemo(() => dailyPreset(key), [key]);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [number, setNumber] = useState(7);
  const records = dailyRecords();
  const today = records[key];
  const slotToday = listSlots().find((s) => s.mode === 'daily' && s.dailyKey === key);
  const inp = { ...preset.input, first: first || 'Jugador', last: last || 'Diario', jersey: (last || 'DIARIO').toUpperCase(), number, look: { skin: 2, hair: 1, accent: '#ff6b1a' }, bio: '' };
  const preview = buildUserPlayer(inp, preset.seed, 2026);
  const start = () => {
    const c = newCareer(inp, preset.seed);
    store.setCareer(c);
    nav('/play');
  };
  return (
    <div>
      <PageHead eyebrow={`Desafío diario · ${key}`} title="Mismo punto de partida para todos" desc={`Hoy todos los jugadores comparten jugador, vía de entrada y semilla. Las mismas decisiones producen exactamente el mismo resultado. Máximo ${DAILY_MAX_SEASONS} temporadas NBA; tu puntuación es el Legacy Score final.`} />
      <div className="grid two-col">
        <div className="stack">
          <Card title="Condiciones de hoy" icon="sun" className="hl">
            <div className="grid g2 small">
              <div><span className="dim">Nacionalidad:</span> <Flag code={preset.input.nat} size={20} /> {natName(preset.input.nat)}</div>
              <div><span className="dim">Posición:</span> {preset.input.pos} · {POS_LABEL[preset.input.pos]}</div>
              <div><span className="dim">Arquetipo:</span> {ARCHETYPES.find((a) => a.id === preset.input.arch)!.label}</div>
              <div><span className="dim">Vía:</span> {ROUTE[preset.input.route]}</div>
              <div><span className="dim">Edad:</span> {preset.input.age}</div>
              <div><span className="dim">Físico:</span> {cm(preset.input.height)} · {preset.input.weight} kg</div>
              <div><span className="dim">Procedencia:</span> {preset.input.origin}</div>
              <div><span className="dim">Perfil:</span> {preset.input.talent === 'raw' ? 'Diamante en bruto' : preset.input.talent === 'ready' ? 'Listo para competir' : 'Equilibrado'}</div>
              <div className="span2"><span className="dim">Especialización:</span> {Object.entries(preset.input.focus).map(([k, v]) => `${TRAINING_AREAS[k as keyof typeof TRAINING_AREAS].label} ${v}`).join(' · ')}</div>
            </div>
          </Card>
          <Card title="Tu identidad (no afecta a la simulación)" icon="user">
            <div className="grid g3">
              <div className="field"><label htmlFor="dfn">Nombre</label><input id="dfn" className="input" value={first} maxLength={20} onChange={(e) => setFirst(e.target.value)} /></div>
              <div className="field"><label htmlFor="dln">Apellido</label><input id="dln" className="input" value={last} maxLength={22} onChange={(e) => setLast(e.target.value)} /></div>
              <div className="field"><label htmlFor="dno">Dorsal</label><input id="dno" className="input" type="number" min={0} max={99} value={number} onChange={(e) => setNumber(Math.max(0, Math.min(99, Number(e.target.value) || 0)))} /></div>
            </div>
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="btn primary lg" onClick={start}><Icon name="play" /> Jugar el desafío de hoy</button>
              {slotToday && <button className="btn lg" onClick={() => { const c = loadCareer(slotToday.id); if (c) { store.setCareer(c, false); nav(c.phase === 'retired' ? '/retirement' : '/career'); } }}>Continuar intento guardado</button>}
            </div>
          </Card>
          <Card title="Tus mejores puntuaciones" icon="trophy">
            {Object.keys(records).length === 0 ? <p className="small muted">Termina un desafío para registrar tu puntuación. El ranking es local: se guarda solo en este navegador (no hay servidor).</p> : (
              <table className="t">
                <thead><tr><th className="l">Día</th><th className="l">Jugador</th><th>Legacy Score</th></tr></thead>
                <tbody>{Object.values(records).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 14).map((r) => <tr key={r.key} className={r.key === key ? 'me' : ''}><td className="l">{r.key}</td><td className="l">{r.name}</td><td><b>{r.best}</b></td></tr>)}</tbody>
              </table>
            )}
          </Card>
        </div>
        <aside className="stack">
          <div className="pcard" data-num={number}>
            <div className="pcard-top">
              <Avatar skin={2} hair={1} color="#ff6b1a" number={number} size={90} />
              <div style={{ flex: 1 }}><span className="chip accent">#{number} · {preset.input.pos}</span><div className="pname" style={{ marginTop: 6 }}><small>{first || 'Jugador'}</small>{last || 'Diario'}</div></div>
              <OvrRing ovr={preview.ovr} pot={preview.pot} size={70} />
            </div>
          </div>
          {today && <Card title="Hoy" icon="star"><p className="small">Tu mejor resultado de hoy: <b className="accent">{today.best}</b> ({today.name}).</p></Card>}
        </aside>
      </div>
    </div>
  );
}
