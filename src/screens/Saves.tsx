import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteSlot, exportCareer, importCareer, listSlots, loadCareer, store, useCareer } from '../store/store';
import { Card, Empty, MODE_LABEL, PageHead, PHASE_LABEL } from '../ui/common';
import { Icon } from '../ui/icons';

export function Saves() {
  const nav = useNavigate();
  const current = useCareer();
  const [, force] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const slots = listSlots();
  const load = (id: string) => {
    const c = loadCareer(id);
    if (!c) {
      store.toast('No se pudo cargar la partida (archivo dañado o versión incompatible).');
      return;
    }
    store.setCareer(c, false);
    nav('/play');
  };
  const onImport = async (f: File) => {
    try {
      const c = importCareer(await f.text());
      store.setCareer(c);
      store.toast('Partida importada.');
      force((x) => x + 1);
    } catch (e) {
      store.toast((e as Error).message);
    }
  };
  return (
    <div>
      <PageHead eyebrow="Carga y recuperación" title="Partidas guardadas" desc="El juego guarda automáticamente tras cada acción en este navegador. Exporta tus partidas para tener una copia de seguridad o moverlas a otro dispositivo.">
        <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Importar</button>
        {current && <button className="btn" onClick={() => exportCareer(current)}><Icon name="download" /> Exportar actual</button>}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
      </PageHead>
      {slots.length === 0 ? <Card><Empty icon="💾" title="No hay partidas guardadas"><button className="btn primary" style={{ marginTop: 12 }} onClick={() => nav('/new')}>Nueva carrera</button></Empty></Card> : (
        <div className="grid g2">
          {slots.map((s) => (
            <div key={s.id} className={`card ${current?.id === s.id ? 'hl' : ''}`}>
              <div className="row between">
                <h3>{s.name}</h3>
                <span className="chip">{MODE_LABEL[s.mode]}{s.dailyKey ? ` · ${s.dailyKey}` : ''}</span>
              </div>
              <p className="small muted" style={{ margin: '6px 0' }}>{s.detail}</p>
              <p className="tiny dim">{PHASE_LABEL[s.phase]} · Guardada {new Date(s.updatedAt).toLocaleString('es')}</p>
              <div className="row wrap" style={{ marginTop: 12 }}>
                <button className="btn primary sm" onClick={() => load(s.id)}><Icon name="play" /> {current?.id === s.id ? 'Abrir' : 'Cargar'}</button>
                <button className="btn sm" onClick={() => { const c = loadCareer(s.id); if (c) exportCareer(c); }}><Icon name="download" /> Exportar</button>
                <button className="btn danger sm" onClick={() => { if (confirm(`¿Borrar definitivamente la partida de ${s.name}?`)) { deleteSlot(s.id); if (current?.id === s.id) store.setCareer(null, false); force((x) => x + 1); } }}><Icon name="trash" /> Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
