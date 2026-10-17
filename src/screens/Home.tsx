import { Link, useNavigate } from 'react-router-dom';
import { listSlots, loadCareer, store, useCareer } from '../store/store';
import { Icon } from '../ui/icons';
import { Avatar } from '../ui/PlayerCard';
import { userOf } from '../engine/career';
import { fullName } from '../engine/players';
import { PHASE_LABEL, MODE_LABEL } from '../ui/common';

function Court() {
  return (
    <svg className="court" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="3">
        <rect x="60" y="60" width="1080" height="680" rx="8" />
        <line x1="600" y1="60" x2="600" y2="740" />
        <circle cx="600" cy="400" r="90" />
        <rect x="60" y="270" width="230" height="260" />
        <rect x="910" y="270" width="230" height="260" />
        <path d="M60 130 H200 A300 300 0 0 1 200 670 H60" />
        <path d="M1140 130 H1000 A300 300 0 0 0 1000 670 H1140" />
      </g>
      <circle cx="980" cy="160" r="220" fill="rgba(255,107,26,.07)" />
    </svg>
  );
}

export function Home() {
  const c = useCareer();
  const nav = useNavigate();
  const slots = listSlots();
  const resume = () => {
    if (!c) return;
    nav(c.phase === 'predraft' ? '/draft' : c.phase === 'signing' ? '/signing' : c.phase === 'retired' ? '/retirement' : '/career');
  };
  return (
    <div className="hero">
      <Court />
      <div className="hero-copy anim-in">
        <div className="row" style={{ gap: 10 }}>
          <div className="brand-mark"><Icon name="ball" size={20} /></div>
          <span className="eyebrow">Simulador de carrera profesional</span>
        </div>
        <h1>NBA <span>Legacy</span></h1>
        <p className="lead">Crea a tu jugador, sobrevive al draft y construye una carrera irrepetible: minutos que hay que ganarse, contratos, lesiones, traspasos, anillos y un legado que puede acabar en el Hall of Fame… o no.</p>
        <div className="row wrap" style={{ gap: 12 }}>
          {c && (
            <button className="btn primary lg" onClick={resume}>
              <Icon name="play" /> Continuar: {fullName(userOf(c))}
            </button>
          )}
          <Link to="/new" className={`btn lg ${c ? '' : 'primary'}`}><Icon name="star" /> Nueva carrera</Link>
          <Link to="/daily" className="btn lg"><Icon name="sun" /> Desafío diario</Link>
        </div>
        {c && <p className="small dim">{MODE_LABEL[c.mode]} · {PHASE_LABEL[c.phase]} · OVR {userOf(c).ovr}</p>}
        <div className="feature-list">
          <div><Icon name="calendar" /><span><b>Liga completa simulada</b>30 franquicias, 82 partidos, Play-In y playoffs al mejor de 7.</span></div>
          <div><Icon name="target" /><span><b>Draft con lotería real</b>Combine, entrevistas, mock draft y el formato 3-2-1.</span></div>
          <div><Icon name="contract" /><span><b>Contratos y tope salarial</b>Cifras 2026-27, MLE, aprons, two-way y agencia libre.</span></div>
          <div><Icon name="bolt" /><span><b>Decisiones con consecuencias</b>Más de 60 acontecimientos que cambian tu carrera.</span></div>
        </div>
        <div className="row wrap small" style={{ gap: 14 }}>
          {slots.length > 0 && <Link to="/saves" className="muted"><Icon name="save" size={14} /> Partidas guardadas ({slots.length})</Link>}
          <Link to="/achievements" className="muted"><Icon name="medal" size={14} /> Logros</Link>
          <Link to="/settings" className="muted"><Icon name="gear" size={14} /> Ajustes y accesibilidad</Link>
        </div>
        {!c && slots.length > 0 && (
          <div className="card flat" style={{ padding: 14 }}>
            <div className="tiny dim" style={{ marginBottom: 6 }}>Última partida</div>
            <button className="btn ghost" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={() => { const s = loadCareer(slots[0].id); if (s) { store.setCareer(s, false); nav('/career'); } }}>
              {slots[0].name} — {slots[0].detail}
            </button>
          </div>
        )}
        <p className="tiny dim">Proyecto de fans sin afiliación con la NBA. Los nombres de franquicias se usan solo como referencia; todos los jugadores, entrenadores y agentes son ficticios.</p>
      </div>
      <div className="hero-side anim-in" style={{ animationDelay: '0.1s' }}>
        <HeroCard />
      </div>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="pcard" style={{ width: 'min(380px, 100%)', ['--team' as string]: '#ff6b1a' }} data-num="23">
      <div className="pcard-top">
        <Avatar skin={3} hair={1} color="#ff6b1a" number={23} size={110} />
        <div>
          <span className="chip accent">#23 · SF</span>
          <div className="pname" style={{ marginTop: 6 }}><small>Tu nombre</small>Aquí</div>
        </div>
      </div>
      <div className="pmeta">
        <div><small>Draft</small><b>¿Pick 1?</b></div>
        <div><small>Anillos</small><b className="gold">0</b></div>
        <div><small>Legado</small><b className="accent">—</b></div>
      </div>
      <div className="divider" />
      <div className="stack small muted" style={{ position: 'relative' }}>
        <div className="row between"><span>Edad 19 · NCAA</span><span className="chip">Prospecto</span></div>
        <div className="row between"><span>Edad 22 · All-Star</span><span className="chip gold">⭐</span></div>
        <div className="row between"><span>Edad 27 · Campeón</span><span className="chip gold">💍</span></div>
        <div className="row between"><span>Edad 36 · Retirada</span><span className="chip accent">HOF?</span></div>
      </div>
    </div>
  );
}
