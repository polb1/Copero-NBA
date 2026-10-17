import { useNavigate } from 'react-router-dom';
import { store, useCareer } from '../store/store';
import * as api from '../engine/api';
import { userOf } from '../engine/career';
import { teamName } from '../engine/league';
import { RULES } from '../engine/config';
import { Card, PageHead } from '../ui/common';
import { OfferCard } from '../ui/OfferCard';
import { PlayerCard } from '../ui/PlayerCard';

export function Signing() {
  const c = useCareer()!;
  const nav = useNavigate();
  const u = userOf(c);
  if (c.phase !== 'signing') {
    return (
      <Card title="Primer contrato">
        <p className="muted">Ya firmaste tu primer contrato{u.teamId ? ` con ${teamName(c.league, u.teamId)}` : ''}.</p>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={() => nav('/career')}>Ir al panel</button>
      </Card>
    );
  }
  const pick = c.predraft?.userPick;
  const accept = (id: string) => {
    store.act((x) => api.acceptOffer(x, id));
    nav('/career');
  };
  return (
    <>
      <PageHead
        eyebrow="Elección de equipo y contrato inicial"
        title={pick ? `Pick ${pick.pick} · ${teamName(c.league, pick.teamId)}` : 'Busca tu oportunidad'}
        desc={pick ? (pick.round === 1 ? 'Las selecciones de primera ronda firman la escala de novato: dos años garantizados y dos opciones de equipo.' : 'Como elección de segunda ronda, puedes negociar un contrato estándar o aceptar un two-way.') : 'Sin selección en el draft. Elige la vía que mejor encaje con tu desarrollo: minutos, dinero o escaparate.'}
      />
      <div className="grid two-col">
        <div className="grid g2">
          {c.offers.map((o) => <OfferCard key={o.id} c={c} o={o} onAccept={() => accept(o.id)} />)}
          {c.offers.length === 0 && <Card title="Sin ofertas"><p className="muted">Nadie te ofrece contrato. Puedes retirarte o probar suerte el año que viene.</p><button className="btn danger" style={{ marginTop: 10 }} onClick={() => store.act((x) => api.retire(x, 'Sin ofertas para empezar su carrera profesional.'))}>Retirarse</button></Card>}
        </div>
        <aside className="stack">
          <PlayerCard c={c} p={u} teamColor={pick ? c.league.teams[pick.teamId].color : c.profile.look.accent} teamLabel={pick ? teamName(c.league, pick.teamId) : 'Agente libre'} />
          <Card title="Cómo funciona" icon="contract">
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              <li><b>Two-way:</b> alternas filial y NBA, con un máximo de {RULES.twoWayNbaGameLimit} partidos NBA.</li>
              <li><b>Exhibit 10:</b> peleas una plaza en el training camp; si no la ganas, vas al filial.</li>
              <li><b>G League:</b> sin plaza NBA, pero con minutos y escaparate.</li>
              <li><b>Europa:</b> una temporada como protagonista; el verano siguiente vuelves a la agencia libre.</li>
            </ul>
            <p className="tiny dim" style={{ marginTop: 10 }}>{RULES.simplifiedCbaNotice}</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
