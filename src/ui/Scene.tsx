// Scene artwork for events and phases.
// Stock photos (Unsplash License, see docs/CREDITS.md) live in /public/stock. Every scene also has an
// original vector illustration, used as fallback when a photo is missing or fails to load.
import { useId, useState, type ReactNode } from 'react';
import { hashString } from '../engine/rng';

export type SceneKind =
  | 'arena' | 'training' | 'locker' | 'coach' | 'press' | 'medical' | 'contract' | 'money' | 'sneakers'
  | 'phone' | 'trophy' | 'draft' | 'travel' | 'national' | 'summer' | 'family' | 'clutch' | 'contest'
  | 'college' | 'europe' | 'rest' | 'rivalry';

/** Photos per scene (several where available, so repeated scenes don't always look the same). */
export const STOCK_PHOTOS: Partial<Record<SceneKind, string[]>> = {
  arena: ['/stock/arena-1.jpg', '/stock/arena-2.jpg', '/stock/arena-3.jpg'],
  rivalry: ['/stock/rivalry-1.jpg'],
  training: ['/stock/training-1.jpg', '/stock/training-2.jpg', '/stock/training-3.jpg'],
  locker: ['/stock/locker-1.jpg'],
  coach: ['/stock/coach-1.jpg'],
  press: ['/stock/press-1.jpg'],
  medical: ['/stock/medical-1.jpg'],
  contract: ['/stock/contract-1.jpg'],
  money: ['/stock/money-1.jpg'],
  sneakers: ['/stock/sneakers-1.jpg'],
  phone: ['/stock/phone-1.jpg'],
  trophy: ['/stock/trophy-1.jpg', '/stock/trophy-2.jpg'],
  draft: ['/stock/draft-1.jpg', '/stock/draft-2.jpg'],
  travel: ['/stock/travel-1.jpg'],
  national: ['/stock/national-1.jpg'],
  summer: ['/stock/summer-1.jpg', '/stock/summer-2.jpg'],
  family: ['/stock/family-1.jpg'],
  clutch: ['/stock/clutch-1.jpg', '/stock/clutch-2.jpg'],
  contest: ['/stock/contest-1.jpg'],
  college: ['/stock/college-1.jpg'],
  europe: ['/stock/europe-1.jpg'],
  rest: ['/stock/rest-1.jpg'],
};

export function photoFor(kind: SceneKind, variant: string | number = 0): string | undefined {
  const list = STOCK_PHOTOS[kind];
  if (!list?.length) return undefined;
  return list[hashString(String(variant)) % list.length];
}

export const CATEGORY_SCENE: Record<string, SceneKind> = {
  training: 'training', minutes: 'coach', coach: 'coach', teammates: 'locker', agent: 'contract', contract: 'contract',
  trade: 'travel', injury: 'medical', rest: 'rest', media: 'press', rivalry: 'rivalry', personal: 'family', national: 'national',
  sponsor: 'sneakers', social: 'phone', locker: 'locker', coachChange: 'coach', goals: 'training', money: 'money',
  career: 'trophy', draft: 'draft', clutch: 'clutch', contest: 'contest',
};

function Sky({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-wood`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c98a4b" />
          <stop offset="1" stopColor="#7c4a24" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-sky)`} />
      <rect width="320" height="180" fill={`url(#${id}-glow)`} />
    </>
  );
}

const Ball = ({ x, y, r = 12 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#f97316" stroke="#7c2d12" strokeWidth="1.5" />
    <path d={`M${x - r} ${y}h${2 * r}M${x} ${y - r}v${2 * r}M${x - r * 0.7} ${y - r * 0.7}q${r * 0.6} ${r * 0.7} 0 ${r * 1.4}M${x + r * 0.7} ${y - r * 0.7}q${-r * 0.6} ${r * 0.7} 0 ${r * 1.4}`} stroke="#7c2d12" strokeWidth="1.3" fill="none" />
  </g>
);

const Person = ({ x, y, s = 1, color = '#1f2937', skin = '#9c6640' }: { x: number; y: number; s?: number; color?: string; skin?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="-58" r="10" fill={skin} />
    <path d="M-16 -44 Q0 -50 16 -44 L20 -4 L-20 -4 Z" fill={color} />
    <rect x="-14" y="-6" width="11" height="36" rx="4" fill="#111827" />
    <rect x="3" y="-6" width="11" height="36" rx="4" fill="#111827" />
  </g>
);

function Art({ kind, id }: { kind: SceneKind; id: string }) {
  switch (kind) {
    case 'arena':
    case 'rivalry':
      return (
        <g>
          <Sky id={id} top="#0b1020" bottom="#1e293b" />
          {Array.from({ length: 7 }, (_, i) => <circle key={i} cx={20 + i * 47} cy="18" r="5" fill="#fef3c7" opacity="0.9" />)}
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${20 + i * 47} 18 L${i * 47} 120 L${40 + i * 47} 120 Z`} fill="#fef9c3" opacity="0.05" />)}
          {Array.from({ length: 64 }, (_, i) => <circle key={i} cx={(i * 37) % 320} cy={70 + ((i * 13) % 30)} r="3" fill={['#334155', '#475569', '#ef4444', '#f97316'][i % 4]} opacity="0.7" />)}
          <rect y="112" width="320" height="68" fill={`url(#${id}-wood)`} />
          <ellipse cx="160" cy="150" rx="46" ry="12" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
          <line x1="160" y1="112" x2="160" y2="180" stroke="rgba(255,255,255,.6)" strokeWidth="2" />
          {kind === 'rivalry' && <><Person x={120} y={150} s={0.9} color="#dc2626" /><Person x={200} y={150} s={0.9} color="#2563eb" skin="#e2b48d" /><text x="160" y="96" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fde047">VS</text></>}
          {kind === 'arena' && <Ball x={160} y={100} r={11} />}
        </g>
      );
    case 'training':
      return (
        <g>
          <Sky id={id} top="#1f2937" bottom="#374151" />
          <rect x="18" y="30" width="80" height="12" rx="3" fill="#4b5563" />
          {[40, 60, 80].map((x) => <rect key={x} x={x - 30} y="60" width="6" height="52" fill="#6b7280" />)}
          <rect x="0" y="112" width="320" height="68" fill="#111827" />
          <rect x="200" y="96" width="90" height="10" rx="5" fill="#9ca3af" />
          <circle cx="204" cy="101" r="14" fill="#1f2937" stroke="#9ca3af" strokeWidth="3" />
          <circle cx="286" cy="101" r="14" fill="#1f2937" stroke="#9ca3af" strokeWidth="3" />
          <Person x={150} y={132} color="#f97316" />
          <Ball x={110} y={150} r={10} />
          <Ball x={132} y={158} r={8} />
        </g>
      );
    case 'locker':
      return (
        <g>
          <Sky id={id} top="#1e293b" bottom="#0f172a" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect x={10 + i * 52} y="20" width="46" height="110" rx="3" fill="#334155" stroke="#475569" />
              <rect x={18 + i * 52} y="34" width="30" height="4" fill="#64748b" />
              <text x={33 + i * 52} y="80" textAnchor="middle" fontSize="20" fontWeight="900" fill="#f97316" opacity="0.8">{[3, 11, 23, 0, 7, 33][i]}</text>
            </g>
          ))}
          <rect y="130" width="320" height="50" fill="#0b1220" />
          <rect x="40" y="128" width="240" height="10" rx="4" fill="#78350f" />
        </g>
      );
    case 'coach':
      return (
        <g>
          <Sky id={id} top="#14532d" bottom="#052e16" />
          <rect x="40" y="22" width="240" height="120" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="4" />
          <rect x="60" y="36" width="200" height="92" fill="none" stroke="#1f2937" strokeWidth="2" />
          <path d="M60 82 h200 M160 36 v92" stroke="#1f2937" strokeWidth="1.5" />
          <circle cx="160" cy="82" r="14" fill="none" stroke="#1f2937" strokeWidth="1.5" />
          {[[100, 60], [120, 100], [190, 66], [215, 104], [150, 112]].map(([x, y], i) => <text key={i} x={x} y={y} fontSize="14" fontWeight="800" fill="#dc2626">X</text>)}
          {[[86, 70], [140, 56], [200, 90], [230, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="none" stroke="#2563eb" strokeWidth="2.5" />)}
          <path d="M100 64 Q150 40 196 70" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="5 4" />
          <rect y="150" width="320" height="30" fill="#022c22" />
        </g>
      );
    case 'press':
      return (
        <g>
          <Sky id={id} top="#1e1b4b" bottom="#312e81" />
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x={i * 40} y="0" width="40" height="110" fill={i % 2 ? '#3730a3' : '#4338ca'} opacity="0.5" />)}
          {Array.from({ length: 8 }, (_, i) => <text key={i} x={20 + i * 40} y="60" textAnchor="middle" fontSize="11" fontWeight="900" fill="#c7d2fe" opacity="0.5">LIGA</text>)}
          <rect y="110" width="320" height="70" fill="#1f2937" />
          <rect x="70" y="104" width="180" height="16" rx="3" fill="#111827" />
          {[110, 140, 170, 200].map((x, i) => (
            <g key={x}>
              <rect x={x - 2} y={70 + (i % 2) * 6} width="4" height="36" fill="#9ca3af" />
              <rect x={x - 7} y={58 + (i % 2) * 6} width="14" height="18" rx="7" fill="#374151" stroke="#9ca3af" />
              <rect x={x - 9} y={66 + (i % 2) * 6} width="18" height="7" fill={['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'][i]} />
            </g>
          ))}
          {[30, 290].map((x) => <circle key={x} cx={x} cy="40" r="10" fill="#fff" opacity="0.5" />)}
        </g>
      );
    case 'medical':
      return (
        <g>
          <Sky id={id} top="#e0f2fe" bottom="#bae6fd" />
          <rect y="120" width="320" height="60" fill="#cbd5e1" />
          <rect x="60" y="100" width="170" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" />
          <rect x="60" y="124" width="8" height="30" fill="#64748b" />
          <rect x="222" y="124" width="8" height="30" fill="#64748b" />
          <rect x="240" y="30" width="56" height="56" rx="10" fill="#ef4444" />
          <path d="M268 42 v32 M252 58 h32" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
          <path d="M20 60 h40 l10 -18 l12 36 l10 -18 h50" stroke="#16a34a" strokeWidth="3" fill="none" />
          <ellipse cx="120" cy="104" rx="26" ry="8" fill="#fff" />
        </g>
      );
    case 'contract':
      return (
        <g>
          <Sky id={id} top="#292524" bottom="#1c1917" />
          <rect y="100" width="320" height="80" fill="#57534e" />
          <rect x="80" y="30" width="150" height="120" rx="4" fill="#fafaf9" transform="rotate(-6 155 90)" />
          {Array.from({ length: 7 }, (_, i) => <rect key={i} x="98" y={50 + i * 11} width={i === 6 ? 60 : 110} height="4" rx="2" fill="#a8a29e" transform="rotate(-6 155 90)" />)}
          <path d="M120 136 q14 -14 26 0 t26 -4" stroke="#1d4ed8" strokeWidth="2.5" fill="none" transform="rotate(-6 155 90)" />
          <rect x="196" y="80" width="10" height="70" rx="3" fill="#111827" transform="rotate(35 200 115)" />
          <rect x="196" y="140" width="10" height="12" fill="#f59e0b" transform="rotate(35 200 115)" />
        </g>
      );
    case 'money':
      return (
        <g>
          <Sky id={id} top="#052e16" bottom="#14532d" />
          <path d="M30 140 L90 110 L140 120 L200 70 L250 82 L300 36" stroke="#4ade80" strokeWidth="4" fill="none" />
          <path d="M30 140 L90 110 L140 120 L200 70 L250 82 L300 36 L300 160 L30 160 Z" fill="#4ade80" opacity="0.15" />
          {[[70, 150], [96, 150], [83, 138]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="16" ry="6" fill="#facc15" stroke="#a16207" /><ellipse cx={x} cy={y - 4} rx="16" ry="6" fill="#fde047" stroke="#a16207" /></g>)}
          <text x="240" y="150" fontSize="40" fontWeight="900" fill="#bbf7d0" opacity="0.6">$</text>
        </g>
      );
    case 'sneakers':
      return (
        <g>
          <Sky id={id} top="#3b0764" bottom="#7e22ce" />
          <circle cx="160" cy="90" r="70" fill="#a855f7" opacity="0.35" />
          <path d="M70 120 q10 -40 50 -40 l20 16 q30 4 70 14 q30 8 30 24 l-170 0 z" fill="#f8fafc" />
          <path d="M70 134 h170 v8 h-170 z" fill="#f97316" />
          <path d="M150 104 q30 -2 60 12" stroke="#7e22ce" strokeWidth="6" fill="none" />
          {[0, 1, 2].map((i) => <line key={i} x1={118 + i * 10} y1={86 + i * 3} x2={132 + i * 10} y2={96 + i * 3} stroke="#64748b" strokeWidth="2" />)}
          <rect y="146" width="320" height="34" fill="#2e1065" />
        </g>
      );
    case 'phone':
      return (
        <g>
          <Sky id={id} top="#0c4a6e" bottom="#082f49" />
          <rect x="120" y="14" width="80" height="152" rx="12" fill="#111827" stroke="#334155" strokeWidth="3" />
          <rect x="127" y="26" width="66" height="122" rx="4" fill="#1e293b" />
          <rect x="133" y="34" width="54" height="40" rx="3" fill="#f97316" />
          <Ball x={160} y={54} r={10} />
          {[84, 96, 108].map((y) => <rect key={y} x="133" y={y} width={y === 108 ? 30 : 54} height="6" rx="3" fill="#475569" />)}
          {[[60, 50], [250, 70], [80, 120], [240, 130]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="14" fill={['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i]} opacity="0.85" /><text x={x} y={y + 5} textAnchor="middle" fontSize="14" fill="#fff">{['♥', '↻', '★', '💬'][i]}</text></g>)}
        </g>
      );
    case 'trophy':
      return (
        <g>
          <Sky id={id} top="#1c1917" bottom="#44403c" />
          {Array.from({ length: 30 }, (_, i) => <rect key={i} x={(i * 53) % 320} y={(i * 29) % 110} width="5" height="9" fill={['#facc15', '#f97316', '#e5e7eb', '#ef4444'][i % 4]} transform={`rotate(${i * 25} ${(i * 53) % 320} ${(i * 29) % 110})`} />)}
          <path d="M130 40 h60 v20 q0 40 -30 46 q-30 -6 -30 -46 z" fill="#facc15" stroke="#a16207" strokeWidth="2" />
          <path d="M130 48 q-22 0 -18 18 q4 14 22 14 M190 48 q22 0 18 18 q-4 14 -22 14" stroke="#facc15" strokeWidth="6" fill="none" />
          <rect x="152" y="104" width="16" height="22" fill="#ca8a04" />
          <rect x="134" y="126" width="52" height="14" rx="2" fill="#78350f" />
          <Ball x={160} y={34} r={9} />
          <rect y="146" width="320" height="34" fill="#292524" />
        </g>
      );
    case 'draft':
      return (
        <g>
          <Sky id={id} top="#020617" bottom="#1e1b4b" />
          <path d="M160 0 L100 150 L220 150 Z" fill="#fff" opacity="0.08" />
          <path d="M60 0 L20 150 L110 150 Z" fill="#f97316" opacity="0.06" />
          <path d="M260 0 L210 150 L300 150 Z" fill="#3b82f6" opacity="0.06" />
          <rect x="40" y="40" width="240" height="40" rx="4" fill="#0f172a" stroke="#334155" />
          <text x="160" y="67" textAnchor="middle" fontSize="18" fontWeight="900" fill="#e2e8f0" letterSpacing="3">DRAFT</text>
          <rect x="135" y="104" width="50" height="46" fill="#1e293b" stroke="#475569" />
          <rect x="130" y="100" width="60" height="8" fill="#334155" />
          <rect y="150" width="320" height="30" fill="#0b1020" />
          <Person x={230} y={146} s={0.75} color="#0f172a" skin="#e2b48d" />
        </g>
      );
    case 'travel':
      return (
        <g>
          <Sky id={id} top="#0ea5e9" bottom="#bae6fd" />
          {[[60, 40], [230, 30], [270, 80]].map(([x, y], i) => <g key={i} fill="#fff" opacity="0.85"><ellipse cx={x} cy={y} rx="26" ry="10" /><ellipse cx={x + 14} cy={y - 6} rx="16" ry="10" /></g>)}
          <g transform="translate(150 86) rotate(-12)">
            <ellipse cx="0" cy="0" rx="64" ry="11" fill="#f8fafc" stroke="#64748b" />
            <path d="M-10 0 L-34 -38 L-20 -38 L14 0 Z" fill="#cbd5e1" />
            <path d="M-10 4 L-30 34 L-18 34 L12 4 Z" fill="#cbd5e1" />
            <path d="M-56 -4 L-66 -24 L-56 -24 L-46 -4 Z" fill="#f97316" />
            {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={10 + i * 8} cy="-2" r="2.4" fill="#0ea5e9" />)}
          </g>
          <rect y="150" width="320" height="30" fill="#64748b" opacity="0.5" />
        </g>
      );
    case 'national':
      return (
        <g>
          <Sky id={id} top="#1e3a8a" bottom="#1e40af" />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={10 + i * 52} y="20" width="40" height="26" fill={['#dc2626', '#facc15', '#16a34a', '#f8fafc', '#0ea5e9', '#f97316'][i]} opacity="0.85" />)}
          {Array.from({ length: 6 }, (_, i) => <line key={i} x1={10 + i * 52} y1="20" x2={10 + i * 52} y2="70" stroke="#e5e7eb" strokeWidth="2" />)}
          <circle cx="160" cy="110" r="42" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="2" />
          <path d="M140 84 q16 10 4 24 q-10 12 6 22 M176 76 q-8 18 8 26 q14 8 4 24" stroke="#16a34a" strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="160" cy="110" rx="42" ry="16" fill="none" stroke="#e0f2fe" strokeWidth="1.5" />
        </g>
      );
    case 'summer':
      return (
        <g>
          <Sky id={id} top="#f97316" bottom="#fde68a" />
          <circle cx="250" cy="50" r="26" fill="#fef9c3" />
          <rect y="120" width="320" height="60" fill="#0ea5e9" />
          <path d="M0 126 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" strokeWidth="3" fill="none" />
          <path d="M50 120 q-4 -60 20 -80" stroke="#78350f" strokeWidth="6" fill="none" />
          <path d="M70 40 q-30 -4 -40 14 M70 40 q30 -6 40 10 M70 40 q-10 -22 -30 -24 M70 40 q16 -20 34 -16" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
          <Ball x={180} y={124} r={10} />
        </g>
      );
    case 'family':
      return (
        <g>
          <Sky id={id} top="#fdba74" bottom="#fed7aa" />
          <rect y="130" width="320" height="50" fill="#65a30d" />
          <path d="M90 130 V80 L140 46 L190 80 V130 Z" fill="#f8fafc" stroke="#9a3412" strokeWidth="2" />
          <path d="M84 84 L140 40 L196 84" stroke="#9a3412" strokeWidth="8" fill="none" strokeLinecap="round" />
          <rect x="128" y="100" width="24" height="30" fill="#9a3412" />
          <rect x="102" y="90" width="18" height="16" fill="#38bdf8" />
          <rect x="160" y="90" width="18" height="16" fill="#38bdf8" />
          <Person x={240} y={150} s={0.7} color="#2563eb" />
          <Person x={266} y={154} s={0.5} color="#f97316" skin="#e2b48d" />
        </g>
      );
    case 'clutch':
      return (
        <g>
          <Sky id={id} top="#020617" bottom="#111827" />
          <rect x="24" y="26" width="150" height="64" rx="6" fill="#030712" stroke="#374151" strokeWidth="3" />
          <text x="62" y="60" textAnchor="middle" fontSize="26" fontWeight="900" fill="#ef4444" fontFamily="monospace">98</text>
          <text x="136" y="60" textAnchor="middle" fontSize="26" fontWeight="900" fill="#ef4444" fontFamily="monospace">98</text>
          <text x="99" y="82" textAnchor="middle" fontSize="16" fontWeight="900" fill="#facc15" fontFamily="monospace">0.4</text>
          <rect y="120" width="320" height="60" fill={`url(#${id}-wood)`} />
          <rect x="262" y="70" width="6" height="60" fill="#9ca3af" />
          <rect x="238" y="60" width="44" height="30" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <rect x="248" y="88" width="22" height="4" fill="#f97316" />
          <path d="M120 120 Q190 20 256 86" stroke="#fde047" strokeWidth="2" strokeDasharray="4 5" fill="none" />
          <Ball x={196} y={52} r={9} />
          <Person x={110} y={160} s={0.8} color="#f97316" />
        </g>
      );
    case 'contest':
      return (
        <g>
          <Sky id={id} top="#172554" bottom="#1d4ed8" />
          {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 47) % 320} cy={(i * 23) % 90} r="2" fill="#fff" opacity="0.6" />)}
          <rect y="124" width="320" height="56" fill={`url(#${id}-wood)`} />
          <rect x="90" y="96" width="140" height="8" rx="3" fill="#9ca3af" />
          {[0, 1, 2, 3, 4].map((i) => <Ball key={i} x={104 + i * 28} y={86} r={11} />)}
          <rect x="96" y="104" width="6" height="22" fill="#6b7280" />
          <rect x="218" y="104" width="6" height="22" fill="#6b7280" />
          <text x="160" y="56" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fde047" letterSpacing="2">3PT CONTEST</text>
        </g>
      );
    case 'college':
      return (
        <g>
          <Sky id={id} top="#1e3a8a" bottom="#60a5fa" />
          <rect x="70" y="60" width="180" height="80" fill="#e7e5e4" stroke="#78716c" />
          <path d="M60 62 L160 20 L260 62 Z" fill="#a8a29e" stroke="#78716c" />
          {[90, 120, 150, 180, 210].map((x) => <rect key={x} x={x} y="70" width="12" height="70" fill="#d6d3d1" stroke="#a8a29e" />)}
          <rect y="140" width="320" height="40" fill="#15803d" />
          <path d="M150 140 v-20 h20 v20" fill="#78350f" />
        </g>
      );
    case 'europe':
      return (
        <g>
          <Sky id={id} top="#7c2d12" bottom="#fdba74" />
          {[[20, 70, 30], [56, 50, 36], [96, 80, 26], [126, 40, 40], [170, 64, 30], [204, 30, 34], [242, 72, 28], [274, 56, 40]].map(([x, h, w], i) => <rect key={i} x={x} y={140 - h - 20} width={w} height={h + 20} fill="#431407" opacity={0.6 + (i % 3) * 0.12} />)}
          <path d="M140 52 L146 22 L152 52" fill="#431407" />
          <rect y="140" width="320" height="40" fill="#292524" />
          <Ball x={290} y={150} r={10} />
        </g>
      );
    case 'rest':
      return (
        <g>
          <Sky id={id} top="#0f172a" bottom="#312e81" />
          <circle cx="250" cy="44" r="22" fill="#e0e7ff" />
          <circle cx="260" cy="38" r="20" fill="#1e1b4b" />
          {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={(i * 61) % 300} cy={(i * 17) % 80} r="1.6" fill="#fff" />)}
          <rect x="50" y="110" width="200" height="30" rx="8" fill="#4338ca" />
          <rect x="56" y="98" width="50" height="18" rx="8" fill="#e0e7ff" />
          <rect y="140" width="320" height="40" fill="#1e1b4b" />
          <text x="150" y="90" fontSize="18" fontWeight="900" fill="#c7d2fe">z z z</text>
        </g>
      );
  }
}

export function Scene({ kind, variant, height = 150, children, className, still }: { kind: SceneKind; variant?: string | number; height?: number; children?: ReactNode; className?: string; still?: boolean }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const photo = photoFor(kind, variant ?? kind);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div className={`scene ${still ? '' : 'live'} ${className ?? ''}`} style={{ height }}>
      {photo && failed !== photo ? (
        <img key={photo} src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailed(photo)} />
      ) : (
        <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <Art kind={kind} id={`s${raw}`} />
        </svg>
      )}
      <div className="scene-shade" />
      {children && <div className="scene-content">{children}</div>}
    </div>
  );
}
