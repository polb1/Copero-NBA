import type { Career, Player } from '../engine/types';
import { POS_LABEL, archetypeDef } from '../engine/attributes';
import { fullName } from '../engine/players';
import { flag, natName, cm } from './common';

export const SKINS = ['#f3d2b3', '#e2b48d', '#c98d5f', '#9c6640', '#6e4428', '#4a2c18'];
export const HAIRS = ['Rapado', 'Corto', 'Afro', 'Trenzas', 'Melena', 'Moño'];

export function Avatar({ skin, hair, color, number, size = 120, label }: { skin: number; hair: number; color: string; number: number | string; size?: number; label?: string }) {
  const s = SKINS[skin % SKINS.length];
  const hc = '#16110d';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label ?? 'Avatar del jugador'}>
      <defs>
        <linearGradient id={`jg-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#111" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="#1b1f26" stroke="#323844" />
      {/* jersey */}
      <path d="M22 120c0-22 10-34 24-38l14 10 14-10c14 4 24 16 24 38z" fill={`url(#jg-${color.slice(1)})`} />
      <path d="M46 82l14 10 14-10" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" />
      <text x="60" y="114" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="20" fill="#fff">{number}</text>
      {/* neck + head */}
      <rect x="52" y="64" width="16" height="16" rx="6" fill={s} />
      <ellipse cx="60" cy="48" rx="19" ry="22" fill={s} />
      <ellipse cx="41.5" cy="50" rx="3" ry="5" fill={s} />
      <ellipse cx="78.5" cy="50" rx="3" ry="5" fill={s} />
      {hair === 1 && <path d="M41 44c0-14 8-20 19-20s19 6 19 20c-4-6-10-9-19-9s-15 3-19 9z" fill={hc} />}
      {hair === 2 && <path d="M36 46c-4-18 8-30 24-30s28 12 24 30c-3-7-10-12-24-12s-21 5-24 12z" fill={hc} />}
      {hair === 3 && (
        <g fill={hc}>
          <path d="M40 44c0-14 8-21 20-21s20 7 20 21c-5-5-11-8-20-8s-15 3-20 8z" />
          {[42, 48, 54, 66, 72, 78].map((x) => <rect key={x} x={x - 1.5} y="40" width="3" height="22" rx="1.5" />)}
        </g>
      )}
      {hair === 4 && <path d="M38 50c-2-20 8-28 22-28s24 8 22 28l-2 14c0-14-4-24-20-26-16 2-20 12-20 26z" fill={hc} />}
      {hair === 5 && (
        <g fill={hc}>
          <path d="M41 44c0-14 8-20 19-20s19 6 19 20c-4-6-10-9-19-9s-15 3-19 9z" />
          <circle cx="60" cy="19" r="7" />
        </g>
      )}
      {/* face */}
      <circle cx="53" cy="50" r="1.8" fill="#1a1410" />
      <circle cx="67" cy="50" r="1.8" fill="#1a1410" />
      <path d="M55 59c3 2 7 2 10 0" stroke="#1a1410" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M50 45h6M64 45h6" stroke={hc} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function OvrRing({ ovr, pot, size = 84 }: { ovr: number; pot?: number; size?: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pctO = Math.max(0, (ovr - 40) / 59);
  const pctP = pot ? Math.max(0, (pot - 40) / 59) : 0;
  return (
    <div className="ovr-ring" style={{ width: size, height: size }} aria-label={`OVR ${ovr}${pot ? `, potencial ${pot}` : ''}`}>
      <svg viewBox="0 0 84 84" width={size} height={size}>
        <circle cx="42" cy="42" r={r} stroke="#262b34" strokeWidth="7" fill="none" />
        {pot && <circle cx="42" cy="42" r={r} stroke="rgba(255,145,71,.28)" strokeWidth="7" fill="none" strokeDasharray={`${c * pctP} ${c}`} strokeLinecap="round" />}
        <circle cx="42" cy="42" r={r} stroke={ovr >= 80 ? '#f5c451' : 'var(--accent)'} strokeWidth="7" fill="none" strokeDasharray={`${c * pctO} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray .8s var(--ease)' }} />
      </svg>
      <div className="v"><div><b>{ovr}</b><small>OVR</small></div></div>
    </div>
  );
}

export function PlayerCard({ c, p, teamColor, teamLabel, compact }: { c: Career; p: Player; teamColor: string; teamLabel: string; compact?: boolean }) {
  const look = c.profile.look;
  return (
    <div className="pcard" style={{ ['--team' as string]: teamColor }} data-num={c.profile.number}>
      <div className="pcard-top">
        <Avatar skin={look.skin} hair={look.hair} color={teamColor} number={c.profile.number} size={compact ? 76 : 96} label={`Avatar de ${fullName(p)}`} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 6, marginBottom: 4 }}>
            <span title={natName(p.nat)} style={{ fontSize: '1.1rem' }}>{flag(p.nat)}</span>
            <span className="chip accent">#{c.profile.number} · {p.pos}</span>
          </div>
          <div className="pname">
            <small>{p.first}</small>
            {p.last}
          </div>
          <div className="small muted" style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamLabel}</div>
        </div>
        <OvrRing ovr={p.ovr} pot={p.pot} size={compact ? 70 : 84} />
      </div>
      {!compact && (
        <div className="pmeta">
          <div><small>Edad</small><b>{p.age}</b></div>
          <div><small>Potencial</small><b className="accent">{p.pot}</b></div>
          <div><small>Pro</small><b>{p.yearsPro} {p.yearsPro === 1 ? 'año' : 'años'}</b></div>
          <div><small>Posición</small><b>{POS_LABEL[p.pos]}</b></div>
          <div><small>Arquetipo</small><b style={{ fontSize: '0.98rem' }}>{archetypeDef(p.arch).label}</b></div>
          <div><small>Altura</small><b>{cm(p.height)}</b></div>
        </div>
      )}
    </div>
  );
}
