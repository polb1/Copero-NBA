import { useCareer } from '../store/store';
import { teamOf, userOf } from '../engine/career';
import { ATTR_META, POS_LABEL, archetypeDef, composites, specialization } from '../engine/attributes';
import { teamName } from '../engine/league';
import { seasonLabel } from '../engine/schedule';
import { Card, PageHead, attrColor, cm, ftIn, flag, natName } from '../ui/common';
import { PlayerCard } from '../ui/PlayerCard';
import { Radar, LineChart } from '../ui/charts';

export function Profile() {
  const c = useCareer()!;
  const u = userOf(c);
  const t = teamOf(c);
  const comp = composites(u.attrs);
  const groups = [...new Set(ATTR_META.map((a) => a.group))];
  const leagueAvg = (() => {
    const ps = Object.values(c.league.players).filter((p) => p.teamId && !p.isUser && p.pos === u.pos && p.season !== undefined);
    const avg = (fn: (x: typeof comp) => number) => ps.reduce((s, p) => s + fn(composites(p.attrs)), 0) / Math.max(1, ps.length);
    return [avg((x) => x.three * 0.6 + x.mid * 0.4), avg((x) => x.inside), avg((x) => (x.creation + x.playmaking) / 2), avg((x) => x.defense), avg((x) => x.rebound), avg(() => 0)];
  })();
  const phys = (u.attrs.speed + u.attrs.vert + u.attrs.strength) / 3;
  const physAvg = (() => {
    const ps = Object.values(c.league.players).filter((p) => p.teamId && !p.isUser && p.pos === u.pos);
    return ps.reduce((s, p) => s + (p.attrs.speed + p.attrs.vert + p.attrs.strength) / 3, 0) / Math.max(1, ps.length);
  })();
  leagueAvg[5] = physAvg;
  return (
    <>
      <PageHead eyebrow="Perfil del jugador" title={`${u.first} ${u.last}`} desc={c.profile.bio || `${specialization(u.pos, u.arch, u.attrs)} de ${natName(u.nat)}, formado en ${c.profile.birthplace || natName(u.nat)} y procedente de ${c.profile.origin}.`} />
      <div className="grid two-col-l">
        <div className="stack">
          <PlayerCard c={c} p={u} teamColor={t?.color ?? c.profile.look.accent} teamLabel={teamName(c.league, u.teamId)} />
          <Card title="Ficha" icon="user">
            <div className="stack small">
              {[
                ['Nacionalidad', `${flag(u.nat)} ${natName(u.nat)}`],
                ['Camiseta', `${c.profile.jersey} #${c.profile.number}`],
                ['Posición', `${u.pos} · ${POS_LABEL[u.pos]}`],
                ['Especialización', specialization(u.pos, u.arch, u.attrs)],
                ['Arquetipo', archetypeDef(u.arch).label],
                ['Altura / peso', `${cm(u.height)} (${ftIn(u.height)}) · ${u.weight} kg`],
                ['Mano', u.hand === 'R' ? 'Diestro' : 'Zurdo'],
                ['Nacimiento', String(u.birthYear)],
                ['Procedencia', c.profile.origin],
                ['Draft', u.draft ? `${u.draft.season} · ${u.draft.round}.ª ronda, pick ${u.draft.pick} (${u.draft.teamId})` : c.flags.undrafted ? 'No seleccionado' : 'Pendiente'],
                ['Agente', c.agent.name],
                ['Equipos', c.teamsPlayed.map((id) => c.league.teams[id]?.name ?? id).join(', ') || '—'],
              ].map(([k, v]) => <div key={k} className="row between"><span className="muted">{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>)}
            </div>
          </Card>
        </div>
        <div className="stack">
          <div className="grid g2">
            <Card title="Perfil de juego" icon="target">
              <Radar axes={['Tiro', 'Interior', 'Creación', 'Defensa', 'Rebote', 'Físico']} values={[comp.three * 0.6 + comp.mid * 0.4, comp.inside, (comp.creation + comp.playmaking) / 2, comp.defense, comp.rebound, phys]} compare={leagueAvg} />
              <p className="tiny dim" style={{ textAlign: 'center' }}>Naranja: tú · Azul discontinuo: media de los {u.pos} de la liga</p>
            </Card>
            <Card title="Valoraciones" icon="chart">
              <div className="kpis">
                <div className="kpi"><span className="v accent">{u.ovr}</span><span className="l">OVR actual</span></div>
                <div className="kpi"><span className="v" style={{ color: '#60a5fa' }}>{u.pot}</span><span className="l">Potencial</span></div>
                <div className="kpi"><span className="v">{u.form > 0 ? '+' : ''}{u.form.toFixed(1)}</span><span className="l">Forma reciente</span></div>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>El OVR resume tus atributos actuales ponderados por posición. El potencial es una proyección del techo; la forma refleja tu rendimiento en los últimos partidos frente a lo esperado.</p>
              <div style={{ marginTop: 10 }}>
                <LineChart height={150} labels={c.ovrHistory.map((o) => seasonLabel(o.season).slice(2))} series={[{ label: 'OVR', color: 'var(--accent)', values: c.ovrHistory.map((o) => o.ovr) }]} />
              </div>
            </Card>
          </div>
          <Card title="Atributos (0-99)" icon="dumbbell">
            <div className="grid g3">
              {groups.map((g) => (
                <div key={g} className="stack" style={{ gap: 10 }}>
                  <div className="label">{g}</div>
                  {ATTR_META.filter((a) => a.group === g).map((a) => (
                    <div key={a.key} className="attr-row">
                      <div>
                        <div className="name"><span>{a.label}</span></div>
                        <div className="bar"><span style={{ width: `${u.attrs[a.key]}%`, background: attrColor(u.attrs[a.key]) }} /></div>
                      </div>
                      <span className="attr-val" style={{ color: attrColor(u.attrs[a.key]) }}>{u.attrs[a.key]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
