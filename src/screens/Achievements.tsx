import { useCareer, globalAchievements } from '../store/store';
import { ACHIEVEMENTS } from '../engine/achievements';
import { PageHead } from '../ui/common';

export function Achievements() {
  const c = useCareer();
  const global = new Set([...globalAchievements(), ...(c?.achievements ?? [])]);
  const here = new Set(c?.achievements ?? []);
  return (
    <>
      <PageHead eyebrow="Colección de logros" title="Logros" desc={`${global.size} de ${ACHIEVEMENTS.length} desbloqueados en todas tus partidas. Se guardan en este navegador.`} />
      <div className="bar" style={{ marginBottom: 18 }}><span style={{ width: `${(global.size / ACHIEVEMENTS.length) * 100}%` }} /></div>
      <div className="grid g3">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`ach ${global.has(a.id) ? '' : 'locked'}`}>
            <div className="ic" aria-hidden="true">{a.icon}</div>
            <div>
              <b>{a.title}</b>
              <div className="small muted">{a.desc}</div>
              {here.has(a.id) && <span className="chip accent" style={{ marginTop: 4 }}>En esta carrera</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
