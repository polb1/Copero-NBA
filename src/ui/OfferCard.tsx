import type { Career, Offer } from '../engine/types';
import { teamName, STATUS_LABEL, STYLE_LABEL, teamStrength } from '../engine/league';
import { offerSummary } from '../engine/market';
import { capTier, CAP_TIER_LABEL, makeSalaries, fmtMoney } from '../engine/contracts';
import { Icon } from './icons';

const KIND_LABEL: Record<string, string> = {
  rookie: 'Escala de novato', standard: 'Estándar', minimum: 'Mínimo', max: 'Máximo', 'two-way': 'Two-way', exhibit10: 'Exhibit 10', gleague: 'G League', overseas: 'Europa',
};

export function OfferCard({ c, o, onAccept, cta = 'Firmar' }: { c: Career; o: Offer; onAccept: () => void; cta?: string }) {
  const t = c.league.teams[o.teamId];
  const total = makeSalaries(o.salary, o.years, o.raise).reduce((s, v) => s + v, 0);
  return (
    <div className="card" style={{ ['--team' as string]: t?.color ?? 'var(--accent)', borderTop: `3px solid ${t?.color ?? 'var(--accent)'}` }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          {t ? <span className="team-dot" style={{ background: t.color, width: 14, height: 14 }} /> : <span>🌍</span>}
          <div style={{ minWidth: 0 }}>
            <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t ? teamName(c.league, o.teamId) : 'Liga Europea'}</h3>
            {t && <div className="tiny dim">{t.w + t.l > 0 ? `${t.w}-${t.l} · ` : ''}{STATUS_LABEL[t.status]} · {t.coach.name}</div>}
          </div>
        </div>
        <span className="chip accent">{KIND_LABEL[o.kind] ?? o.kind}</span>
      </div>
      <div className="row wrap" style={{ gap: 18, marginBottom: 10 }}>
        <div className="kpi"><span className="v" style={{ fontSize: '1.6rem' }}>{fmtMoney(o.salary)}</span><span className="l">{o.kind === 'overseas' || o.kind === 'gleague' || o.kind === 'two-way' ? 'Salario' : 'Primer año'}</span></div>
        <div className="kpi"><span className="v" style={{ fontSize: '1.6rem' }}>{o.years}</span><span className="l">{o.years === 1 ? 'Año' : 'Años'}</span></div>
        {o.years > 1 && <div className="kpi"><span className="v" style={{ fontSize: '1.6rem' }}>{fmtMoney(total)}</span><span className="l">Total</span></div>}
        <div className="kpi"><span className="v" style={{ fontSize: '1.2rem', paddingTop: 6 }}>{o.role}</span><span className="l">Rol esperado</span></div>
      </div>
      <p className="small muted">{o.note}</p>
      {t && (
        <div className="row wrap tiny dim" style={{ gap: 10, marginTop: 8 }}>
          <span>Nivel de plantilla: {teamStrength(c.league, o.teamId).toFixed(1)}</span>
          <span>Estilo: {STYLE_LABEL[t.coach.style]}</span>
          <span>{CAP_TIER_LABEL[capTier(c.league, o.teamId)]}</span>
        </div>
      )}
      <div className="row between" style={{ marginTop: 14 }}>
        <span className="tiny dim">{offerSummary(o)}</span>
        <button className="btn primary" onClick={onAccept}><Icon name="check" /> {cta}</button>
      </div>
    </div>
  );
}
