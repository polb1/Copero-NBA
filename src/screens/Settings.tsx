import { resetAllData, store, useStore } from '../store/store';
import { Card, PageHead } from '../ui/common';
import { RULES } from '../engine/config';

export function Settings() {
  const s = useStore((x) => x.settings);
  const set = (patch: Partial<typeof s>) => store.setSettings({ ...s, ...patch });
  return (
    <div>
      <PageHead eyebrow="Ajustes, accesibilidad y preferencias" title="Ajustes" />
      <div className="grid g2">
        <Card title="Accesibilidad" icon="gear">
          <div className="stack" style={{ gap: 18 }}>
            <div className="field">
              <label>Animaciones</label>
              <div className="seg">
                {(['system', 'reduce', 'full'] as const).map((m) => <button key={m} aria-pressed={s.motion === m} onClick={() => set({ motion: m })}>{m === 'system' ? 'Según el sistema' : m === 'reduce' ? 'Reducidas' : 'Completas'}</button>)}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ts">Tamaño de texto: {Math.round(s.textScale * 100)}%</label>
              <input id="ts" type="range" min={0.9} max={1.3} step={0.05} value={s.textScale} onChange={(e) => set({ textScale: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Contraste</label>
              <div className="seg">
                {(['normal', 'high'] as const).map((m) => <button key={m} aria-pressed={s.contrast === m} onClick={() => set({ contrast: m })}>{m === 'normal' ? 'Normal' : 'Alto'}</button>)}
              </div>
            </div>
          </div>
        </Card>
        <Card title="Controles" icon="play">
          <table className="t">
            <tbody>
              <tr><td className="l"><kbd>N</kbd></td><td className="l">Siguiente partido</td></tr>
              <tr><td className="l"><kbd>W</kbd></td><td className="l">Avanzar una semana</td></tr>
              <tr><td className="l"><kbd>E</kbd></td><td className="l">Hasta el próximo acontecimiento</td></tr>
              <tr><td className="l"><kbd>1</kbd>–<kbd>4</kbd></td><td className="l">Elegir opción en una decisión</td></tr>
              <tr><td className="l"><kbd>Enter</kbd></td><td className="l">Cerrar el resultado de una decisión</td></tr>
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 10 }}>Todo es accesible con ratón, teclado (Tab para navegar) y pantalla táctil.</p>
        </Card>
        <Card title="Sobre la simulación" icon="ball">
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>Reglas salariales de la temporada {RULES.label} (consultadas el 17/10/2026), proyectadas a temporadas futuras.</li>
            <li>Lotería del draft: formato 3-2-1 aprobado en mayo de 2026.</li>
            <li>Motor estadístico determinista: misma semilla + mismas decisiones = mismo resultado.</li>
            <li>Idioma: español. La arquitectura separa los textos de la lógica para añadir más idiomas.</li>
          </ul>
          <p className="tiny dim" style={{ marginTop: 10 }}>{RULES.simplifiedCbaNotice}</p>
        </Card>
        <Card title="Datos" icon="trash">
          <p className="small muted">Las partidas, logros y récords del desafío diario se guardan solo en este navegador.</p>
          <button className="btn danger" style={{ marginTop: 12 }} onClick={() => { if (confirm('Esto borrará TODAS las partidas, logros y récords guardados en este navegador. ¿Continuar?')) { resetAllData(); store.setCareer(null, false); store.toast('Datos borrados.'); } }}>Borrar todos los datos</button>
        </Card>
      </div>
    </div>
  );
}
