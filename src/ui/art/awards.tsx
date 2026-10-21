// Original award glyphs (32x32, deterministic, offline). Metal look: 5-stop linear gradient,
// light border, specular arc, base shadow ellipse. No SVG filters, no text, no emoji.
import { useSvgId } from './id';
import type { AwardKind } from './types';

export const AWARD_KINDS: AwardKind[] = [
  'champion', 'mvp', 'fmvp', 'dpoy', 'roy', 'smoy', 'mip', 'allStar',
  'allNba1', 'allNba2', 'allNba3', 'allDef1', 'allDef2', 'threeContest', 'euroChampion', 'euroMvp',
];

type Pal = readonly [string, string, string];

const PALETTES: Record<string, Pal> = {
  gold: ['#7a4f12', '#e9b93f', '#fff7dd'],
  silver: ['#4e5764', '#c9d2dc', '#ffffff'],
  bronze: ['#6d3a18', '#d08a4a', '#ffe9d2'],
  gem: ['#2f4a8f', '#7ea6f0', '#ffffff'],
  green: ['#1f6b3a', '#5fc27a', '#eaffef'],
  energy: ['#8a5a00', '#ffd23f', '#fffbe6'],
  red: ['#7a1f2f', '#d0506a', '#ffe9ee'],
  blue: ['#274a8a', '#5f9ae0', '#eaf3ff'],
};

const STAR24 = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';

/** 5-stop metal gradient: dark → mid → white .9 → mid → dark at 20°. */
function grad(id: string, p: Pal) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(20 0.5 0.5)">
      <stop offset="0" stopColor={p[0]} />
      <stop offset="0.25" stopColor={p[1]} />
      <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="0.75" stopColor={p[1]} />
      <stop offset="1" stopColor={p[0]} />
    </linearGradient>
  );
}

function Spec({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.3" strokeLinecap="round" />;
}

function Cup({ m, l, a }: { m: string; l: string; a: string }) {
  return (
    <>
      <path d="M9 6h14v6.5a7 7 0 0 1-14 0z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M9 8H6.5A4 4 0 0 0 10.5 12M23 8h2.5A4 4 0 0 1 21.5 12" fill="none" stroke={m} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 19.5v3.2" stroke={m} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M11 26.7h10l-1.9-4h-6.2z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
      <Spec d="M11.5 9.5A7 7 0 0 1 15 7.4" />
      <path d="M16 11.5l1.1 2.2 2.4.4-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.4z" fill={a} stroke="none" opacity="0.95" />
    </>
  );
}

function Shield({ m, l }: { m: string; l: string }) {
  return (
    <path d="M16 3.5l10 3.5v7.5c0 6-4.2 9.9-10 12.5-5.8-2.6-10-6.5-10-12.5V7z" fill={m} stroke={l} strokeWidth="0.8" strokeLinejoin="round" />
  );
}

function ShieldMarks({ n, fill }: { n: 1 | 2; fill: string }) {
  return n === 1 ? (
    <circle cx="16" cy="15" r="2.4" fill={fill} />
  ) : (
    <>
      <circle cx="12.8" cy="15" r="2.1" fill={fill} />
      <circle cx="19.2" cy="15" r="2.1" fill={fill} />
    </>
  );
}

function Medallion({ m, l, a, n }: { m: string; l: string; a: string; n: 1 | 2 | 3 }) {
  const dark = '#3a2a08';
  return (
    <>
      <path d="M11 4l3 8.5M21 4l-3 8.5" stroke={a} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="19" r="8" fill={m} stroke={l} strokeWidth="0.8" />
      <circle cx="16" cy="19" r="5.7" fill="none" stroke={l} strokeWidth="0.6" opacity="0.7" />
      {n === 1 && <circle cx="16" cy="19" r="2" fill={dark} opacity="0.9" />}
      {n === 2 && (
        <>
          <circle cx="13.5" cy="19" r="1.7" fill={dark} opacity="0.9" />
          <circle cx="18.5" cy="19" r="1.7" fill={dark} opacity="0.9" />
        </>
      )}
      {n === 3 && (
        <>
          <circle cx="16" cy="16.5" r="1.7" fill={dark} opacity="0.9" />
          <circle cx="13.6" cy="20.5" r="1.7" fill={dark} opacity="0.9" />
          <circle cx="18.4" cy="20.5" r="1.7" fill={dark} opacity="0.9" />
        </>
      )}
      <Spec d="M11.2 15.6A7 7 0 0 1 14 13.4" />
    </>
  );
}

function glyph(kind: string, m: string, l: string, a: string) {
  switch (kind) {
    case 'champion':
      return (
        <>
          <circle cx="16" cy="19.5" r="7" fill="none" stroke={m} strokeWidth="4.6" />
          <circle cx="16" cy="19.5" r="9.3" fill="none" stroke={l} strokeWidth="0.7" opacity="0.85" />
          <circle cx="16" cy="19.5" r="4.7" fill="none" stroke={l} strokeWidth="0.7" opacity="0.85" />
          <path d="M11.5 9 16 4l4.5 5L16 14z" fill={a} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M11.5 9h9" fill="none" stroke={l} strokeWidth="0.6" opacity="0.8" />
          <Spec d="M10.6 15.5A6.5 6.5 0 0 1 13.6 11.1" />
        </>
      );
    case 'mvp':
      return (
        <>
          <circle cx="16" cy="20.5" r="6.5" fill={m} stroke={l} strokeWidth="0.7" />
          <path d="M10 20.5h12M16 14v13M12.6 16.6c2.1 2.7 2.1 5.9 0 8.6M19.4 16.6c-2.1 2.7-2.1 5.9 0 8.6" fill="none" stroke={l} strokeWidth="0.7" opacity="0.8" />
          <path d="M7 14l2.5-8 3.5 4.5L16 5.5l3 5L22.5 6 25 14z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M7 14h18v2.4H7z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <Spec d="M10.6 12.4A6 6 0 0 1 13.4 9.4" />
        </>
      );
    case 'fmvp':
      return <Cup m={m} l={l} a={a} />;
    case 'dpoy':
      return (
        <>
          <Shield m={m} l={l} />
          <g fill="#43301a" opacity="0.85">
            <rect x="10.3" y="11" width="3.4" height="2.6" rx="0.5" />
            <rect x="14.3" y="11" width="3.4" height="2.6" rx="0.5" />
            <rect x="18.3" y="11" width="3.4" height="2.6" rx="0.5" />
            <rect x="8.4" y="14.4" width="3.4" height="2.6" rx="0.5" />
            <rect x="12.4" y="14.4" width="3.4" height="2.6" rx="0.5" />
            <rect x="16.4" y="14.4" width="3.4" height="2.6" rx="0.5" />
            <rect x="20.4" y="14.4" width="3.4" height="2.6" rx="0.5" />
          </g>
          <Spec d="M10.4 9.6A7 7 0 0 1 13.9 6.6" />
        </>
      );
    case 'roy':
      return (
        <>
          <path d="M16 26.5v-8" stroke={m} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M16 18c0-4.4-3-7.5-7.4-7.5 0 4.4 3 7.5 7.4 7.5z" fill={a} stroke={l} strokeWidth="0.6" />
          <path d="M16 18c0-4.4 3-7.5 7.4-7.5 0 4.4-3 7.5-7.4 7.5z" fill={a} stroke={l} strokeWidth="0.6" />
          <path d="M9.5 26.5h13" stroke={m} strokeWidth="2" strokeLinecap="round" fill="none" />
          <Spec d="M11.2 14.6A4.6 4.6 0 0 1 13.4 12.2" />
        </>
      );
    case 'smoy':
      return (
        <>
          <path d="M8.5 7.5h11A1.5 1.5 0 0 1 21 9v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 7 19V9a1.5 1.5 0 0 1 1.5-1.5z" fill={m} stroke={l} strokeWidth="0.7" />
          <path d="M13 4.5h4v3h-4z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M16.6 10.2 12.8 15.4h3.1l-.9 4.4 4.4-6h-3z" fill={a} stroke="#fff8d0" strokeWidth="0.5" strokeLinejoin="round" />
          <path d="M6 24.6h20M8 24.6v3.4M22 24.6v3.4" stroke={m} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <Spec d="M9.4 10.4A4 4 0 0 1 11.6 8.6" />
        </>
      );
    case 'mip':
      return (
        <>
          <path d="M5 24l7-7 4.5 4.5L26 10" fill="none" stroke={m} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20.5 10H26v5.5" fill="none" stroke={m} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.4 22.6l5.6-5.6" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 'allStar':
      return (
        <>
          <circle cx="16" cy="21" r="6.5" fill={m} stroke={l} strokeWidth="0.7" />
          <path d="M9.5 21h13M16 14.5v13" fill="none" stroke={l} strokeWidth="0.7" opacity="0.8" />
          <g transform="translate(4 -1)">
            <path d={STAR24} fill={a} stroke={l} strokeWidth="0.6" strokeLinejoin="round" />
          </g>
          <Spec d="M11 17.4A6 6 0 0 1 13.6 15" />
        </>
      );
    case 'allNba1':
      return <Medallion m={m} l={l} a={a} n={1} />;
    case 'allNba2':
      return <Medallion m={m} l={l} a={a} n={2} />;
    case 'allNba3':
      return <Medallion m={m} l={l} a={a} n={3} />;
    case 'allDef1':
    case 'allDef2':
      return (
        <>
          <Shield m={m} l={l} />
          <ShieldMarks n={kind === 'allDef1' ? 1 : 2} fill="#2e3540" />
          <Spec d="M10.4 9.6A7 7 0 0 1 13.9 6.6" />
        </>
      );
    case 'threeContest':
      return (
        <>
          <path d="M7 5h18v8H7z" fill="none" stroke={m} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M11 9.5h10" fill="none" stroke={l} strokeWidth="1.2" opacity="0.8" />
          <ellipse cx="16" cy="15.4" rx="6" ry="1.8" fill="none" stroke={m} strokeWidth="2" />
          <path d="M10.4 16.4c1.5 2.4 3.4 3.6 5.6 3.6s4.1-1.2 5.6-3.6M11.9 19.6c1.2 1.9 2.5 2.9 4.1 2.9s2.9-1 4.1-2.9M13.4 22.4c.8 1.3 1.6 2 2.6 2s1.8-.7 2.6-2" fill="none" stroke={l} strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
        </>
      );
    case 'euroChampion':
      return (
        <>
          <path d="M10 13h12v4.5a6 6 0 0 1-12 0z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M10 14.5H8a3 3 0 0 0 3 3M22 14.5h2a3 3 0 0 1-3 3" fill="none" stroke={m} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M16 22.2v2.3" stroke={m} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M12 27.5h8l-1.6-3h-4.8z" fill={m} stroke={l} strokeWidth="0.7" strokeLinejoin="round" />
          <circle cx="16" cy="8.4" r="5" fill={a} stroke={l} strokeWidth="0.6" />
          <ellipse cx="16" cy="8.4" rx="2.1" ry="5" fill="none" stroke={l} strokeWidth="0.55" opacity="0.85" />
          <path d="M11.3 6.6h9.4M11.3 10.2h9.4" fill="none" stroke={l} strokeWidth="0.55" opacity="0.85" />
        </>
      );
    case 'euroMvp':
      return (
        <>
          <circle cx="15" cy="17.5" r="8" fill={m} stroke={l} strokeWidth="0.8" />
          <ellipse cx="15" cy="17.5" rx="3.4" ry="8" fill="none" stroke={l} strokeWidth="0.6" opacity="0.85" />
          <path d="M7.5 14.5h15M7.5 20.5h15" fill="none" stroke={l} strokeWidth="0.6" opacity="0.85" />
          <g transform="translate(17.2 -1.2) scale(0.66)">
            <path d={STAR24} fill={a} stroke={l} strokeWidth="0.8" strokeLinejoin="round" />
          </g>
          <Spec d="M9.6 13A6.4 6.4 0 0 1 12.4 10.6" />
        </>
      );
    default:
      return <Cup m={m} l={l} a={a} />;
  }
}

/** Main metal palette per award kind (gold / silver / bronze variety). */
function mainPal(kind: string): Pal {
  if (kind === 'dpoy' || kind.startsWith('allDef') || kind === 'euroMvp') return PALETTES.silver;
  if (kind === 'roy') return PALETTES.bronze;
  return PALETTES.gold;
}

/** Accent (gem/leaf/bolt/star) palette per award kind. */
function accentPal(kind: string): Pal {
  if (kind === 'champion') return PALETTES.gem;
  if (kind === 'roy') return PALETTES.green;
  if (kind === 'smoy') return PALETTES.energy;
  if (kind.startsWith('allNba')) return PALETTES.red;
  if (kind === 'allStar' || kind === 'euroChampion') return PALETTES.blue;
  if (kind === 'euroMvp') return PALETTES.gold;
  if (kind === 'fmvp') return PALETTES.gold;
  return PALETTES.bronze;
}

export function AwardArt({ kind, size = 28, className, title }: { kind: string; size?: number; className?: string; title?: string }) {
  const id = useSvgId('aw');
  const m = `url(#${id}m)`;
  const l = mainPal(kind)[2];
  const a = `url(#${id}a)`;
  return (
    <svg
      viewBox="0 0 32 32" width={size} height={size} className={className}
      {...(title ? { role: 'img' as const } : { 'aria-hidden': true as const })}
    >
      {title && <title>{title}</title>}
      <defs>
        {grad(`${id}m`, mainPal(kind))}
        {grad(`${id}a`, accentPal(kind))}
      </defs>
      <ellipse cx="16" cy="28.7" rx="8" ry="1.6" fill="#000000" opacity="0.15" />
      {glyph(kind, m, l, a)}
    </svg>
  );
}

/** Glass trophy case: shelf with up to `max` awards, plus a `+N` chip when there are more. */
export function TrophyCase({ awards, size = 56, max = 8, labels }: { awards: string[]; size?: number; max?: number; labels?: Record<string, string> }) {
  const id = useSvgId('tc');
  const cap = Math.max(0, Math.floor(max));
  const shown = awards.slice(0, cap);
  const extra = awards.length - shown.length;
  return (
    <div className="trophy-case" style={{ position: 'relative' }}>
      <svg
        className="trophy-case-glass" viewBox="0 0 100 60" preserveAspectRatio="none"
        aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(20 0.5 0.5)">
            <stop offset="0" stopColor="#dceefc" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#cfe4f7" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d="M8 4h84v44H8z" fill={`url(#${id}g)`} stroke="#bcd6ee" strokeWidth="0.8" />
        <path d="M14 46 36 8h9L23 46z" fill="#ffffff" opacity="0.35" />
        <path d="M6 48h88l4 10H2z" fill="#8ea4bb" stroke="#6f8398" strokeWidth="0.6" />
        <path d="M8 46h84" stroke="#e8f2fb" strokeWidth="1.4" />
      </svg>
      <div className="trophy-case-shelf" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, flexWrap: 'wrap', padding: '6px 8px 14px' }}>
        {shown.map((k, i) => (
          <AwardArt key={`${k}-${i}`} kind={k} size={size} title={labels?.[k]} />
        ))}
        {extra > 0 && <span className="trophy-more">+{extra}</span>}
      </div>
    </div>
  );
}
