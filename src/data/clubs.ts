// Real clubs outside the NBA, used for the pre-NBA routes, overseas contracts and satellite opponents.
// Names are used for identification only (no logos, no affiliation). Tier drives team strength and how
// many minutes a young player gets: big clubs win more but play their veterans; small clubs give minutes.

export interface Club {
  name: string;
  league: string;
  country: string; // our country code (flags)
  tier: 1 | 2 | 3;
}

export const EURO_CLUBS: Club[] = [
  // Liga ACB (España)
  { name: 'Real Madrid', league: 'Liga ACB', country: 'ESP', tier: 1 },
  { name: 'FC Barcelona', league: 'Liga ACB', country: 'ESP', tier: 1 },
  { name: 'Baskonia', league: 'Liga ACB', country: 'ESP', tier: 1 },
  { name: 'Valencia Basket', league: 'Liga ACB', country: 'ESP', tier: 1 },
  { name: 'Unicaja Málaga', league: 'Liga ACB', country: 'ESP', tier: 2 },
  { name: 'Joventut Badalona', league: 'Liga ACB', country: 'ESP', tier: 2 },
  { name: 'Gran Canaria', league: 'Liga ACB', country: 'ESP', tier: 2 },
  { name: 'UCAM Murcia', league: 'Liga ACB', country: 'ESP', tier: 2 },
  { name: 'La Laguna Tenerife', league: 'Liga ACB', country: 'ESP', tier: 2 },
  { name: 'Bàsquet Girona', league: 'Liga ACB', country: 'ESP', tier: 3 },
  { name: 'Casademont Zaragoza', league: 'Liga ACB', country: 'ESP', tier: 3 },
  { name: 'Río Breogán', league: 'Liga ACB', country: 'ESP', tier: 3 },
  { name: 'Surne Bilbao', league: 'Liga ACB', country: 'ESP', tier: 3 },
  // Turquía
  { name: 'Fenerbahçe', league: 'Basketbol Süper Ligi', country: 'TUR', tier: 1 },
  { name: 'Anadolu Efes', league: 'Basketbol Süper Ligi', country: 'TUR', tier: 1 },
  { name: 'Galatasaray', league: 'Basketbol Süper Ligi', country: 'TUR', tier: 2 },
  { name: 'Beşiktaş', league: 'Basketbol Süper Ligi', country: 'TUR', tier: 2 },
  { name: 'Türk Telekom', league: 'Basketbol Süper Ligi', country: 'TUR', tier: 3 },
  // Grecia
  { name: 'Olympiacos', league: 'Greek Basket League', country: 'GRE', tier: 1 },
  { name: 'Panathinaikos', league: 'Greek Basket League', country: 'GRE', tier: 1 },
  { name: 'AEK Atenas', league: 'Greek Basket League', country: 'GRE', tier: 2 },
  { name: 'PAOK', league: 'Greek Basket League', country: 'GRE', tier: 3 },
  { name: 'Aris Salónica', league: 'Greek Basket League', country: 'GRE', tier: 3 },
  // Italia
  { name: 'Olimpia Milano', league: 'Lega Basket Serie A', country: 'ITA', tier: 1 },
  { name: 'Virtus Bologna', league: 'Lega Basket Serie A', country: 'ITA', tier: 1 },
  { name: 'Reyer Venezia', league: 'Lega Basket Serie A', country: 'ITA', tier: 2 },
  { name: 'Dinamo Sassari', league: 'Lega Basket Serie A', country: 'ITA', tier: 3 },
  { name: 'Pallacanestro Trieste', league: 'Lega Basket Serie A', country: 'ITA', tier: 3 },
  // Liga Adriática
  { name: 'Partizan', league: 'Liga ABA', country: 'SRB', tier: 1 },
  { name: 'Estrella Roja', league: 'Liga ABA', country: 'SRB', tier: 1 },
  { name: 'Cedevita Olimpija', league: 'Liga ABA', country: 'SLO', tier: 2 },
  { name: 'Budućnost', league: 'Liga ABA', country: 'MNE', tier: 2 },
  { name: 'Mega Basket', league: 'Liga ABA', country: 'SRB', tier: 3 },
  { name: 'FMP', league: 'Liga ABA', country: 'SRB', tier: 3 },
  // Lituania
  { name: 'Žalgiris Kaunas', league: 'LKL', country: 'LTU', tier: 1 },
  { name: 'Rytas Vilnius', league: 'LKL', country: 'LTU', tier: 2 },
  { name: 'Lietkabelis', league: 'LKL', country: 'LTU', tier: 3 },
  // Francia
  { name: 'AS Monaco', league: 'LNB Élite', country: 'FRA', tier: 1 },
  { name: 'LDLC ASVEL', league: 'LNB Élite', country: 'FRA', tier: 1 },
  { name: 'Paris Basketball', league: 'LNB Élite', country: 'FRA', tier: 2 },
  { name: 'Metropolitans 92', league: 'LNB Élite', country: 'FRA', tier: 2 },
  { name: 'JL Bourg', league: 'LNB Élite', country: 'FRA', tier: 3 },
  { name: 'Cholet Basket', league: 'LNB Élite', country: 'FRA', tier: 3 },
  // Alemania
  { name: 'Bayern Múnich', league: 'Basketball Bundesliga', country: 'GER', tier: 1 },
  { name: 'ALBA Berlín', league: 'Basketball Bundesliga', country: 'GER', tier: 2 },
  { name: 'ratiopharm Ulm', league: 'Basketball Bundesliga', country: 'GER', tier: 3 },
  { name: 'Niners Chemnitz', league: 'Basketball Bundesliga', country: 'GER', tier: 3 },
  // Israel
  { name: 'Maccabi Tel Aviv', league: "Ligat ha'Al", country: 'ISR', tier: 1 },
  { name: 'Hapoel Tel Aviv', league: "Ligat ha'Al", country: 'ISR', tier: 2 },
  // Australia (programa Next Stars)
  { name: 'Perth Wildcats', league: 'NBL Australia', country: 'AUS', tier: 2 },
  { name: 'Sydney Kings', league: 'NBL Australia', country: 'AUS', tier: 2 },
  { name: 'Melbourne United', league: 'NBL Australia', country: 'AUS', tier: 2 },
  { name: 'New Zealand Breakers', league: 'NBL Australia', country: 'NZL', tier: 3 },
];

export const NCAA_PROGRAMS: Club[] = [
  { name: 'Duke', league: 'ACC', country: 'USA', tier: 1 },
  { name: 'North Carolina', league: 'ACC', country: 'USA', tier: 1 },
  { name: 'Kentucky', league: 'SEC', country: 'USA', tier: 1 },
  { name: 'Kansas', league: 'Big 12', country: 'USA', tier: 1 },
  { name: 'UConn', league: 'Big East', country: 'USA', tier: 1 },
  { name: 'Gonzaga', league: 'WCC', country: 'USA', tier: 1 },
  { name: 'Arizona', league: 'Big 12', country: 'USA', tier: 1 },
  { name: 'UCLA', league: 'Big Ten', country: 'USA', tier: 1 },
  { name: 'Houston', league: 'Big 12', country: 'USA', tier: 1 },
  { name: 'Purdue', league: 'Big Ten', country: 'USA', tier: 1 },
  { name: 'Auburn', league: 'SEC', country: 'USA', tier: 1 },
  { name: 'Florida', league: 'SEC', country: 'USA', tier: 1 },
  { name: 'Baylor', league: 'Big 12', country: 'USA', tier: 2 },
  { name: 'Villanova', league: 'Big East', country: 'USA', tier: 2 },
  { name: 'Michigan State', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Texas', league: 'SEC', country: 'USA', tier: 2 },
  { name: 'Tennessee', league: 'SEC', country: 'USA', tier: 2 },
  { name: 'Alabama', league: 'SEC', country: 'USA', tier: 2 },
  { name: 'Indiana', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Arkansas', league: 'SEC', country: 'USA', tier: 2 },
  { name: 'Creighton', league: 'Big East', country: 'USA', tier: 2 },
  { name: 'Marquette', league: 'Big East', country: 'USA', tier: 2 },
  { name: 'Iowa State', league: 'Big 12', country: 'USA', tier: 2 },
  { name: 'Illinois', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Texas Tech', league: 'Big 12', country: 'USA', tier: 2 },
  { name: 'Michigan', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Ohio State', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Oregon', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'USC', league: 'Big Ten', country: 'USA', tier: 2 },
  { name: 'Virginia', league: 'ACC', country: 'USA', tier: 2 },
  { name: "St. John's", league: 'Big East', country: 'USA', tier: 2 },
  { name: 'Memphis', league: 'AAC', country: 'USA', tier: 3 },
  { name: "Saint Mary's", league: 'WCC', country: 'USA', tier: 3 },
  { name: 'San Diego State', league: 'Mountain West', country: 'USA', tier: 3 },
  { name: 'Dayton', league: 'Atlantic 10', country: 'USA', tier: 3 },
  { name: 'Wake Forest', league: 'ACC', country: 'USA', tier: 3 },
  { name: 'Xavier', league: 'Big East', country: 'USA', tier: 3 },
  { name: 'BYU', league: 'Big 12', country: 'USA', tier: 3 },
  { name: 'Utah State', league: 'Mountain West', country: 'USA', tier: 3 },
  { name: 'VCU', league: 'Atlantic 10', country: 'USA', tier: 3 },
];

/** NBA G League affiliate of each franchise. */
export const G_LEAGUE: Record<string, string> = {
  ATL: 'College Park Skyhawks', BOS: 'Maine Celtics', BKN: 'Long Island Nets', CHA: 'Greensboro Swarm', CHI: 'Windy City Bulls',
  CLE: 'Cleveland Charge', DAL: 'Texas Legends', DEN: 'Grand Rapids Gold', DET: 'Motor City Cruise', GSW: 'Santa Cruz Warriors',
  HOU: 'Rio Grande Valley Vipers', IND: 'Noblesville Boom', LAC: 'San Diego Clippers', LAL: 'South Bay Lakers', MEM: 'Memphis Hustle',
  MIA: 'Sioux Falls Skyforce', MIL: 'Wisconsin Herd', MIN: 'Iowa Wolves', NOP: 'Birmingham Squadron', NYK: 'Westchester Knicks',
  OKC: 'Oklahoma City Blue', ORL: 'Osceola Magic', PHI: 'Delaware Blue Coats', PHX: 'Valley Suns', POR: 'Rip City Remix',
  SAC: 'Stockton Kings', SAS: 'Austin Spurs', TOR: 'Raptors 905', UTA: 'Salt Lake City Stars', WAS: 'Capital City Go-Go',
};

export const findClub = (name: string): Club | undefined =>
  [...EURO_CLUBS, ...NCAA_PROGRAMS].find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

/** Team strength of a club on the NBA rating scale. */
export function clubLevel(club: Club | undefined, comp: 'NCAA' | 'EUR'): number {
  const base = comp === 'NCAA' ? 54 : 59;
  const tier = club?.tier ?? 2;
  return base + (4 - tier) * 2.5;
}

/** Minutes multiplier for a young player: stacked clubs play veterans, small clubs give the ball. */
export function clubMinutes(club: Club | undefined): number {
  const tier = club?.tier ?? 2;
  return tier === 1 ? 0.8 : tier === 2 ? 1 : 1.15;
}

/** Opponents for a satellite season: other clubs of the same competition (same league first). */
export function opponentsFor(comp: 'NCAA' | 'EUR' | 'GLG', own: string, nbaTeamId?: string | null): string[] {
  if (comp === 'GLG') return Object.entries(G_LEAGUE).filter(([id]) => id !== nbaTeamId).map(([, n]) => n);
  const pool = comp === 'NCAA' ? NCAA_PROGRAMS : EURO_CLUBS;
  const me = pool.find((c) => c.name === own);
  const same = pool.filter((c) => c.name !== own && me && c.league === me.league).map((c) => c.name);
  const rest = pool.filter((c) => c.name !== own && !same.includes(c.name)).map((c) => c.name);
  return [...same, ...rest];
}
