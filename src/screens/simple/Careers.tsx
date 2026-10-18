import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { careerHistory, clearHistory, globalAchievements, playStreak, store, useCareer, type CareerRecord } from '../../store/store';
import { seasonLabel } from '../../engine/schedule';
import { f1 } from '../../engine/stats';
import { Flag } from '../../ui/Flag';
import { ACHIEVEMENTS } from '../../engine/achievements';

type Sort = 'legacyScore' | 'ppg' | 'titles' | 'endedAt';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'legacyScore', label: 'Legado' },
  { id: 'ppg', label: 'Puntos' },
  { id: 'titles', label: 'Anillos' },
  { id: 'endedAt', label: 'Recientes' },
];

/** Finished careers side by side, to beat your own records. */
export function Careers() {
  const nav = useNavigate();
  const c = useCareer();
  const [sort, setSort] = useState<Sort>('legacyScore');
  const [list, setList] = useState(() => { store.flush(); return careerHistory(); });
  const doneCount = list.filter((r) => r.challengeDone).length;
  const rows = [...list].sort((a, b) => b[sort] - a[sort] || b.legacyScore - a.legacyScore);
  const best = (k: keyof CareerRecord) => Math.max(...list.map((r) => r[k] as number));
  const top = (r: CareerRecord, k: keyof CareerRecord) => list.length > 1 && (r[k] as number) > 0 && r[k] === best(k);
  return (
    <div className="simple-wrap">
      <div className="simple-panel anim-in careers">
        <div className="simple-head">
          <div>
            <h2>Mis carreras</h2>
            {list.length > 0 && <p className="tiny dim" style={{ margin: '4px 0 0' }}>{list.length} {list.length === 1 ? 'carrera' : 'carreras'} · {doneCount} {doneCount === 1 ? 'reto cumplido' : 'retos cumplidos'} · mejor legado {Math.max(...list.map((r) => r.legacyScore))}{playStreak() >= 2 ? ` · 🔥 racha de ${playStreak()} días` : ''}</p>}
          </div>
          {list.length > 1 && (
            <div className="seg" role="radiogroup" aria-label="Ordenar">
              {SORTS.map((s) => <button key={s.id} aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>)}
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>Todavía no has terminado ninguna carrera. Cuando te retires, aparecerá aquí para que puedas compararla con las siguientes.</p>
        ) : (
          <div className="career-list">
            {rows.map((r, i) => (
              <div key={r.id} className={`career-row ${c?.id === r.id ? 'current' : ''}`}>
                <span className="career-rank">{i + 1}</span>
                <div className="career-who">
                  <b><Flag code={r.nat} size={18} /> {r.name}</b>
                  <small>{r.pos} · {seasonLabel(r.from)} a {seasonLabel(r.to)} · {r.seasons} temp. · retirado a los {r.age}</small>
                  <small className="dim">{r.teams.join(' · ')}</small>
                  {r.challenge && <small className={r.challengeDone ? 'gold' : 'dim'}>{r.challengeDone ? '✅' : '❌'} Reto: {r.challenge}</small>}
                </div>
                <div className="career-stats">
                  <span className={top(r, 'ppg') ? 'gold' : ''}><b>{f1(r.ppg)}</b><small>PTS</small></span>
                  <span className={top(r, 'rpg') ? 'gold' : ''}><b>{f1(r.rpg)}</b><small>REB</small></span>
                  <span className={top(r, 'apg') ? 'gold' : ''}><b>{f1(r.apg)}</b><small>AST</small></span>
                  <span className={top(r, 'titles') ? 'gold' : ''}><b>{r.titles}</b><small>Anillos</small></span>
                  <span className={top(r, 'mvp') ? 'gold' : ''}><b>{r.mvp}</b><small>MVP</small></span>
                  <span className={top(r, 'allStar') ? 'gold' : ''}><b>{r.allStar}</b><small>All-Star</small></span>
                  <span className={top(r, 'peakOvr') ? 'gold' : ''}><b>{r.peakOvr}</b><small>OVR máx.</small></span>
                </div>
                <div className="career-legacy">
                  <b className={top(r, 'legacyScore') ? 'gold' : 'accent'}>{r.legacyScore}</b>
                  <small>{r.tier}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        <Achievements />
        <div className="simple-foot">
          <button className="btn pill" onClick={() => nav(c ? '/play' : '/start')}>{c && c.phase !== 'retired' ? 'Volver al juego' : 'Volver'}</button>
          {list.length > 0 && <button className="btn pill ghost small" onClick={() => { if (confirm('¿Borrar todas las carreras guardadas?')) { clearHistory(); setList([]); } }}>Borrar historial</button>}
          <button className="btn pill light" onClick={() => nav('/start')}>Nueva carrera</button>
        </div>
      </div>
    </div>
  );
}

/** Achievements unlocked across all careers: a collection to complete run after run. */
function Achievements() {
  const got = new Set(globalAchievements());
  const list = ACHIEVEMENTS.filter((a) => !a.id.startsWith('daily'));
  const n = list.filter((a) => got.has(a.id)).length;
  return (
    <section className="ach-box">
      <h3>Logros <span className="dim">{n} / {list.length}</span></h3>
      <div className="ach-grid">
        {list.map((a) => (
          <div key={a.id} className={`ach-item ${got.has(a.id) ? 'on' : ''}`} title={a.desc}>
            <span className="ach-ic" aria-hidden="true">{got.has(a.id) ? a.icon : '🔒'}</span>
            <span><b>{a.title}</b><small>{a.desc}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}
