// Fictional name pools. Any match with a real person is coincidental.

export interface Country {
  code: string;
  name: string;
  flag: string;
  first: string[];
  last: string[];
  /** Relative weight in generated NBA rosters. */
  weight: number;
  region: 'NA' | 'EU' | 'LATAM' | 'AF' | 'OC' | 'AS';
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
];

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

export const COACH_FIRST = ['Rick', 'Mike', 'Steve', 'Dan', 'Erik', 'Tom', 'Ime', 'Joe', 'Mark', 'Chris', 'Jason', 'Monty', 'Taylor', 'Wes', 'Darvin', 'Ty', 'Jamal', 'Quin', 'Will', 'Billy'];
export const COACH_LAST = ['Halvorsen', 'Brennan', 'Okoro', 'Castellano', 'Pryor', 'Lindqvist', 'Marlowe', 'Duquette', 'Ferraro', 'Whitlock', 'Abernathy', 'Rourke', 'Kingsley', 'Vasquez', 'Holcomb', 'Severin', 'Tate', 'Mosley', 'Barrett', 'Quintero'];

export const AGENT_NAMES = ['Rivera Sports Group', 'Northstar Management', 'Elevate Athletes', 'Crown & Court Agency', 'Baseline Partners', 'Apex Hoops Representation'];

export const UNIVERSITY_SUGGESTIONS = ['Duke', 'Kentucky', 'Kansas', 'North Carolina', 'Gonzaga', 'UCLA', 'Villanova', 'Michigan State', 'Arizona', 'Baylor', 'Houston', 'Auburn', 'Connecticut', 'Texas', 'Purdue', 'Florida'];

// Fictional European clubs for the international route.
export const EURO_CLUBS = ['Atlético Mediterráneo', 'Helios Basket', 'Olimpia Adriatica', 'Real Club Cantábrico', 'Panthers Belgrade', 'Baskonia del Norte', 'Dynamo Kaunas', 'Galata Istanbul', 'Paris Lumière BC', 'Bavaria Ballers', 'Ionian Athens', 'Ljubljana Dragons'];

export const HIGH_SCHOOLS = ['Academia Elite de Baloncesto', 'Instituto Deportivo Central', 'Prep School Riverside', 'Centro de Alto Rendimiento', 'Escuela Municipal'];
