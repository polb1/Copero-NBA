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
  // Resto de Europa
  { name: 'Benfica', league: 'Liga Portuguesa', country: 'POR', tier: 2 },
  { name: 'FC Porto', league: 'Liga Portuguesa', country: 'POR', tier: 2 },
  { name: 'Sporting CP', league: 'Liga Portuguesa', country: 'POR', tier: 3 },
  { name: 'Filou Oostende', league: 'BNXT League', country: 'BEL', tier: 2 },
  { name: 'Antwerp Giants', league: 'BNXT League', country: 'BEL', tier: 3 },
  { name: 'Heroes Den Bosch', league: 'BNXT League', country: 'NL', tier: 3 },
  { name: 'Śląsk Wrocław', league: 'PLK', country: 'POL', tier: 2 },
  { name: 'Anwil Włocławek', league: 'PLK', country: 'POL', tier: 3 },
  { name: 'Legia Varsovia', league: 'PLK', country: 'POL', tier: 3 },
  { name: 'ERA Nymburk', league: 'NBL Chequia', country: 'CZE', tier: 2 },
  { name: 'Cibona', league: 'Liga ABA', country: 'CRO', tier: 3 },
  { name: 'KK Split', league: 'Liga ABA', country: 'CRO', tier: 3 },
  { name: 'KK Zadar', league: 'Liga ABA', country: 'CRO', tier: 3 },
  { name: 'Igokea', league: 'Liga ABA', country: 'BA', tier: 3 },
  { name: 'Krka Novo Mesto', league: 'Liga ABA', country: 'SLO', tier: 3 },
  { name: 'VEF Rīga', league: 'Liga Letona-Estonia', country: 'LAT', tier: 3 },
  { name: 'BC Kalev', league: 'Liga Letona-Estonia', country: 'EE', tier: 3 },
  { name: 'Kauhajoki Karhu', league: 'Korisliiga', country: 'FIN', tier: 3 },
  { name: 'Prometey', league: 'Superliga Ucrania', country: 'UA', tier: 3 },
  { name: 'CSKA Moscú', league: 'VTB United League', country: 'RU', tier: 1 },
  { name: 'UNICS Kazán', league: 'VTB United League', country: 'RU', tier: 2 },
  { name: 'Zenit San Petersburgo', league: 'VTB United League', country: 'RU', tier: 2 },
  { name: 'Falco Szombathely', league: 'NB I/A', country: 'HU', tier: 3 },
  { name: 'U-BT Cluj-Napoca', league: 'Liga Națională', country: 'RO', tier: 3 },
  { name: 'Levski Sofía', league: 'NBL Bulgaria', country: 'BG', tier: 3 },
  { name: 'London Lions', league: 'Super League Basketball', country: 'GBR', tier: 3 },
  { name: 'BC Vienna', league: 'BSL Austria', country: 'AT', tier: 3 },
  { name: 'Fribourg Olympic', league: 'SB League', country: 'CH', tier: 3 },
  { name: 'Bakken Bears', league: 'Basketligaen', country: 'DK', tier: 3 },
  { name: 'Norrköping Dolphins', league: 'Basketligan', country: 'SE', tier: 3 },
  { name: 'Rustavi', league: 'Superliga Georgia', country: 'GEO', tier: 3 },
  // Latinoamérica
  { name: 'Boca Juniors', league: 'Liga Nacional', country: 'ARG', tier: 2 },
  { name: 'Quimsa', league: 'Liga Nacional', country: 'ARG', tier: 2 },
  { name: 'Instituto de Córdoba', league: 'Liga Nacional', country: 'ARG', tier: 3 },
  { name: 'Obras Sanitarias', league: 'Liga Nacional', country: 'ARG', tier: 3 },
  { name: 'Flamengo', league: 'NBB', country: 'BRA', tier: 2 },
  { name: 'Franca', league: 'NBB', country: 'BRA', tier: 2 },
  { name: 'Minas', league: 'NBB', country: 'BRA', tier: 3 },
  { name: 'São Paulo', league: 'NBB', country: 'BRA', tier: 3 },
  { name: 'Diablos Rojos del México', league: 'LNBP', country: 'MEX', tier: 2 },
  { name: 'Halcones de Xalapa', league: 'LNBP', country: 'MEX', tier: 3 },
  { name: 'Astros de Jalisco', league: 'LNBP', country: 'MEX', tier: 3 },
  { name: 'Cangrejeros de Santurce', league: 'BSN', country: 'PUR', tier: 2 },
  { name: 'Vaqueros de Bayamón', league: 'BSN', country: 'PUR', tier: 2 },
  { name: 'Capitanes de Arecibo', league: 'BSN', country: 'PUR', tier: 3 },
  { name: 'Guaros de Lara', league: 'SPB', country: 'VEN', tier: 2 },
  { name: 'Trotamundos de Carabobo', league: 'SPB', country: 'VEN', tier: 3 },
  { name: 'Spartans Distrito Capital', league: 'SPB', country: 'VEN', tier: 3 },
  { name: 'Nacional', league: 'Liga Uruguaya', country: 'URU', tier: 3 },
  { name: 'Peñarol', league: 'Liga Uruguaya', country: 'URU', tier: 3 },
  { name: 'Aguada', league: 'Liga Uruguaya', country: 'URU', tier: 3 },
  { name: 'Titanes de Barranquilla', league: 'Liga Colombiana', country: 'COL', tier: 3 },
  { name: 'Cimarrones del Chocó', league: 'Liga Colombiana', country: 'COL', tier: 3 },
  { name: 'Leones de Santo Domingo', league: 'LNB Dominicana', country: 'DOM', tier: 3 },
  { name: 'Metros de Santiago', league: 'LNB Dominicana', country: 'DOM', tier: 3 },
  { name: 'Calgary Surge', league: 'CEBL', country: 'CAN', tier: 3 },
  { name: 'Niagara River Lions', league: 'CEBL', country: 'CAN', tier: 3 },
  { name: 'Vancouver Bandits', league: 'CEBL', country: 'CAN', tier: 3 },
  // Asia
  { name: 'Guangdong Southern Tigers', league: 'CBA', country: 'CHN', tier: 2 },
  { name: 'Liaoning Flying Leopards', league: 'CBA', country: 'CHN', tier: 2 },
  { name: 'Beijing Ducks', league: 'CBA', country: 'CHN', tier: 3 },
  { name: 'Shanghai Sharks', league: 'CBA', country: 'CHN', tier: 3 },
  // B.League (Japón) · clubes con plantilla y entrenador reales verificados
  { name: 'Alvark Tokyo', league: 'B.League', country: 'JPN', tier: 1 },
  { name: 'Chiba Jets', league: 'B.League', country: 'JPN', tier: 1 },
  { name: 'Utsunomiya Brex', league: 'B.League', country: 'JPN', tier: 1 },
  { name: 'Ryukyu Golden Kings', league: 'B.League', country: 'JPN', tier: 1 },
  { name: 'Seoul SK Knights', league: 'KBL', country: 'KOR', tier: 3 },
  { name: 'Ulsan Hyundai Mobis Phoebus', league: 'KBL', country: 'KOR', tier: 3 },
  { name: 'Wonju DB Promy', league: 'KBL', country: 'KOR', tier: 3 },
  { name: 'San Miguel Beermen', league: 'PBA', country: 'PHI', tier: 3 },
  { name: 'Barangay Ginebra', league: 'PBA', country: 'PHI', tier: 3 },
  { name: 'TNT Tropang Giga', league: 'PBA', country: 'PHI', tier: 3 },
  { name: 'Al Riyadi', league: 'Liga Libanesa', country: 'LB', tier: 3 },
  { name: 'Sagesse', league: 'Liga Libanesa', country: 'LB', tier: 3 },
  // África (Basketball Africa League)
  { name: 'Petro de Luanda', league: 'Basketball Africa League', country: 'AO', tier: 2 },
  { name: 'Primeiro de Agosto', league: 'Basketball Africa League', country: 'AO', tier: 3 },
  { name: 'Al Ahly', league: 'Basketball Africa League', country: 'EG', tier: 2 },
  { name: 'Zamalek', league: 'Basketball Africa League', country: 'EG', tier: 3 },
  { name: 'US Monastir', league: 'Basketball Africa League', country: 'TN', tier: 2 },
  { name: 'FUS Rabat', league: 'Basketball Africa League', country: 'MA', tier: 3 },
  { name: 'AS Douanes', league: 'Basketball Africa League', country: 'SEN', tier: 3 },
  { name: 'Rivers Hoopers', league: 'Basketball Africa League', country: 'NGA', tier: 3 },
  { name: 'APR', league: 'Basketball Africa League', country: 'RW', tier: 3 },
  { name: 'Stade Malien', league: 'Basketball Africa League', country: 'MLI', tier: 3 },
];

/** How strong each league is relative to the top European leagues (rating points). */
export const LEAGUE_STRENGTH: Record<string, number> = {
  'Liga ACB': 0, 'Basketbol Süper Ligi': 0, 'Greek Basket League': -0.5, 'Lega Basket Serie A': -0.5, 'Liga ABA': -0.5,
  LKL: -1, 'LNB Élite': -0.5, 'Basketball Bundesliga': -0.5, "Ligat ha'Al": -1, 'NBL Australia': -0.5, 'VTB United League': -0.5,
  'Liga Portuguesa': -3, 'BNXT League': -3, PLK: -2.5, 'NBL Chequia': -3, 'Liga Letona-Estonia': -3.5, Korisliiga: -4,
  'Superliga Ucrania': -4, 'NB I/A': -3.5, 'Liga Națională': -4, 'NBL Bulgaria': -4.5, 'Super League Basketball': -4,
  'BSL Austria': -4.5, 'SB League': -4.5, Basketligaen: -4.5, Basketligan: -4.5, 'Superliga Georgia': -5,
  'Liga Nacional': -2.5, NBB: -3, LNBP: -4, BSN: -3, SPB: -4, 'Liga Uruguaya': -4.5, 'Liga Colombiana': -5.5, 'LNB Dominicana': -5,
  CEBL: -5, CBA: -2.5, 'B.League': -2.5, KBL: -4, PBA: -4.5, 'Liga Libanesa': -4.5, 'Basketball Africa League': -5,
};

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
  const base = comp === 'NCAA' ? 54 : 61;
  const tier = club?.tier ?? 2;
  const league = club && comp === 'EUR' ? LEAGUE_STRENGTH[club.league] ?? -3 : 0;
  return base + (4 - tier) * 2.5 + league;
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
