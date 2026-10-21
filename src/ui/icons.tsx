// Minimal consistent stroke icon set (original, 24x24, 1.8 stroke).
export type IconName = keyof typeof P;

const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  dash: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  dumbbell: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 4 6',
  contract: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  swap: 'M7 7h13l-4-4M17 17H4l4 4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4',
  medal: 'M7 3l3 6M17 3l-3 6M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 13v4',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  save: 'M5 3h11l3 3v15H5zM8 3v6h8M8 21v-7h8v7',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M7 4l13 8-13 8z',
  forward: 'M4 5l8 7-8 7zM12 5l8 7-8 7z',
  skip: 'M5 5l9 7-9 7zM17 5v14',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12l5 5 9-10',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
  ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  med: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
  // --- step 4.1a additions (stroke, 24x24, no emoji, no text) ---
  stopwatch: 'M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 13l3-2M19 6.5l1.5-1.5',
  clipboard: ['M9 4h6v3H9z', 'M9 5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3', 'M8 11h8M8 15h5'],
  handshake: 'M2 16l6-6M22 16l-6-6M8 10l4-3 4 3-4 4z',
  briefcase: 'M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M2 13h20',
  bed: 'M3 19V7M2 19h17a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H3M3 15h16M6 12V9h5v3',
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  swords: 'M7 17L19 5M7 17l-3 3M4 14l6 6M17 17L5 5M17 17l3 3M14 14l6 6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  shoe: 'M2 17v-4h4l4-4 3 3h3a4 4 0 0 1 4 4v1H2zM7 12l2 2M10 10l2 2',
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM10 19h4M11 5h2',
  plane: 'M12 3c1 0 1.5 1.5 1.5 4v3l7 4v2l-7-2v3l2 2v1l-3.5-1-3.5 1v-1l2-2v-3l-7 2v-2l7-4V7c0-2.5.5-4 1.5-4z',
  book: 'M5 3h13a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v18M11 8h5M11 12h5M11 16h3',
  locker: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM5 9h14M8 5.5h2M14 5.5h2M15 13v3',
  refresh: 'M4 12a8 8 0 0 1 8-8M9.5 1.5L12 4l-2.5 2.5M20 12a8 8 0 0 1-8 8M14.5 22.5L12 20l2.5-2.5',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
  cap: 'M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5M22 10v5M22 15l-1.5 1.5',
  brain: 'M12 6.5A3 3 0 0 0 6.8 4.4 3.2 3.2 0 0 0 4.5 10a3 3 0 0 0 1.2 4.8A3 3 0 0 0 9 19.5a3 3 0 0 0 3-1.5zM12 6.5A3 3 0 0 1 17.2 4.4 3.2 3.2 0 0 1 19.5 10a3 3 0 0 1-1.2 4.8A3 3 0 0 1 15 19.5a3 3 0 0 1-3-1.5zM12 6.5V19M8 9.5c1 .8 1.5 2 1.5 3M16 9.5c-1 .8-1.5 2-1.5 3',
  brick: ['M3 5h18v14H3z', 'M3 9.7h18M3 14.3h18', 'M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19'],
  flame: 'M12 22c-3.6 0-6.5-2.6-6.5-5.8 0-2.4 1.5-4.2 3-5.7.4 1.3 1.3 2.3 2.3 2.3 0-3 1.6-5.4 4-7.3-.5 3 1.5 4.5 3 6.5 1.3 1.7 2.7 3.4 2.7 6C20.5 20 17.6 22 12 22zM12.5 19.5c-1.4 0-2.5-1-2.5-2.4 0-1.3 1-2.2 1.8-3.4.5.9 1.3 1.4 2 1.4 1 0 1.8-.8 1.8-2 .8 1 1.5 2.3 1.5 3.7 0 1.6-1.4 2.7-4.6 2.7z',
  dice: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  lock: 'M8 11V7a4 4 0 0 1 8 0v4M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM12 15v3',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 14c.8 1.6 1.8 2.4 3 2.4s2.2-.8 3-2.4M9 9.5h.01M15 9.5h.01',
  gauge: 'M4 18a8 8 0 0 1 16 0M12 18l5-5M7 13.5l1.5 1M17 13.5l-1.5 1M12 9.5v2M12 18h.01',
  ticket: 'M3 9a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-1a2 2 0 0 0 0-4zM9 7v10',
  crown: 'M4 8l3.5 4L12 5l4.5 7L20 8l-1.5 11h-11L4 8zM7.5 19v2M16.5 19v2',
  diamond: 'M6 4h12l4 5-10 12L2 9zM2 9h20M8 4l2 5M16 4l-2 5M10 9l2 12M14 9l-2 12',
  sprout: 'M12 20v-6M12 14c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6zM12 14c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6zM8 21h8',
  growth: 'M4 20V4M4 20h16M8 16l3.5-4.5 3 2.5L20 8M16.5 8H20v3.5',
  ring: 'M12 21.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM9.5 7.5L12 3.5l2.5 4L12 11zM9.5 7.5h5',
  suitcase: 'M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 7v12M15 7v12M3 13h18',
  anvil: 'M4 8h16v3H4zM10 11h4l-.5 4h-3zM7 15h10l2 3H5z',
  hourglass: 'M6 3h12M6 21h12M6 3h12v1.5c0 2-1 3.5-3 5l-3 2.5-3-2.5c-2-1.5-3-3-3-5zM6 21h12v-1.5c0-2-1-3.5-3-5l-3-2.5-3 2.5c-2 1.5-3 3-3 5z',
  museum: 'M3 10L12 4l9 6H3zM3 13h18M5 13v8M9 13v8M15 13v8M19 13v8M12 13v8M2 21h20',
  blocks: 'M3 13h8v8H3zM13 13h8v8h-8zM8 4h8v8H8z',
  number: 'M6 9h13M5 15h14M10.5 4L8.5 20M16.5 4l-2 16',
  car: 'M4 16v-3.5l2.2-4.2A2 2 0 0 1 8 7h8a2 2 0 0 1 1.8 1.3L20 12.5V16M3 16h18M5.5 16a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0zM13.5 16a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0z',
  building: 'M4 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M14 10h5a1 1 0 0 1 1 1v10M2 21h20M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2M17 13h1M17 17h1',
  shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM12 6.2l5.5 2v3.8c0 3.5-2.3 6.1-5.5 7.6-3.2-1.5-5.5-4.1-5.5-7.6V8.2z',
  battery: 'M3 7h15a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM21 10.5v3M5.5 10v4M9 10v4M12.5 10v4',
  cup: 'M5 7h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 9h1.5A2.5 2.5 0 0 1 16 14M4 22h13',
} as const;

export const ICON_NAMES = Object.keys(P) as IconName[];

export function Icon({ name, size = 18, className, strokeWidth = 1.8, title }: {
  name: IconName | string; size?: number; className?: string; strokeWidth?: number; title?: string;
}) {
  const v = (P as Record<string, string | readonly string[] | undefined>)[name as IconName];
  const paths = typeof v === 'string' ? [v] : (v ?? [P.ball]);
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} {...(title ? { role: 'img' as const } : { 'aria-hidden': true as const })}
    >
      {title && <title>{title}</title>}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
