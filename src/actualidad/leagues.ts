/** Utilidades para pasar de nombre de liga a URL y viceversa. */

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const leaguePath = (name: string): string => `/liga/${slugify(name)}`;

export const findLeagueBySlug = <T,>(map: Record<string, T>, slug: string): string | null => {
  for (const key of Object.keys(map)) {
    if (slugify(key) === slug) return key;
  }
  return null;
};

/** Etiqueta de país/región para el sidebar. */
export const LEAGUE_COUNTRY: Record<string, string> = {
  NBA: 'USA',
  EuroLeague: 'EUR',
  'B.League': 'JPN',
  'Liga ACB': 'ESP',
  'Basketbol Süper Ligi': 'TUR',
  'Greek Basket League': 'GRE',
  'Lega Basket Serie A': 'ITA',
  'Liga ABA': 'ABA',
  LKL: 'LTU',
  'LNB Élite': 'FRA',
  'Basketball Bundesliga': 'GER',
  'NBL Australia': 'AUS',
  'Liga Portuguesa': 'POR',
  'BNXT League': 'BNL',
  PLK: 'POL',
  'NBL Chequia': 'CZE',
  'Liga Letona-Estonia': 'LAT',
  Korisliiga: 'FIN',
  'Superliga Ucrania': 'UKR',
  'VTB United League': 'VTB',
  'NB I/A': 'HUN',
  'Liga Națională': 'ROU',
  'NBL Bulgaria': 'BUL',
  'Super League Basketball': 'GBR',
  'BSL Austria': 'AUT',
  'SB League': 'SUI',
  Basketligaen: 'DEN',
  Basketligan: 'SWE',
  'Superliga Georgia': 'GEO',
  'Liga Nacional': 'ARG',
  NBB: 'BRA',
  LNBP: 'MEX',
  BSN: 'PUR',
  SPB: 'VEN',
  'Liga Uruguaya': 'URU',
  'Liga Colombiana': 'COL',
  'LNB Dominicana': 'DOM',
  CEBL: 'CAN',
  CBA: 'CHN',
  KBL: 'KOR',
  PBA: 'PHI',
  'Liga Libanesa': 'LIB',
  'Basketball Africa League': 'AFR',
  'Ligat ha\'Al': 'ISR',
};

/** Ligas con datos en vivo (clasificación y/o partidos). */
export const LIVE_LEAGUES = ['NBA', 'EuroLeague', 'B.League', 'Liga ACB'];
