// Scene artwork for events and phases: 22 original vector illustrations (step 4.1b).
// No stock photos, no SVG filters, no emoji; gradient ids are unique per instance.
import { useId, type ReactNode } from 'react';
import type { SceneKind } from './art/types';
import { TrophyRoomArt } from './art/trophy';

export type { SceneKind } from './art/types';

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

/** 5-stop metal gradient (dark → mid → white .9 → mid → dark). */
function Metal({ id, dark, mid, angle = 20 }: { id: string; dark: string; mid: string; angle?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" gradientTransform={`rotate(${angle} 0.5 0.5)`}>
      <stop offset="0" stopColor={dark} />
      <stop offset="0.25" stopColor={mid} />
      <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="0.75" stopColor={mid} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
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

/** Hanging scoreboard (tablero) seen from the court. */
const Scoreboard = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <line x1="30" y1="-18" x2="30" y2="0" stroke="#475569" strokeWidth="2" />
    <line x1="70" y1="-18" x2="70" y2="0" stroke="#475569" strokeWidth="2" />
    <rect x="0" y="0" width="100" height="34" rx="4" fill="#030712" stroke="#374151" strokeWidth="2" />
    <text x="30" y="24" textAnchor="middle" fontSize="20" fontWeight="900" fill="#ef4444" fontFamily="monospace">98</text>
    <text x="70" y="24" textAnchor="middle" fontSize="20" fontWeight="900" fill="#facc15" fontFamily="monospace">97</text>
  </g>
);

/** Backboard + rim + net, facing the viewer. */
const Hoop = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-34" y="-30" width="68" height="46" rx="3" fill="#e2e8f0" fillOpacity="0.28" stroke="#f8fafc" strokeWidth="2.5" />
    <rect x="-14" y="-10" width="28" height="20" fill="none" stroke="#f8fafc" strokeWidth="2" />
    <rect x="-20" y="16" width="40" height="5" rx="2.5" fill="#ef4444" />
    <path d="M-16 21 l3 18 M-8 21 l1.5 20 M0 21 v20 M8 21 l-1.5 20 M16 21 l-3 18" stroke="#f1f5f9" strokeWidth="1.4" fill="none" opacity="0.9" />
    <path d="M-16 39 q8 6 16 5 q8 1 16 -5" stroke="#f1f5f9" strokeWidth="1.2" fill="none" opacity="0.8" />
  </g>
);

function Art({ kind, id }: { kind: SceneKind; id: string }) {
  switch (kind) {
    case 'arena':
      return (
        <g>
          <Sky id={id} top="#0b1020" bottom="#1e293b" />
          {/* bokeh crowd: two staggered rows of soft circles */}
          {Array.from({ length: 46 }, (_, i) => {
            const x = (i * 23) % 324 - 2;
            const row = i % 3;
            const y = 62 + row * 14 + ((i * 7) % 6);
            return <circle key={`b${i}`} cx={x} cy={y} r={4 + (i % 4)} fill={['#334155', '#475569', '#ef4444', '#f97316', '#facc15'][i % 5]} opacity={0.25 + (i % 5) * 0.08} />;
          })}
          {/* floodlights + beams */}
          {[[50, 12], [160, 8], [270, 12]].map(([x, y], i) => (
            <g key={`f${i}`}>
              <circle cx={x} cy={y} r="7" fill="#fef3c7" />
              <path d={`M${x - 7} ${y + 4} L${x - 46} 118 L${x + 46} 118 L${x + 7} ${y + 4} Z`} fill="#fef9c3" opacity="0.06" />
            </g>
          ))}
          <Scoreboard x={110} y={18} />
          {/* court: wood + lines + glossy reflection */}
          <rect y="112" width="320" height="68" fill={`url(#${id}-wood)`} />
          <ellipse cx="160" cy="150" rx="46" ry="12" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
          <line x1="160" y1="112" x2="160" y2="180" stroke="rgba(255,255,255,.6)" strokeWidth="2" />
          <path d="M40 180 L120 112 L170 112 L70 180 Z" fill="#ffffff" opacity="0.08" />
          <Hoop x={252} y={78} s={0.9} />
          <Ball x={228} y={58} r={9} />
        </g>
      );
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
          <Person x={120} y={150} s={0.9} color="#dc2626" />
          <Person x={200} y={150} s={0.9} color="#2563eb" skin="#e2b48d" />
          <text x="160" y="96" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fde047">VS</text>
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
          <defs>
            <Metal id={`${id}-pen`} dark="#312e81" mid="#6366f1" angle={35} />
          </defs>
          {/* desk */}
          <rect y="100" width="320" height="80" fill="#57534e" />
          <rect y="100" width="320" height="6" fill="#78716c" />
          <path d="M20 180 L90 100 L120 100 L30 180 Z" fill="#ffffff" opacity="0.05" />
          {/* document */}
          <g transform="rotate(-6 155 90)">
            <rect x="80" y="28" width="150" height="122" rx="4" fill="#111827" opacity="0.25" />
            <rect x="76" y="24" width="150" height="122" rx="4" fill="#fafaf9" stroke="#d6d3d1" />
            {Array.from({ length: 7 }, (_, i) => <rect key={i} x="92" y={42 + i * 11} width={i === 6 ? 60 : 112} height="4" rx="2" fill="#a8a29e" />)}
            <path d="M104 128 q14 -14 26 0 t26 -4 q10 -6 16 2" stroke="#1d4ed8" strokeWidth="2.5" fill="none" />
            {/* wax seal */}
            <circle cx="196" cy="122" r="13" fill="#b91c1c" />
            <circle cx="196" cy="122" r="9" fill="none" stroke="#7f1d1d" strokeWidth="2" />
            <path d="M192 122 l3 3 5 -6" stroke="#fecaca" strokeWidth="1.8" fill="none" />
          </g>
          {/* quill pen with metal gradient */}
          <g transform="rotate(35 200 115)">
            <rect x="196" y="70" width="9" height="72" rx="4" fill={`url(#${id}-pen)`} />
            <path d="M197 66 q4 -18 7 -26 q1 14 -1 26 z" fill="#f1f5f9" />
            <path d="M199 142 l1.5 12 1.5 -12 z" fill="#f59e0b" />
          </g>
        </g>
      );
    case 'money':
      return (
        <g>
          <Sky id={id} top="#052e16" bottom="#14532d" />
          <defs>
            <Metal id={`${id}-gold`} dark="#7a4f12" mid="#e9b93f" angle={15} />
          </defs>
          {/* rising chart with area */}
          <path d="M20 118 L70 96 L120 104 L170 66 L220 78 L270 34 L300 40 L300 130 L20 130 Z" fill="#4ade80" opacity="0.12" />
          <path d="M20 118 L70 96 L120 104 L170 66 L220 78 L270 34 L300 40" stroke="#4ade80" strokeWidth="4" fill="none" strokeLinejoin="round" />
          {[[70, 96], [170, 66], [270, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#bbf7d0" stroke="#15803d" strokeWidth="1.5" />)}
          {/* cash bundles (fajos) */}
          {[[36, 148], [96, 152], [66, 136]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 24} y={y - 12} width="48" height="14" rx="2" fill="#166534" stroke="#064e3b" />
              <rect x={x - 24} y={y - 20} width="48" height="10" rx="2" fill="#22c55e" stroke="#064e3b" />
              <rect x={x - 24} y={y - 28} width="48" height="10" rx="2" fill="#4ade80" stroke="#064e3b" />
              <rect x={x - 7} y={y - 28} width="14" height="30" fill="#fde047" stroke="#a16207" />
            </g>
          ))}
          {/* coin stacks with metal */}
          {[[206, 156, 5], [236, 156, 3], [222, 148, 4]].map(([x, y, n], i) => (
            <g key={i}>
              {Array.from({ length: n }, (_, j) => (
                <g key={j}>
                  <ellipse cx={x} cy={y - j * 7} rx="15" ry="5.5" fill={`url(#${id}-gold)`} stroke="#7a4f12" />
                  <ellipse cx={x} cy={y - j * 7 - 2.5} rx="15" ry="5.5" fill={`url(#${id}-gold)`} stroke="#7a4f12" />
                </g>
              ))}
            </g>
          ))}
          {/* loose coin on edge */}
          <g transform="rotate(-14 280 140)">
            <circle cx="280" cy="140" r="13" fill={`url(#${id}-gold)`} stroke="#7a4f12" strokeWidth="1.5" />
            <circle cx="280" cy="140" r="8.5" fill="none" stroke="#7a4f12" strokeWidth="1" opacity="0.7" />
            <path d="M280 134 v12 M276 137 q4 -3 8 0 q-4 3 0 6" stroke="#7a4f12" strokeWidth="1.6" fill="none" />
          </g>
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
          {/* notification bubbles with vector glyphs (no emoji) */}
          {([[60, 50, '#ef4444'], [250, 70, '#3b82f6'], [80, 120, '#22c55e'], [240, 130, '#eab308']] as const).map(([x, y, c], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="14" fill={c} opacity="0.9" />
              {i === 0 && <path d="M0 3 q-3 -3.4 -3 -5.6 q0 -2.6 3 -0.6 q3 -2 3 0.6 q0 2.2 -3 5.6" transform={`translate(${x} ${y})`} fill="#fff" />}
              {i === 1 && <path d={`M${x - 6} ${y} a6 6 0 1 1 2 4.5 M${x - 6} ${y - 4} l0 4.5 l4.5 0`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />}
              {i === 2 && <path d={`M${x} ${y - 6} l1.8 3.7 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z`} fill="#fff" />}
              {i === 3 && <path d={`M${x - 6} ${y - 5} h12 a2 2 0 0 1 2 2 v5 a2 2 0 0 1 -2 2 h-7 l-4 3 v-3 h-1 a2 2 0 0 1 -2 -2 v-5 a2 2 0 0 1 2 -2 z`} fill="#fff" />}
            </g>
          ))}
        </g>
      );
    case 'trophy':
      return <TrophyRoomArt id={id} />;
    case 'draft':
      return (
        <g>
          <Sky id={id} top="#020617" bottom="#1e1b4b" />
          {/* stage spotlights */}
          <path d="M70 0 L30 150 L120 150 Z" fill="#f97316" opacity="0.07" />
          <path d="M160 0 L104 150 L216 150 Z" fill="#fff" opacity="0.09" />
          <path d="M250 0 L200 150 L300 150 Z" fill="#3b82f6" opacity="0.07" />
          {[[70, 10], [160, 6], [250, 10]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="#fef3c7" />)}
          {/* banner */}
          <rect x="40" y="30" width="240" height="38" rx="4" fill="#0f172a" stroke="#334155" />
          <text x="160" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill="#e2e8f0" letterSpacing="3">DRAFT</text>
          {/* podium: three steps */}
          <rect x="96" y="118" width="44" height="34" fill="#1e293b" stroke="#475569" />
          <rect x="92" y="114" width="52" height="6" fill="#334155" />
          <text x="118" y="140" textAnchor="middle" fontSize="14" fontWeight="900" fill="#94a3b8">2</text>
          <rect x="140" y="104" width="48" height="48" fill="#1e293b" stroke="#475569" />
          <rect x="136" y="100" width="56" height="6" fill="#334155" />
          <text x="164" y="132" textAnchor="middle" fontSize="16" fontWeight="900" fill="#facc15">1</text>
          <rect x="188" y="124" width="40" height="28" fill="#1e293b" stroke="#475569" />
          <rect x="184" y="120" width="48" height="6" fill="#334155" />
          <text x="208" y="143" textAnchor="middle" fontSize="12" fontWeight="900" fill="#94a3b8">3</text>
          {/* cap on top of the first-place step */}
          <g transform="translate(164 92)">
            <path d="M-15 4 q15 -12 30 0 l0 3 q-15 8 -30 0 z" fill="#1d4ed8" />
            <path d="M-15 5 q-9 1 -10 6 q12 3 22 -1 z" fill="#1e40af" />
            <circle cx="0" cy="-4" r="2" fill="#facc15" />
          </g>
          <Person x={266} y={148} s={0.75} color="#0f172a" skin="#e2b48d" />
          <rect y="150" width="320" height="30" fill="#0b1020" />
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
          <defs>
            <Metal id={`${id}-gold`} dark="#7a4f12" mid="#e9b93f" angle={30} />
          </defs>
          {/* flag poles + waving flags */}
          {Array.from({ length: 6 }, (_, i) => {
            const x = 12 + i * 52;
            const c = ['#dc2626', '#facc15', '#16a34a', '#f8fafc', '#0ea5e9', '#f97316'][i];
            return (
              <g key={i}>
                <rect x={x + 38} y="16" width="3" height="84" fill="#cbd5e1" />
                <circle cx={x + 39.5} cy="15" r="2.5" fill="#e2e8f0" />
                <path d={`M${x} 20 q10 -6 20 -2 q10 4 20 0 l0 24 q-10 4 -20 0 q-10 -4 -20 2 z`} fill={c} opacity="0.9" />
                <path d={`M${x} 20 q10 -6 20 -2 q10 4 20 0`} stroke="#0f172a" strokeWidth="1" fill="none" opacity="0.25" />
              </g>
            );
          })}
          {/* gold medal with ribbon */}
          <path d="M138 92 l10 22 M182 92 l-10 22" stroke="#b91c1c" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M146 92 l8 18 M174 92 l-8 18" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
          <circle cx="160" cy="136" r="26" fill={`url(#${id}-gold)`} stroke="#7a4f12" strokeWidth="2" />
          <circle cx="160" cy="136" r="19" fill="none" stroke="#7a4f12" strokeWidth="1.4" opacity="0.8" />
          <path d="M160 124 l2.8 5.8 6.4 .9 -4.6 4.5 1.1 6.4 -5.7 -3 -5.7 3 1.1 -6.4 -4.6 -4.5 6.4 -.9 z" fill="#6b4409" opacity="0.85" />
          <path d="M145 126 a20 20 0 0 1 8 -6" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
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
          <defs>
            <Metal id={`${id}-clock`} dark="#4b5563" mid="#cbd5e1" angle={45} />
          </defs>
          {/* countdown scoreboard */}
          <rect x="20" y="22" width="150" height="64" rx="6" fill="#030712" stroke="#374151" strokeWidth="3" />
          <text x="58" y="56" textAnchor="middle" fontSize="26" fontWeight="900" fill="#ef4444" fontFamily="monospace">98</text>
          <text x="132" y="56" textAnchor="middle" fontSize="26" fontWeight="900" fill="#ef4444" fontFamily="monospace">98</text>
          <text x="95" y="78" textAnchor="middle" fontSize="16" fontWeight="900" fill="#facc15" fontFamily="monospace">0.4</text>
          {/* stopwatch */}
          <g transform="translate(238 44)">
            <rect x="-5" y="-34" width="10" height="7" rx="2" fill={`url(#${id}-clock)`} />
            <circle cx="0" cy="0" r="26" fill="#0f172a" stroke={`url(#${id}-clock)`} strokeWidth="5" />
            <circle cx="0" cy="0" r="19" fill="none" stroke="#64748b" strokeWidth="1" opacity="0.6" />
            {[0, 3, 6, 9].map((k) => {
              const a = (k * Math.PI) / 6;
              return <line key={k} x1={Math.sin(a) * 15} y1={-Math.cos(a) * 15} x2={Math.sin(a) * 19} y2={-Math.cos(a) * 19} stroke="#94a3b8" strokeWidth="2" />;
            })}
            <path d="M0 0 L11 -9" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M0 0 L-4 -13" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2.5" fill="#f8fafc" />
            <path d="M-14 -14 a20 20 0 0 1 9 -5" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.4" strokeLinecap="round" />
          </g>
          {/* court + hoop + shot arc */}
          <rect y="120" width="320" height="60" fill={`url(#${id}-wood)`} />
          <Hoop x={262} y={72} s={0.62} />
          <path d="M96 118 Q180 22 252 74" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 6" fill="none" />
          <circle cx="252" cy="74" r="4" fill="#fde047" opacity="0.9" />
          <Ball x={172} y={48} r={9} />
          <Person x={86} y={158} s={0.8} color="#f97316" />
        </g>
      );
    case 'contest':
      return (
        <g>
          <Sky id={id} top="#172554" bottom="#1d4ed8" />
          {/* arena bokeh + spot */}
          {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 47) % 320} cy={(i * 23) % 90} r={2 + (i % 3)} fill="#fff" opacity="0.35" />)}
          <path d="M160 0 L96 120 L224 120 Z" fill="#fef9c3" opacity="0.07" />
          <rect y="120" width="320" height="60" fill={`url(#${id}-wood)`} />
          {/* three-point arc + court line */}
          <path d="M36 180 A130 96 0 0 1 284 180" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="3" />
          <line x1="160" y1="120" x2="160" y2="180" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
          {/* hoop */}
          <Hoop x={160} y={84} s={0.8} />
          {/* ball rack with 5 balls */}
          <rect x="86" y="98" width="148" height="7" rx="3" fill="#9ca3af" />
          <rect x="92" y="105" width="6" height="20" fill="#6b7280" />
          <rect x="222" y="105" width="6" height="20" fill="#6b7280" />
          {[0, 1, 2, 3, 4].map((i) => <Ball key={i} x={104 + i * 28} y={90} r={11} />)}
          {/* a ball mid-air toward the hoop */}
          <Ball x={198} y={52} r={8} />
          <path d="M204 58 Q220 44 232 56" stroke="#fde047" strokeWidth="1.6" strokeDasharray="3 4" fill="none" opacity="0.8" />
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
          <defs>
            <linearGradient id={`${id}-sign`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fde047" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          {/* skyline with lit windows */}
          {[[20, 70, 30], [56, 50, 36], [96, 80, 26], [126, 40, 40], [170, 64, 30], [204, 30, 34], [242, 72, 28], [274, 56, 40]].map(([x, h, w], i) => (
            <g key={i}>
              <rect x={x} y={140 - h - 20} width={w} height={h + 20} fill="#431407" opacity={0.6 + (i % 3) * 0.12} />
              {Array.from({ length: 4 }, (_, j) => (
                <rect key={j} x={x + 5 + (j % 2) * Math.max(6, w / 2)} y={128 - Math.floor(j / 2) * 14} width="5" height="7" fill="#fde68a" opacity={0.35 + ((i + j) % 4) * 0.15} />
              ))}
            </g>
          ))}
          <path d="M140 52 L146 22 L152 52" fill="#431407" />
          <circle cx="146" cy="20" r="3" fill="#fde68a" />
          {/* club sign (cartel) */}
          <g>
            <rect x="196" y="66" width="80" height="26" rx="4" fill={`url(#${id}-sign)`} stroke="#78350f" strokeWidth="2" />
            <rect x="233" y="92" width="4" height="18" fill="#78350f" />
            <circle cx="212" cy="79" r="8" fill="#78350f" />
            <path d="M204 79 h16 M212 71 v16 M206.4 73.4 q5.6 5.6 0 11.2 M217.6 73.4 q-5.6 5.6 0 11.2" stroke="#fde68a" strokeWidth="1.2" fill="none" />
            <rect x="226" y="74" width="40" height="4" rx="2" fill="#78350f" opacity="0.75" />
            <rect x="226" y="82" width="30" height="4" rx="2" fill="#78350f" opacity="0.55" />
          </g>
          <rect y="140" width="320" height="40" fill="#292524" />
          <path d="M30 180 L90 140 L114 140 L40 180 Z" fill="#ffffff" opacity="0.05" />
          <Ball x={290} y={154} r={10} />
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
  return (
    <div className={`scene ${still ? '' : 'live'} ${className ?? ''}`} style={{ height }}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <Art kind={kind} id={`s${raw}`} />
      </svg>
      <div className="scene-shade" />
      {children && <div className="scene-content">{children}</div>}
    </div>
  );
}
