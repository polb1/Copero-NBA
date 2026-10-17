import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { onNbaRoster, teamOf, userOf } from '../engine/career';
import { teamName, STATUS_LABEL, teamStrength } from '../engine/league';
import { teamInterest, projectedRole } from '../engine/market';
import { offerCapacity, fmtMoney } from '../engine/contracts';
import { positionNeeds } from '../engine/draft';
import { fmtDate } from '../engine/schedule';
import { rngFor } from '../engine/rng';
import { Card, Empty, PageHead } from '../ui/common';

export function Trades() {
  const c = useCareer()!;
  const u = userOf(c);
  const t = teamOf(c);
  const L = c.league;
  const rng = rngFor(c.seed, 'interest-view', L.season, Math.floor(L.day / 14));
  const interest = Object.keys(L.teams)
    .filter((id) => id !== u.teamId)
    .map((id) => ({ id, s: teamInterest(L, id, u, c, rng), need: positionNeeds(L, id)[u.pos], cap: offerCapacity(L, id) }))
    .sort((a, b) => b.s - a.s);
  const beforeDeadline = c.phase === 'regular' && L.day < L.deadlineDay - 2;
  const canRequest = onNbaRoster(c) && !c.tradeRequested && (beforeDeadline || c.phase === 'preseason');
  const level = (s: number) => (s > 8 ? { l: 'Muy alto', cls: 'good' } : s > 3 ? { l: 'Alto', cls: 'good' } : s > -2 ? { l: 'Moderado', cls: 'accent' } : { l: 'Bajo', cls: 'bad' });
  return (
    <>
      <PageHead eyebrow="Traspasos y ofertas" title="Mercado" desc={`Fecha límite de traspasos: ${fmtDate(L.season, L.deadlineDay)}. Las ofertas por ti llegan los días previos; si pides el traspaso, la decisión final será tuya.`} />
      <div className="grid g3">
        <Card title="Tu situación" icon="swap">
          {t ? (
            <>
              <p className="small">{teamName(L, t.id)} · {STATUS_LABEL[t.status]} · {t.w}-{t.l}</p>
              <p className="small muted" style={{ marginTop: 8 }}>{c.tradeRequested ? 'Has pedido el traspaso. La directiva escuchará ofertas antes de la fecha límite.' : 'No has pedido el traspaso.'}</p>
              <button className="btn danger" style={{ marginTop: 12 }} disabled={!canRequest} onClick={() => { if (confirm('Pedir el traspaso dañará tu relación con el vestuario y la afición. ¿Continuar?')) { store.act(api.requestTrade); store.toast('Petición de traspaso enviada.'); } }}>Pedir el traspaso</button>
              {!canRequest && !c.tradeRequested && <p className="tiny dim" style={{ marginTop: 8 }}>Solo puedes pedirlo en pretemporada o antes de la fecha límite, estando en la plantilla NBA.</p>}
              <div className="divider" />
              <p className="tiny dim">Factores que pesan: minutos disponibles, salario, competitividad, tu rol, el entrenador, opciones de anillo, tu lealtad y el interés real de otras franquicias. Ningún equipo puede ficharte si no le encaja o no tiene margen.</p>
            </>
          ) : <Empty icon="🔁" title="Sin equipo NBA">Los traspasos se activan cuando formas parte de una plantilla.</Empty>}
        </Card>
        <Card title="Interés de las franquicias" icon="people" className="span2">
          <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="t">
              <thead><tr><th className="l">Equipo</th><th className="l">Situación</th><th>Nivel</th><th className="l">Rol para ti</th><th className="l">Necesidad {u.pos}</th><th className="l">Capacidad</th><th>Interés</th></tr></thead>
              <tbody>
                {interest.map((x) => {
                  const tm = L.teams[x.id];
                  const lv = level(x.s);
                  return (
                    <tr key={x.id}>
                      <td className="l"><span className="row"><span className="team-dot" style={{ background: tm.color }} />{teamName(L, x.id)}</span></td>
                      <td className="l small">{STATUS_LABEL[tm.status]}</td>
                      <td>{teamStrength(L, x.id).toFixed(1)}</td>
                      <td className="l small">{projectedRole(L, x.id, u)}</td>
                      <td className="l small">{x.need > 2 ? 'Urgente' : x.need > 0 ? 'Media' : 'Cubierta'}</td>
                      <td className="l small">{fmtMoney(x.cap.amount)} <span className="dim">({x.cap.via})</span></td>
                      <td><span className={`chip ${lv.cls}`}>{lv.l}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
