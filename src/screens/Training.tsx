import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { teamOf, userOf } from '../engine/career';
import { TRAINING_AREAS, archetypeDef, attrLabel } from '../engine/attributes';
import { goalOptions } from '../engine/goals';
import { ageGrowthFactor } from '../engine/progression';
import type { TrainingFocus } from '../engine/types';
import { Card, Gauge, PageHead, attrColor } from '../ui/common';
import { LineChart } from '../ui/charts';

const FOCI: TrainingFocus[] = ['shooting', 'finishing', 'playmaking', 'defense', 'athleticism', 'rebounding', 'balanced', 'rest'];

export function Training() {
  const c = useCareer()!;
  const u = userOf(c);
  const t = teamOf(c);
  const tr = c.training;
  const affinity = archetypeDef(u.arch).growth;
  const growth = ageGrowthFactor(u.age);
  const goals = goalOptions(c, u);
  const chosen = c.goals.map((g) => g.id);
  const canPickGoals = c.phase === 'preseason' || c.phase === 'predraft' || (c.phase === 'regular' && c.league.day < 20 && c.goals.length < 2);
  const bank = c.devPoints[tr.focus] ?? 0;
  const threshold = tr.focus === 'balanced' ? 2 : 3.2;
  return (
    <>
      <PageHead eyebrow="Desarrollo y entrenamiento" title="Entrenamiento" desc="Cada semana tu foco acumula trabajo. Las mejoras solo llegan cuando acumulas suficiente y dependen de tu edad, potencial, salud, minutos, ética de trabajo y del cuerpo técnico. Nada sube automáticamente." />
      <div className="grid g3">
        <Card title="Foco semanal" icon="dumbbell" className="span2">
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {FOCI.map((f) => (
              <button key={f} className="tile" aria-pressed={tr.focus === f} onClick={() => store.act((x) => api.setTraining(x, f, tr.intensity))}>
                <span className="t" style={{ fontSize: '1.05rem' }}>{TRAINING_AREAS[f].label}{affinity.includes(f) && <span className="chip accent" style={{ marginLeft: 6 }}>+15%</span>}</span>
                <span className="d">{TRAINING_AREAS[f].desc}</span>
              </button>
            ))}
          </div>
          <div className="divider" />
          <div className="row wrap between">
            <div className="field">
              <label>Intensidad</label>
              <div className="seg">
                {(['light', 'normal', 'intense'] as const).map((i) => (
                  <button key={i} aria-pressed={tr.intensity === i} onClick={() => store.act((x) => api.setTraining(x, tr.focus, i))}>{i === 'light' ? 'Ligera' : i === 'normal' ? 'Normal' : 'Intensa'}</button>
                ))}
              </div>
            </div>
            <p className="small muted" style={{ maxWidth: 420 }}>
              {tr.intensity === 'intense' ? 'Más progreso, más fatiga y más riesgo de lesión.' : tr.intensity === 'light' ? 'Recuperas energía, pero avanzas despacio.' : 'Equilibrio entre progreso y carga.'} Especializarte en un área concentra las mejoras, pero el resto de tu juego no avanza.
            </p>
          </div>
        </Card>
        <Card title="Estado de desarrollo" icon="chart">
          <div className="stack" style={{ gap: 12 }}>
            <Gauge label="Trabajo acumulado en el foco" value={(bank / threshold) * 100} color="var(--accent)" hint="Al llegar a 100 se convierte en +1 a un atributo del área" />
            <Gauge label="Margen hasta el potencial" value={Math.max(0, u.pot - u.ovr) * 4} color="#60a5fa" />
            <Gauge label="Factor de edad" value={growth * 80} color="var(--good)" hint="Los jóvenes progresan más rápido" />
            <Gauge label="Energía" value={100 - u.fatigue} />
            <Gauge label="Calidad del cuerpo técnico" value={t?.coach.rating ?? 60} color="var(--purple)" />
          </div>
          {c.flags.trainingGains ? <p className="small good" style={{ marginTop: 12 }}>+{c.flags.trainingGains} puntos de atributo ganados entrenando esta temporada.</p> : null}
          {u.injury && <p className="small bad" style={{ marginTop: 8 }}>Lesionado: el entrenamiento rinde muy poco hasta que te recuperes.</p>}
        </Card>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title="Objetivos de temporada" icon="target">
          {!canPickGoals && c.goals.length > 0 ? null : <p className="small muted" style={{ marginBottom: 10 }}>{canPickGoals ? 'Elige hasta dos objetivos.' : 'Los objetivos se fijan en la pretemporada.'}</p>}
          <div className="list">
            {(canPickGoals ? goals : goals.filter((g) => chosen.includes(g.id))).map((g) => {
              const active = c.goals.find((x) => x.id === g.id);
              return (
                <div key={g.id} className="li">
                  <div style={{ flex: 1 }}>
                    <b className="small">{g.label}</b>
                    <div className="tiny dim">{g.desc}</div>
                    {active?.progress && <div className="tiny accent">Progreso: {active.progress}</div>}
                  </div>
                  {canPickGoals ? (
                    <button className={`btn sm ${chosen.includes(g.id) ? 'primary' : ''}`} onClick={() => store.act((x) => api.setGoals(x, chosen.includes(g.id) ? chosen.filter((y) => y !== g.id) : [...chosen, g.id].slice(-2)))}>{chosen.includes(g.id) ? 'Elegido' : 'Elegir'}</button>
                  ) : <span className="chip">{active?.status === 'done' ? 'Cumplido' : active?.status === 'failed' ? 'Fallado' : 'En curso'}</span>}
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Progresión de atributos clave" icon="chart">
          {(() => {
            if (c.ovrHistory.length < 2) return <p className="small muted">La progresión aparecerá a medida que avance tu carrera.</p>;
            return <LineChart labels={c.ovrHistory.map((o) => `${o.age}`)} series={[{ label: 'OVR', color: 'var(--accent)', values: c.ovrHistory.map((o) => o.ovr) }, { label: 'Potencial', color: '#60a5fa', values: c.ovrHistory.map((o) => o.pot) }]} />;
          })()}
          <div className="grid g2" style={{ marginTop: 12 }}>
            {TRAINING_AREAS[tr.focus === 'rest' || tr.focus === 'balanced' ? 'shooting' : tr.focus].attrs.map((k) => (
              <div key={k} className="row between small"><span className="muted">{attrLabel(k)}</span><b style={{ color: attrColor(u.attrs[k]) }}>{u.attrs[k]}</b></div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
