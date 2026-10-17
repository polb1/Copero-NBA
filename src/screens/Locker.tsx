import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { onNbaRoster, teamOf, userOf, userRole } from '../engine/career';
import { STYLE_LABEL, STATUS_LABEL, teamName } from '../engine/league';
import { buildRotation } from '../engine/gamesim';
import { averages, f1 } from '../engine/stats';
import { fullName } from '../engine/players';
import { archetypeDef } from '../engine/attributes';
import { Card, Empty, Gauge, Kpi, PageHead, flag } from '../ui/common';

export function Locker() {
  const c = useCareer()!;
  const u = userOf(c);
  const t = teamOf(c);
  if (!t) return <><PageHead eyebrow="Vestuario" title="Vestuario" /><Card><Empty icon="👥" title="Sin vestuario NBA">Cuando formes parte de una franquicia verás aquí tu relación con el entrenador y los compañeros.</Empty></Card></>;
  const role = userRole(c);
  const rot = buildRotation(c.league, t.id, { userId: u.id, userTrust: c.trust, userAvailable: c.assignment === 'NBA' });
  const order = new Map(rot.players.map((p, i) => [p.id, { i, m: p.minutes }]));
  const roster = t.roster.map((id) => c.league.players[id]).filter(Boolean).sort((a, b) => (order.get(a.id)?.i ?? 99) - (order.get(b.id)?.i ?? 99));
  const lastDemand = c.flags.lastDemand ?? 0;
  const canDemand = c.phase === 'regular' && onNbaRoster(c) && c.league.season * 1000 + c.league.day - lastDemand > 30;
  const canAssign = u.contract && u.contract.kind !== 'gleague' && (c.phase === 'regular' || c.phase === 'preseason');
  return (
    <>
      <PageHead eyebrow="Vestuario y relación con el entrenador" title={teamName(c.league, t.id)} desc={`${STATUS_LABEL[t.status]}. Tu rol actual: ${role.label}${role.minutes ? ` (~${Math.round(role.minutes)} min proyectados)` : ''}.`} />
      <div className="grid g3">
        <Card title="Entrenador" icon="user">
          <h2 style={{ fontSize: '1.5rem' }}>{t.coach.name}</h2>
          <p className="small muted" style={{ margin: '4px 0 12px' }}>{STYLE_LABEL[t.coach.style]} · en el cargo desde {t.coach.hiredSeason}</p>
          <div className="stack" style={{ gap: 10 }}>
            <Gauge label="Calidad (desarrollo y táctica)" value={t.coach.rating} color="var(--purple)" />
            <Gauge label="Paciencia con los jóvenes" value={t.coach.patience} color="#60a5fa" />
            <Gauge label="Confianza en ti" value={c.trust} />
          </div>
          <div className="divider" />
          <div className="row wrap">
            <button className="btn" disabled={!canDemand} onClick={() => { let ok = false; store.act((x) => { ok = api.demandMinutes(x); }); store.toast(ok ? 'El entrenador acepta darte más protagonismo.' : 'La reunión no sale bien.'); }}>Pedir más minutos</button>
            {canAssign && (c.assignment === 'NBA'
              ? <button className="btn ghost" onClick={() => store.act((x) => api.setAssignment(x, 'GLG'))}>Bajar a la G League</button>
              : u.contract?.kind !== 'two-way' && <button className="btn ghost" onClick={() => store.act((x) => api.setAssignment(x, 'NBA'))}>Volver al primer equipo</button>)}
          </div>
          {!canDemand && c.phase === 'regular' && <p className="tiny dim" style={{ marginTop: 8 }}>Solo puedes pedir una reunión de este tipo cada 30 días.</p>}
        </Card>
        <Card title="Tu situación" icon="heart">
          <div className="stack" style={{ gap: 10 }}>
            <Gauge label="Moral" value={c.morale} />
            <Gauge label="Química con el grupo" value={c.chemistry} />
            <Gauge label="Lealtad a la franquicia" value={c.loyalty} color="#60a5fa" />
            <Gauge label="Presión mediática" value={c.pressure} color={c.pressure > 60 ? 'var(--bad)' : 'var(--warn)'} />
          </div>
        </Card>
        <Card title="Imagen pública" icon="star">
          <div className="kpis" style={{ marginBottom: 12 }}>
            <Kpi v={Math.round(c.reputation)} l="Reputación" tone="accent" />
            <Kpi v={Math.round(c.fame)} l="Popularidad" />
            <Kpi v={c.allStarGames} l="All-Star" tone="gold" />
          </div>
          <p className="small muted">La reputación pesa en las ofertas y en el respeto de la liga. La popularidad atrae patrocinios y votos para el All-Star, pero también presión.</p>
          {c.tradeRequested && <p className="small bad" style={{ marginTop: 10 }}>Has pedido el traspaso. El vestuario lo sabe.</p>}
        </Card>
      </div>
      <Card title="Plantilla y rotación" icon="people" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>#</th><th className="l">Jugador</th><th>Pos</th><th className="l hide-sm">Arquetipo</th><th>Edad</th><th>OVR</th><th>Min proy.</th><th>PJ</th><th>PTS</th><th>REB</th><th>AST</th><th className="l">Estado</th></tr></thead>
            <tbody>
              {roster.map((p) => {
                const o = order.get(p.id);
                const a = averages(p.season);
                return (
                  <tr key={p.id} className={p.isUser ? 'me' : o && o.i === 4 ? 'sep' : ''}>
                    <td>{o ? o.i + 1 : '—'}</td>
                    <td className="l">{flag(p.nat)} {fullName(p)}{p.isUser ? ' (tú)' : ''}</td>
                    <td>{p.pos}</td><td className="l hide-sm">{archetypeDef(p.arch).label}</td><td>{p.age}</td><td><b>{p.ovr}</b></td>
                    <td>{o ? Math.round(o.m) : 0}</td><td>{p.season.gp}</td><td>{f1(a.ppg)}</td><td>{f1(a.rpg)}</td><td>{f1(a.apg)}</td>
                    <td className="l small">{p.injury ? <span className="bad">{p.injury.name} ({p.injury.daysLeft} d)</span> : p.contract?.kind === 'two-way' ? <span className="dim">Two-way</span> : p.isUser && c.assignment === 'GLG' ? <span className="dim">G League</span> : o && o.i < 5 ? 'Titular' : o && o.m >= 10 ? 'Rotación' : 'Banquillo'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="tiny dim" style={{ marginTop: 8 }}>El entrenador ordena la rotación por nivel, forma, cansancio y confianza. Los minutos proyectados cambian con lesiones y rendimiento.</p>
      </Card>
    </>
  );
}
