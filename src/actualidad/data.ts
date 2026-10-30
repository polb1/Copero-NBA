import { useEffect, useState } from 'react';

export interface NewsItem {
  source: string;
  category: string;
  title: string;
  url: string;
  date: string;
  image?: string;
  summary: string;
}

export interface StandingRow {
  rank: number;
  team: string;
  w: number;
  l: number;
  form?: string;
  conf?: string;
}

export interface ResultRow {
  date: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  league: string;
}

export interface FixtureRow {
  date: string;
  time?: string;
  home: string;
  away: string;
  event?: string;
  note?: string;
  league: string;
}

export interface StatRow {
  league: string;
  stat: string;
  leader: string;
  team?: string;
  value: string;
}

export interface HubData {
  news: NewsItem[];
  standings: Record<string, StandingRow[]>;
  results: ResultRow[];
  fixtures: FixtureRow[];
  stats: StatRow[];
  leagues: Record<string, string[]>;
  loading: boolean;
}

async function load<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function useHubData(): HubData {
  const [data, setData] = useState<HubData>({
    news: [], standings: {}, results: [], fixtures: [], stats: [], leagues: {}, loading: true,
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      load<NewsItem[]>('/data/actualidad.json', []),
      load<Record<string, StandingRow[]>>('/data/standings.json', {}),
      load<ResultRow[]>('/data/results.json', []),
      load<FixtureRow[]>('/data/fixtures.json', []),
      load<StatRow[]>('/data/stats.json', []),
      load<Record<string, string[]>>('/data/leagues.json', {}),
    ]).then(([news, standings, results, fixtures, stats, leagues]) => {
      if (!mounted) return;
      setData({ news, standings, results, fixtures, stats, leagues, loading: false });
    });
    return () => { mounted = false; };
  }, []);

  return data;
}

/** Color/etiqueta por liga, igual que en el diseño. */
export const LEAGUE_META: Record<string, { label: string; chip: string }> = {
  NBA: { label: 'NBA', chip: 'bg-primary-container text-on-primary-container' },
  EU: { label: 'EUROLEAGUE', chip: 'bg-secondary text-on-secondary' },
  EuroLeague: { label: 'EUROLEAGUE', chip: 'bg-secondary text-on-secondary' },
  'B.League': { label: 'B.LEAGUE', chip: 'bg-tertiary text-on-tertiary-fixed' },
  'Liga ACB': { label: 'LIGA ACB', chip: 'bg-surface-container-high text-text-primary' },
};

export const leagueMeta = (key: string) =>
  LEAGUE_META[key] || { label: (key || 'NBA').toUpperCase(), chip: 'bg-surface-container-high text-text-primary' };

/** Iniciales para el escudo cuando no hay imagen. */
export const initials = (name: string) =>
  (name || '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '??';

export const pct = (w: number, l: number) => (w + l ? (w / (w + l)).toFixed(3).replace(/^0/, '') : '—');

export const teamColor = (name: string) => {
  const palette = ['#c8102e', '#1d4ed8', '#0f766e', '#b45309', '#6d28d9', '#be123c', '#0369a1', '#4d7c0f'];
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};

export const CRESTS: Record<string, string> = {
  'Real Madrid': '/crests/real-madrid.png',
  'FC Barcelona': '/crests/fc-barcelona.png',
  Baskonia: '/crests/baskonia.png',
  'Olympiacos Piraeus': '/crests/olympiacos.png',
  Panathinaikos: '/crests/panathinaikos.png',
  Partizan: '/crests/partizan.png',
  'AS Monaco': '/crests/as-monaco.png',
  'Fenerbahçe': '/crests/fenerbahce.png',
  'Alvark Tokyo': '/crests/alvark-tokyo.png',
  'Chiba Jets': '/crests/chiba-jets.png',
  'Utsunomiya Brex': '/crests/utsunomiya-brex.png',
  'Ryukyu Golden Kings': '/crests/ryukyu-golden-kings.png',
};
