import { useNavigate } from 'react-router-dom';
import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { teamOf, userOf } from '../engine/career';
import { teamName } from '../engine/league';
import { CAP_TIER_LABEL, capTier, contractEnd, fmtMoney, marketValue, payroll, salaryIn } from '../engine/contracts';
import { RULES, capFor, maxSalary, minSalary, scaled } from '../engine/config';
import { seasonLabel } from '../engine/schedule';
import { Card, Empty, Kpi, PageHead } from '../ui/common';
import { OfferCard } from '../ui/OfferCard';
import { BarChart } from '../ui/charts';

const KIND: Record<string, string> = { rookie: 'Escala de novato', standard: 'Estándar', minimum: 'Mínimo', max: 'Máximo', 'two-way': 'Two-way', exhibit10: 'Exhibit 10', gleague: 'G League', overseas: 'Europa' };

export function Contracts() {
  const c = useCareer()!;
  const nav = useNavigate();
  const u = userOf(c);
  const t = teamOf(c);
  const L = c.league;
  const k = u.contract;
  const needs = api.needsContract(c);
  const pay = t ? payroll(L, t.id) : 0;
  const cap = capFor(L.season);
  const marks = [
    { l: 'Tope', v: cap, color: 'var(--good)' },
    { l: 'Impuesto', v: scaled(RULES.tax, L.season), color: 'var(--warn)' },
    { l: '1.er apron', v: scaled(RULES.apron1, L.season), color: 'var(--accent)' },
    { l: '2.º apron', v: scaled(RULES.apron2, L.season), color: 'var(--bad)' },
  ];
  const scaleMax = scaled(RULES.apron2, L.season) * 1.12;
  const salHist = c.seasons.filter((s) => s.salary > 0);
  return (
    <>
      <PageHead eyebrow="Contratos y agencia" title="Contratos" desc="Tus ingresos personales (salario y patrocinios) son independientes de la nómina de la franquicia, que condiciona a quién puede fichar y retener." />
      {c.phase === 'offseason' && c.offers.length > 0 && (
        <Card title={needs ? 'Ofertas de agencia libre' : 'Propuestas pendientes'} icon="contract" className="hl" style={{ marginBottom: 16 }}>
          <p className="small muted" style={{ marginBottom: 12 }}>{needs ? 'Elige tu próximo destino. Las ofertas dependen de tu valor de mercado, la necesidad de cada equipo en tu posición y su capacidad salarial (espacio o excepción disponible).' : 'Puedes aceptar estas propuestas o seguir con tu contrato actual.'}</p>
          <div className="grid g2">
            {c.offers.map((o) => <OfferCard key={o.id} c={c} o={o} cta={o.id === 'opt-player' ? 'Ejercer opción' : o.id.startsWith('ext-') ? 'Firmar extensión' : 'Firmar'} onAccept={() => { store.act((x) => api.acceptOffer(x, o.id)); store.toast('Contrato firmado.'); }} />)}
          </div>
          {c.offers.some((o) => o.id === 'opt-player') && <p className="tiny dim" style={{ marginTop: 10 }}>Si firmas con otro equipo, renuncias a tu opción de jugador.</p>}
        </Card>
      )}
      {c.phase === 'offseason' && needs && c.offers.length === 0 && (
        <Card title="Sin ofertas" icon="contract" style={{ marginBottom: 16 }}>
          <p className="muted">Ningún equipo te ha hecho una oferta este verano.</p>
          <button className="btn danger" style={{ marginTop: 12 }} onClick={() => { store.act((x) => api.retire(x, 'Sin ofertas en la agencia libre.')); nav('/retirement'); }}>Anunciar la retirada</button>
        </Card>
      )}
      <div className="grid g3">
        <Card title="Contrato actual" icon="contract" className="span2">
          {k && !needs ? (
            <>
              <div className="kpis" style={{ marginBottom: 14 }}>
                <Kpi v={fmtMoney(salaryIn(k, L.season))} l={`Salario ${seasonLabel(L.season)}`} tone="accent" />
                <Kpi v={KIND[k.kind] ?? k.kind} l="Tipo" />
                <Kpi v={teamName(L, k.teamId)} l="Equipo" />
                <Kpi v={seasonLabel(contractEnd(k))} l="Hasta" />
              </div>
              <div className="table-wrap">
                <table className="t">
                  <thead><tr><th className="l">Temporada</th><th>Salario</th><th className="l">Notas</th></tr></thead>
                  <tbody>
                    {k.salaries.map((s, i) => {
                      const season = k.startSeason + i;
                      return <tr key={i} className={season === L.season ? 'me' : ''}><td className="l">{seasonLabel(season)}</td><td>{fmtMoney(s)}</td><td className="l small dim">{k.option?.season === season ? `Opción de ${k.option.type === 'player' ? 'jugador' : 'equipo'}` : i < 2 && k.rookieScale ? 'Garantizado (escala de novato)' : ''}</td></tr>;
                    })}
                    <tr><td className="l"><b>Total</b></td><td><b>{fmtMoney(k.salaries.reduce((s, v) => s + v, 0))}</b></td><td /></tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : <Empty icon="📝" title={needs ? 'Sin contrato vigente' : 'Sin contrato NBA'}>{c.satellite ? `Jugando en ${c.satellite.teamName}.` : 'Busca equipo en la agencia libre.'}</Empty>}
        </Card>
        <Card title="Finanzas personales" icon="star">
          <div className="kpis">
            <Kpi v={fmtMoney(c.earnings)} l="Ganancias de carrera" tone="gold" />
            <Kpi v={fmtMoney(c.endorsement)} l="Patrocinios / año" />
            <Kpi v={fmtMoney(marketValue(u, L.season))} l="Valor de mercado" />
          </div>
          <div className="divider" />
          <div className="small"><span className="muted">Agente:</span> <b>{c.agent.name}</b>{c.flags.agentUpgrade ? ' · agencia de primer nivel' : ''}</div>
          <div className="small muted" style={{ marginTop: 6 }}>Máximo actual para tu experiencia: {fmtMoney(maxSalary(u.yearsPro, L.season))} · Mínimo: {fmtMoney(minSalary(u.yearsPro, L.season))}</div>
        </Card>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title={t ? `Nómina de ${teamName(L, t.id)}` : 'Tope salarial'} icon="table">
          {t && (
            <>
              <div className="kpis" style={{ marginBottom: 12 }}>
                <Kpi v={fmtMoney(pay)} l="Nómina" />
                <Kpi v={fmtMoney(cap - pay)} l={cap - pay >= 0 ? 'Espacio' : 'Sobre el tope'} tone={cap - pay >= 0 ? 'good' : 'bad'} />
              </div>
              <div style={{ position: 'relative', height: 26, background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (pay / scaleMax) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />
                {marks.map((m) => <div key={m.l} title={`${m.l}: ${fmtMoney(m.v)}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(m.v / scaleMax) * 100}%`, width: 2, background: m.color }} />)}
              </div>
              <div className="row wrap tiny" style={{ gap: 12, marginTop: 8 }}>{marks.map((m) => <span key={m.l} className="row" style={{ gap: 5 }}><span className="team-dot" style={{ background: m.color }} />{m.l} {fmtMoney(m.v)}</span>)}</div>
              <p className="small muted" style={{ marginTop: 10 }}>Situación: <b>{CAP_TIER_LABEL[capTier(L, t.id)]}</b>.</p>
            </>
          )}
          <p className="tiny dim" style={{ marginTop: 10 }}>Cifras {RULES.label} (consultadas el 17/10/2026) proyectadas con un crecimiento anual del {(RULES.capGrowth * 100).toFixed(1)}%. {RULES.simplifiedCbaNotice}</p>
        </Card>
        <Card title="Evolución salarial" icon="chart">
          {salHist.length ? <BarChart labels={salHist.map((s) => seasonLabel(s.season).slice(2))} values={salHist.map((s) => s.salary / 1e6)} format={(v) => `$${v.toFixed(1)}M`} /> : <Empty icon="💵" title="Aún sin historial salarial" />}
        </Card>
      </div>
    </>
  );
}
