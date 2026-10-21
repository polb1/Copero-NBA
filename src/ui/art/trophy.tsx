// Trophy room scene (step 4.1b): dark hall, glass display case, big central cup with a
// 5-stop metal gradient, two side trophies, a medal accent, floor reflection and
// deterministic gold confetti. No SVG filters, no text, no emoji; ids prefixed with `id`.
import type { ReactNode } from 'react';

function MetalDefs({ id }: { id: string }) {
  return (
    <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(20 0.5 0.5)">
      <stop offset="0" stopColor="#6b4409" />
      <stop offset="0.25" stopColor="#d99a2b" />
      <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="0.75" stopColor="#d99a2b" />
      <stop offset="1" stopColor="#6b4409" />
    </linearGradient>
  );
}

/** Big central cup: bowl, handles, stem, base, specular arc, elliptical shadow. */
function BigCup({ id, cx, base }: { id: string; cx: number; base: number }) {
  const m = `url(#${id}-metal)`;
  return (
    <g>
      <ellipse cx={cx} cy={base + 2} rx="26" ry="5" fill="#000000" opacity="0.45" />
      {/* bowl */}
      <path d={`M${cx - 22} ${base - 68} h44 v18 q0 28 -22 32 q-22 -4 -22 -32 z`} fill={m} />
      {/* handles */}
      <path d={`M${cx - 22} ${base - 62} q-18 0 -15 15 q3 12 15 13`} fill="none" stroke={m} strokeWidth="6" strokeLinecap="round" />
      <path d={`M${cx + 22} ${base - 62} q18 0 15 15 q-3 12 -15 13`} fill="none" stroke={m} strokeWidth="6" strokeLinecap="round" />
      {/* specular arc */}
      <path d={`M${cx - 15} ${base - 62} q-4 16 3 26`} fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
      {/* stem + base */}
      <rect x={cx - 6} y={base - 22} width="12" height="12" fill={m} />
      <path d={`M${cx - 16} ${base - 10} h32 l-5 -8 h-22 z`} fill={m} />
      <rect x={cx - 22} y={base - 2} width="44" height="6" rx="1" fill={m} />
      {/* tiny star emblem */}
      <path d={`M${cx} ${base - 56} l1.6 3.3 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5 z`} fill="#7a4f12" opacity="0.85" />
    </g>
  );
}

/** Small side trophy (simplified cup). */
function SmallCup({ id, x, base }: { id: string; x: number; base: number }) {
  const m = `url(#${id}-metal)`;
  return (
    <g>
      <ellipse cx={x} cy={base + 1} rx="12" ry="3" fill="#000000" opacity="0.4" />
      <path d={`M${x - 10} ${base - 30} h20 v9 q0 13 -10 15 q-10 -2 -10 -15 z`} fill={m} />
      <path d={`M${x - 10} ${base - 27} q-9 0 -7 8 q2 6 7 7`} fill="none" stroke={m} strokeWidth="3.4" strokeLinecap="round" />
      <path d={`M${x + 10} ${base - 27} q9 0 7 8 q-2 6 -7 7`} fill="none" stroke={m} strokeWidth="3.4" strokeLinecap="round" />
      <path d={`M${x - 7} ${base - 27} q-2 8 2 13`} fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="1.8" strokeLinecap="round" />
      <rect x={x - 3} y={base - 10} width="6" height="5" fill={m} />
      <rect x={x - 9} y={base - 5} width="18" height="5" rx="1" fill={m} />
    </g>
  );
}

/** Medal / ring accent hanging in the case. */
function Medal({ id, x, y }: { id: string; x: number; y: number }) {
  const m = `url(#${id}-metal)`;
  return (
    <g>
      <path d={`M${x - 6} ${y - 16} l4 10 M${x + 6} ${y - 16} l-4 10`} stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx={x} cy={y} r="8" fill={m} />
      <circle cx={x} cy={y} r="5.4" fill="none" stroke="#6b4409" strokeWidth="0.8" opacity="0.8" />
      <path d={`M${x - 4} ${y - 3.4} a4 4 0 0 1 5 -1`} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/** The whole scene content, reusable for the floor reflection. */
function RoomContent({ id }: { id: string }): ReactNode {
  const m = `url(#${id}-metal)`;
  return (
    <>
      {/* walls + floor */}
      <rect width="320" height="180" fill={`url(#${id}-room)`} />
      <rect width="320" height="180" fill={`url(#${id}-focus)`} />
      <rect y="150" width="320" height="30" fill="#0b0a08" />
      <rect y="148" width="320" height="3" fill="#29241c" />
      {/* pedestal */}
      <rect x="112" y="128" width="96" height="24" fill="#1c1917" />
      <rect x="108" y="124" width="104" height="6" rx="2" fill="#3f3a33" />
      {/* glass case: two transparent panels + metal frame */}
      <rect x="120" y="42" width="80" height="84" fill={`url(#${id}-glass)`} stroke="#57534e" strokeWidth="2" />
      <rect x="116" y="38" width="88" height="5" fill={m} />
      <rect x="118" y="38" width="3" height="90" fill={m} />
      <rect x="199" y="38" width="3" height="90" fill={m} />
      {/* diagonal reflection on the glass */}
      <path d="M132 122 L156 44 L168 44 L144 122 Z" fill="#ffffff" opacity="0.16" />
      {/* contents */}
      <BigCup id={id} cx={160} base={124} />
      <SmallCup id={id} x={137} base={122} />
      <SmallCup id={id} x={184} base={122} />
      <Medal id={id} x={160} y={58} />
      {/* deterministic gold confetti */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 53) % 316 + 2;
        const y = (i * 29) % 120 + 6;
        return (
          <rect
            key={i} x={x} y={y} width="4" height="7" rx="1"
            fill={['#facc15', '#f97316', '#fde68a', '#e5e7eb'][i % 4]}
            opacity={0.35 + (i % 5) * 0.1}
            transform={`rotate(${(i * 37) % 360} ${x + 2} ${y + 3})`}
          />
        );
      })}
    </>
  );
}

/** 320x180 trophy-room scene group. */
export function TrophyRoomArt({ id }: { id: string }) {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-room`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171310" />
          <stop offset="1" stopColor="#2e2418" />
        </linearGradient>
        <radialGradient id={`${id}-focus`} cx="0.5" cy="0.05" r="0.85">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#dbeafe" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#dbeafe" stopOpacity="0.16" />
        </linearGradient>
        <MetalDefs id={id} />
      </defs>
      <RoomContent id={id} />
      {/* floor reflection: mirrored copy of the room around y=150 */}
      <g transform="translate(0 300) scale(1 -1)" opacity="0.16">
        <RoomContent id={id} />
      </g>
    </g>
  );
}
