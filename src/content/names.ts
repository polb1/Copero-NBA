import { EURO_CLUBS as EURO_CLUB_LIST, NCAA_PROGRAMS } from '../data/clubs';
import { ALL_ISO2, REGION_NAMES, flagEmoji, regionOfIso2, spanishCountryName, type Region } from '../data/countries';
// Fictional name pools. Any match with a real person is coincidental.

export interface Country {
  code: string;
  name: string;
  flag: string;
  first: string[];
  last: string[];
  /** Relative weight in generated NBA rosters. */
  weight: number;
  region: Region;
}

export const COUNTRIES: Country[] = [
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸', weight: 70, region: 'NA',
    first: ['Jalen', 'Marcus', 'Tyrell', 'Devin', 'Cameron', 'Isaiah', 'Brandon', 'Malik', 'Jordan', 'Trey', 'Darius', 'Caleb', 'Andre', 'Xavier', 'Elijah', 'Quentin', 'Rashad', 'Terrence', 'Corey', 'Damon', 'Kendrick', 'Austin', 'Miles', 'Nathan', 'Tobias', 'Deshawn', 'Grant', 'Reggie'],
    last: ['Walker', 'Johnson', 'Brooks', 'Carter', 'Hayes', 'Mitchell', 'Coleman', 'Harris', 'Simmons', 'Price', 'Bennett', 'Freeman', 'Holloway', 'Reed', 'Dawson', 'Fletcher', 'Granger', 'Whitfield', 'Lockhart', 'Pruitt', 'McCall', 'Thornton', 'Banks', 'Ellison', 'Vaughn', 'Sutton', 'Merritt', 'Calloway'] },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦', weight: 5, region: 'NA',
    first: ['Liam', 'Owen', 'Tristan', 'Dillon', 'Kofi', 'Mason', 'Ethan', 'Nolan'],
    last: ['Bouchard', 'MacLeod', 'Grant', 'Osei', 'Tremblay', 'Fraser', 'Boateng', 'Kerr'] },
  { code: 'ESP', name: 'España', flag: '🇪🇸', weight: 3, region: 'EU',
    first: ['Pablo', 'Álex', 'Sergio', 'Hugo', 'Marc', 'Jaime', 'Iker', 'Dani', 'Rubén', 'Pol'],
    last: ['Navarro', 'Ferrer', 'Ortega', 'Castells', 'Llorente', 'Vidal', 'Aguirre', 'Montes', 'Soler', 'Ibáñez'] },
  { code: 'FRA', name: 'Francia', flag: '🇫🇷', weight: 5, region: 'EU',
    first: ['Théo', 'Mathis', 'Bastien', 'Yanis', 'Killian', 'Moussa', 'Enzo', 'Rayan'],
    last: ['Laurent', 'Diallo', 'Moreau', 'Traoré', 'Lefèvre', 'Camara', 'Girard', 'Mbaye'] },
  { code: 'SRB', name: 'Serbia', flag: '🇷🇸', weight: 3, region: 'EU',
    first: ['Nikola', 'Stefan', 'Marko', 'Luka', 'Vuk', 'Dušan', 'Filip', 'Aleksa'],
    last: ['Petrović', 'Jovanović', 'Marković', 'Ilić', 'Stanković', 'Lazić', 'Pavlović', 'Kostić'] },
  { code: 'GRE', name: 'Grecia', flag: '🇬🇷', weight: 2, region: 'EU',
    first: ['Giorgos', 'Nikos', 'Kostas', 'Dimitris', 'Yannis', 'Thanos'],
    last: ['Papadakis', 'Karagiannis', 'Nikolaidis', 'Vlachos', 'Stavrou', 'Doukas'] },
  { code: 'GER', name: 'Alemania', flag: '🇩🇪', weight: 3, region: 'EU',
    first: ['Jonas', 'Moritz', 'Lukas', 'Felix', 'Niklas', 'Tim'],
    last: ['Becker', 'Hoffmann', 'Krüger', 'Wagner', 'Brandt', 'Schreiber'] },
  { code: 'SLO', name: 'Eslovenia', flag: '🇸🇮', weight: 1, region: 'EU',
    first: ['Žiga', 'Jaka', 'Klemen', 'Matic', 'Rok'],
    last: ['Novak', 'Kranjc', 'Zupan', 'Horvat', 'Kovačič'] },
  { code: 'LTU', name: 'Lituania', flag: '🇱🇹', weight: 1, region: 'EU',
    first: ['Mantas', 'Tomas', 'Arnas', 'Rokas', 'Lukas'],
    last: ['Kazlauskas', 'Petrauskas', 'Jankūnas', 'Valančius', 'Žukauskas'] },
  { code: 'ITA', name: 'Italia', flag: '🇮🇹', weight: 1, region: 'EU',
    first: ['Matteo', 'Lorenzo', 'Alessandro', 'Simone', 'Davide'],
    last: ['Bianchi', 'Ricci', 'Marino', 'Conti', 'Galli'] },
  { code: 'TUR', name: 'Turquía', flag: '🇹🇷', weight: 1, region: 'EU',
    first: ['Emre', 'Cem', 'Burak', 'Kerem', 'Alperen'],
    last: ['Yılmaz', 'Demir', 'Kaya', 'Aydın', 'Öztürk'] },
  { code: 'CRO', name: 'Croacia', flag: '🇭🇷', weight: 1, region: 'EU',
    first: ['Ivan', 'Ante', 'Dario', 'Mario', 'Josip'],
    last: ['Babić', 'Perić', 'Šarić', 'Knežević', 'Vuković'] },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', weight: 3, region: 'OC',
    first: ['Jack', 'Cooper', 'Lachlan', 'Riley', 'Mitchell', 'Harrison'],
    last: ['O\'Connor', 'Whitaker', 'Barlow', 'Hughes', 'McKenzie', 'Langford'] },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', weight: 1, region: 'LATAM',
    first: ['Facundo', 'Nicolás', 'Tomás', 'Juan Ignacio', 'Lautaro', 'Agustín'],
    last: ['Gómez', 'Fernández', 'Sosa', 'Herrera', 'Paz', 'Delgado'] },
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷', weight: 1, region: 'LATAM',
    first: ['Lucas', 'Gabriel', 'Rafael', 'Thiago', 'Bruno'],
    last: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Ribeiro'] },
  { code: 'MEX', name: 'México', flag: '🇲🇽', weight: 1, region: 'LATAM',
    first: ['Diego', 'Emiliano', 'Santiago', 'Mateo', 'Andrés'],
    last: ['Ramírez', 'Torres', 'Castillo', 'Mendoza', 'Rojas'] },
  { code: 'DOM', name: 'Rep. Dominicana', flag: '🇩🇴', weight: 1, region: 'LATAM',
    first: ['Ángel', 'Wilmer', 'Yeison', 'Ramón', 'Starling'],
    last: ['Peña', 'Batista', 'Tavárez', 'Rosario', 'Familia'] },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬', weight: 2, region: 'AF',
    first: ['Chukwudi', 'Emeka', 'Tobi', 'Femi', 'Obinna', 'Ikenna'],
    last: ['Okafor', 'Adeyemi', 'Nwosu', 'Eze', 'Okonkwo', 'Balogun'] },
  { code: 'CMR', name: 'Camerún', flag: '🇨🇲', weight: 1, region: 'AF',
    first: ['Christian', 'Pascal', 'Joël', 'Landry'],
    last: ['Mbappé', 'Ngando', 'Etoundi', 'Fotso'] },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', weight: 1, region: 'AF',
    first: ['Mamadou', 'Ibrahima', 'Cheikh', 'Ousmane'],
    last: ['Ndiaye', 'Sarr', 'Faye', 'Diop'] },
  { code: 'JPN', name: 'Japón', flag: '🇯🇵', weight: 1, region: 'AS',
    first: ['Yuki', 'Rui', 'Kenta', 'Daiki'],
    last: ['Tanaka', 'Watanabe', 'Sato', 'Kobayashi'] },
  { code: 'CHN', name: 'China', flag: '🇨🇳', weight: 1, region: 'AS',
    first: ['Wei', 'Hao', 'Jun', 'Lei'],
    last: ['Zhang', 'Li', 'Wang', 'Zhou'] },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', weight: 1, region: 'EU', first: ['João', 'Tiago', 'Rúben', 'Diogo', 'Miguel'], last: ['Silva', 'Costa', 'Ferreira', 'Pereira', 'Rodrigues'] },
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪', weight: 1, region: 'EU', first: ['Thomas', 'Ruben', 'Jonas', 'Arne', 'Kevin'], last: ['Peeters', 'Janssens', 'Maes', 'Wouters', 'Claes'] },
  { code: 'POL', name: 'Polonia', flag: '🇵🇱', weight: 1, region: 'EU', first: ['Jakub', 'Kacper', 'Mateusz', 'Michał', 'Piotr'], last: ['Nowak', 'Kowalski', 'Wiśniewski', 'Lewandowski', 'Zieliński'] },
  { code: 'ISR', name: 'Israel', flag: '🇮🇱', weight: 1, region: 'AS', first: ['Yam', 'Omri', 'Tamir', 'Ido', 'Noam'], last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton'] },
  { code: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿', weight: 1, region: 'OC', first: ['Tai', 'Corey', 'Finn', 'Isaac', 'Reuben'], last: ['Webster', 'Ngata', 'Taylor', 'Parata', 'Wilson'] },
  { code: 'PUR', name: 'Puerto Rico', flag: '🇵🇷', weight: 1, region: 'LATAM', first: ['José', 'Carlos', 'Gian', 'Ismael', 'Jaysean'], last: ['Rivera', 'Colón', 'Ortiz', 'Vázquez', 'Santiago'] },
  { code: 'VEN', name: 'Venezuela', flag: '🇻🇪', weight: 1, region: 'LATAM', first: ['Gregory', 'Néstor', 'Heissler', 'Windi', 'Michael'], last: ['Vargas', 'Colmenares', 'Guillent', 'Graterol', 'Carrera'] },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', weight: 1, region: 'LATAM', first: ['Andrés', 'Juan David', 'Camilo', 'Sebastián', 'Luis'], last: ['Gómez', 'Martínez', 'Cuesta', 'Mosquera', 'Palacios'] },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', weight: 1, region: 'LATAM', first: ['Santiago', 'Martín', 'Joaquín', 'Bruno', 'Felipe'], last: ['Fernández', 'Pereira', 'Osimani', 'Vázquez', 'Bavosi'] },
  { code: 'CUB', name: 'Cuba', flag: '🇨🇺', weight: 1, region: 'LATAM', first: ['Yoel', 'Alexei', 'Javier', 'Yordan', 'Osmel'], last: ['Rodríguez', 'Pérez', 'Hernández', 'Despaigne', 'Cárdenas'] },
  { code: 'MNE', name: 'Montenegro', flag: '🇲🇪', weight: 1, region: 'EU', first: ['Nikola', 'Marko', 'Bojan', 'Vladimir', 'Igor'], last: ['Vučević', 'Popović', 'Dubljević', 'Ivanović', 'Radović'] },
  { code: 'LAT', name: 'Letonia', flag: '🇱🇻', weight: 1, region: 'EU', first: ['Kristaps', 'Dāvis', 'Rolands', 'Artūrs', 'Mārtiņš'], last: ['Bērziņš', 'Kalniņš', 'Ozoliņš', 'Liepiņš', 'Šmits'] },
  { code: 'CZE', name: 'Chequia', flag: '🇨🇿', weight: 1, region: 'EU', first: ['Tomáš', 'Jan', 'Ondřej', 'Vít', 'Martin'], last: ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka'] },
  { code: 'FIN', name: 'Finlandia', flag: '🇫🇮', weight: 1, region: 'EU', first: ['Lauri', 'Mikael', 'Elias', 'Sasu', 'Olivier'], last: ['Korhonen', 'Virtanen', 'Nieminen', 'Mäkinen', 'Salin'] },
  { code: 'GBR', name: 'Reino Unido', flag: '🇬🇧', weight: 1, region: 'EU', first: ['Oliver', 'Harry', 'Jamal', 'Kieran', 'Ben'], last: ['Smith', 'Clarke', 'Okafor', 'Hughes', 'Walker'] },
  { code: 'PHI', name: 'Filipinas', flag: '🇵🇭', weight: 1, region: 'AS', first: ['Jordan', 'Kai', 'Dwight', 'Kiefer', 'Thirdy'], last: ['Santos', 'Reyes', 'Ravena', 'Cruz', 'Bautista'] },
  { code: 'KOR', name: 'Corea del Sur', flag: '🇰🇷', weight: 1, region: 'AS', first: ['Ji-hoon', 'Min-jun', 'Hyun-woo', 'Seung-ho', 'Dong-hyun'], last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung'] },
  { code: 'MLI', name: 'Malí', flag: '🇲🇱', weight: 1, region: 'AF', first: ['Moussa', 'Seydou', 'Boubacar', 'Amadou', 'Oumar'], last: ['Traoré', 'Keïta', 'Coulibaly', 'Diarra', 'Sissoko'] },
  { code: 'SSD', name: 'Sudán del Sur', flag: '🇸🇸', weight: 1, region: 'AF', first: ['Wenyen', 'Majok', 'Nuni', 'Kuany', 'Marial'], last: ['Gabriel', 'Deng', 'Omot', 'Kuany', 'Shayok'] },
  { code: 'BAH', name: 'Bahamas', flag: '🇧🇸', weight: 1, region: 'NA', first: ['Deandre', 'Eric', 'Kai', 'Travis', 'Chavano'], last: ['Ayton', 'Gordon', 'Munnings', 'Hield', 'Rolle'] },
  { code: 'GEO', name: 'Georgia', flag: '🇬🇪', weight: 1, region: 'EU', first: ['Giorgi', 'Tornike', 'Levan', 'Sandro', 'Goga'], last: ['Shengelia', 'Mamukelashvili', 'Bitadze', 'Baldwin', 'Kakhiani'] },
];

/** ISO 3166-1 alpha-2 codes for the bundled flag images (public/flags). */
export const ISO2: Record<string, string> = {
  USA: 'us', CAN: 'ca', ESP: 'es', FRA: 'fr', SRB: 'rs', GRE: 'gr', GER: 'de', SLO: 'si', LTU: 'lt', ITA: 'it', TUR: 'tr', CRO: 'hr',
  AUS: 'au', ARG: 'ar', BRA: 'br', MEX: 'mx', DOM: 'do', NGA: 'ng', CMR: 'cm', SEN: 'sn', JPN: 'jp', CHN: 'cn',
  POR: 'pt', BEL: 'be', POL: 'pl', ISR: 'il', NZL: 'nz', PUR: 'pr', VEN: 've', COL: 'co', URU: 'uy', CUB: 'cu', MNE: 'me', LAT: 'lv',
  CZE: 'cz', FIN: 'fi', GBR: 'gb', PHI: 'ph', KOR: 'kr', MLI: 'ml', SSD: 'ss', BAH: 'bs', GEO: 'ge',
};

// Every other country in the world (weight 0: they only appear when the player picks them).
for (const iso of ALL_ISO2) {
  const lower = iso.toLowerCase();
  if (Object.values(ISO2).includes(lower)) continue;
  const region = regionOfIso2(iso);
  COUNTRIES.push({ code: iso, name: spanishCountryName(iso), flag: flagEmoji(iso), weight: 0, region, first: REGION_NAMES[region].first, last: REGION_NAMES[region].last });
  ISO2[iso] = lower;
}

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

export const COACH_FIRST = ['Rick', 'Mike', 'Steve', 'Dan', 'Erik', 'Tom', 'Ime', 'Joe', 'Mark', 'Chris', 'Jason', 'Monty', 'Taylor', 'Wes', 'Darvin', 'Ty', 'Jamal', 'Quin', 'Will', 'Billy'];
export const COACH_LAST = ['Halvorsen', 'Brennan', 'Okoro', 'Castellano', 'Pryor', 'Lindqvist', 'Marlowe', 'Duquette', 'Ferraro', 'Whitlock', 'Abernathy', 'Rourke', 'Kingsley', 'Vasquez', 'Holcomb', 'Severin', 'Tate', 'Mosley', 'Barrett', 'Quintero'];

export const AGENT_NAMES = ['Rivera Sports Group', 'Northstar Management', 'Elevate Athletes', 'Crown & Court Agency', 'Baseline Partners', 'Apex Hoops Representation'];

export const UNIVERSITY_SUGGESTIONS = NCAA_PROGRAMS.map((c) => c.name);

// Real clubs for the international route (see src/data/clubs.ts).
export const EURO_CLUBS = EURO_CLUB_LIST.map((c) => c.name);

export const HIGH_SCHOOLS = ['Academia Elite de Baloncesto', 'Instituto Deportivo Central', 'Prep School Riverside', 'Centro de Alto Rendimiento', 'Escuela Municipal'];
