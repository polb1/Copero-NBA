// Building blocks for the simple (single-screen) interface.
import { useState } from 'react';
import type { Pos } from '../engine/types';
import { logoUrl } from '../data/logos';

export function Jersey({ name, number, color = '#c2410c', trim = '#1e293b', text = '#fde047', size = 240 }: { name: string; number: number | string; color?: string; trim?: string; text?: string; size?: number }) {
  const label = (name || 'APELLIDO').toUpperCase().slice(0, 12);
  const fs = label.length > 9 ? 17 : 21;
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} role="img" aria-label={`Camiseta ${label} ${number}`}>
      <defs>
        <linearGradient id="jersey-shade" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {/* Basketball tank top */}
      <path d="M78 22 Q120 58 162 22 L186 30 Q182 74 204 96 L204 224 Q120 234 36 224 L36 96 Q58 74 54 30 Z" fill={color} />
      <path d="M78 22 Q120 58 162 22 L186 30 Q182 74 204 96 L204 224 Q120 234 36 224 L36 96 Q58 74 54 30 Z" fill="url(#jersey-shade)" />
      <path d="M78 22 Q120 58 162 22" fill="none" stroke={trim} strokeWidth="8" strokeLinecap="round" />
      <path d="M54 30 Q58 74 36 96" fill="none" stroke={trim} strokeWidth="8" strokeLinecap="round" />
      <path d="M186 30 Q182 74 204 96" fill="none" stroke={trim} strokeWidth="8" strokeLinecap="round" />
      <text x="120" y="92" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize={fs} fill={text} letterSpacing="1">{label}</text>
      <text x="120" y="176" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="88" fill={text} stroke={trim} strokeWidth="1.5">{number}</text>
    </svg>
  );
}

/** Team logo (official, from the league CDN) with an original crest as fallback. */
export function TeamBadge({ id, color, size = 64 }: { id: string; color: string; size?: number }) {
  const url = logoUrl(id);
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return <img className="team-logo" src={url} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} style={{ width: size, height: size }} />;
  }
  return <TeamCrest id={id} color={color} size={size} />;
}

export function TeamCrest({ id, color, size = 64 }: { id: string; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.12} aria-hidden="true">
      <path d="M32 2 L60 12 L58 40 Q54 60 32 70 Q10 60 6 40 L4 12 Z" fill={color} stroke="rgba(255,255,255,.75)" strokeWidth="2.5" />
      <path d="M32 8 L54 16 L52 40 Q48 56 32 64 Q16 56 12 40 L10 16 Z" fill="rgba(0,0,0,.18)" />
      <text x="32" y="44" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="19" fill="#fff">{id}</text>
    </svg>
  );
}

const SPOTS: Record<Pos, { x: number; y: number; label: string }> = {
  PG: { x: 120, y: 236, label: 'Base' },
  SG: { x: 206, y: 196, label: 'Escolta' },
  SF: { x: 34, y: 196, label: 'Alero' },
  PF: { x: 168, y: 118, label: 'Ala-pívot' },
  C: { x: 84, y: 82, label: 'Pívot' },
};

export function CourtPicker({ value, onChange }: { value: Pos; onChange: (p: Pos) => void }) {
  return (
    <div className="court-pick">
      <svg viewBox="0 0 240 280" width="100%" aria-hidden="true">
        <rect x="2" y="2" width="236" height="276" rx="6" fill="#7c4a24" />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={2 + i * 20} y="2" width="10" height="276" fill="rgba(0,0,0,.05)" />)}
        <g fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2">
          <rect x="2" y="2" width="236" height="276" rx="6" />
          <rect x="80" y="2" width="80" height="112" fill="rgba(255,107,26,.25)" />
          <path d="M80 114 A40 40 0 0 0 160 114" />
          <path d="M18 2 V58 A102 102 0 0 0 222 58 V2" />
          <path d="M84 278 A36 36 0 0 1 156 278" />
          <line x1="104" y1="22" x2="136" y2="22" />
        </g>
        <circle cx="120" cy="30" r="7" fill="none" stroke="#ff6b1a" strokeWidth="2.5" />
      </svg>
      {(Object.keys(SPOTS) as Pos[]).map((p) => (
        <button
          key={p}
          type="button"
          className={`spot ${value === p ? 'on' : ''}`}
          style={{ left: `${(SPOTS[p].x / 240) * 100}%`, top: `${(SPOTS[p].y / 280) * 100}%` }}
          aria-pressed={value === p}
          aria-label={`${p} · ${SPOTS[p].label}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/** Card colours by OVR: gold from 80, silver 70-79, orange 60-69, bronze below. */
export const GOLD_OVR = 80;
export function ovrTone(ovr: number) {
  if (ovr >= GOLD_OVR) return 'linear-gradient(160deg, #fff3b0 0%, #f5c451 35%, #c9971c 70%, #8a6410 100%)';
  if (ovr >= 70) return 'linear-gradient(160deg, #e2e8f0, #94a3b8 55%, #475569)';
  if (ovr >= 60) return 'linear-gradient(160deg, #fb923c, #c2410c)';
  return 'linear-gradient(160deg, #d97706, #92400e)';
}

export const CATEGORY_ICON: Record<string, string> = {
  training: '🏋️', minutes: '⏱️', coach: '📋', teammates: '🤝', agent: '💼', contract: '📝', trade: '🔁', injury: '🩹',
  rest: '😴', media: '🎙️', rivalry: '⚔️', personal: '🏠', national: '🌍', sponsor: '👟', social: '📱', locker: '🚪',
  coachChange: '🔄', goals: '🎯', money: '💰', career: '🏁', draft: '🎓',
};
