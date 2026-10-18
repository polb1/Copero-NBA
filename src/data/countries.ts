// Every country in the world, grouped by region. Spanish names come from Intl.DisplayNames.
// The hand-tuned countries in content/names.ts (with their own name pools) take precedence.

export type Region = 'NA' | 'EU' | 'LATAM' | 'AF' | 'OC' | 'AS' | 'MENA';

export const REGION_CODES: Record<Region, string[]> = {
  EU: ['AD', 'AL', 'AM', 'AT', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA', 'XK'],
  MENA: ['AE', 'BH', 'DZ', 'EG', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'PS', 'QA', 'SA', 'SY', 'TN', 'TR', 'YE'],
  AF: ['AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'],
  AS: ['AF', 'BD', 'BN', 'BT', 'CN', 'HK', 'ID', 'IN', 'JP', 'KG', 'KH', 'KP', 'KR', 'KZ', 'LA', 'LK', 'MM', 'MN', 'MO', 'MV', 'MY', 'NP', 'PH', 'PK', 'SG', 'TH', 'TJ', 'TL', 'TM', 'TW', 'UZ', 'VN'],
  NA: ['US', 'CA', 'AG', 'BB', 'BS', 'BZ', 'DM', 'GD', 'HT', 'JM', 'KN', 'LC', 'TT', 'VC'],
  LATAM: ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'GY', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SR', 'SV', 'UY', 'VE'],
  OC: ['AU', 'FJ', 'FM', 'KI', 'MH', 'NR', 'NZ', 'PG', 'PW', 'SB', 'TO', 'TV', 'VU', 'WS'],
};

export const ALL_ISO2: string[] = Object.values(REGION_CODES).flat();

export const regionOfIso2 = (iso: string): Region =>
  (Object.entries(REGION_CODES).find(([, list]) => list.includes(iso.toUpperCase()))?.[0] as Region) ?? 'EU';

/** Generic first/last name pools per region for countries without a hand-made pool. */
export const REGION_NAMES: Record<Region, { first: string[]; last: string[] }> = {
  EU: { first: ['Luka', 'Matej', 'Andrei', 'Erik', 'Tomas', 'Niklas', 'Marco', 'Daniel', 'Ivan', 'Leon', 'Adrian', 'Viktor'], last: ['Novak', 'Horvat', 'Popescu', 'Jensen', 'Kovács', 'Petrov', 'Müller', 'Nielsen', 'Rossi', 'Dimitrov', 'Larsen', 'Varga'] },
  MENA: { first: ['Omar', 'Youssef', 'Karim', 'Ahmed', 'Hamza', 'Ali', 'Tarek', 'Rami', 'Nassim', 'Khalil'], last: ['Haddad', 'Mansour', 'El Amrani', 'Benali', 'Saleh', 'Nasser', 'Khoury', 'Aziz', 'Farouk', 'Hamdi'] },
  AF: { first: ['Kwame', 'Moussa', 'Ibrahim', 'Kofi', 'Samuel', 'Abdou', 'Joseph', 'Emmanuel', 'Yaw', 'Amara'], last: ['Mensah', 'Diallo', 'Okoye', 'Kamara', 'Banda', 'Mwangi', 'Touré', 'Boateng', 'Ndlovu', 'Keita'] },
  AS: { first: ['Arjun', 'Hiro', 'Wei', 'Minh', 'Rizal', 'Kenji', 'Aditya', 'Bao', 'Tenzin', 'Daniyar'], last: ['Sharma', 'Nguyen', 'Tan', 'Lim', 'Santoso', 'Rahman', 'Suzuki', 'Chen', 'Gupta', 'Bekov'] },
  NA: { first: ['Jaden', 'Andre', 'Devon', 'Marcus', 'Tyrese', 'Kemar', 'Jamal', 'Chris', 'Shane', 'Rohan'], last: ['Campbell', 'Williams', 'Brown', 'Thompson', 'Gordon', 'Clarke', 'Richards', 'Grant', 'Francis', 'Baptiste'] },
  LATAM: { first: ['Mateo', 'Santiago', 'Diego', 'Sebastián', 'Joaquín', 'Felipe', 'Gabriel', 'Nicolás', 'Andrés', 'Emiliano'], last: ['González', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'Sánchez', 'Ramírez', 'Flores', 'Vargas', 'Castro'] },
  OC: { first: ['Tama', 'Sione', 'Jack', 'Liam', 'Mana', 'Ratu', 'Noah', 'Isaia', 'Kai', 'Lachie'], last: ['Tupou', 'Fifita', 'Smith', 'Vakatawa', 'Taufa', 'Brown', 'Ioane', 'Wilson', 'Nakarawa', 'Tuilagi'] },
};

const displayNames = (() => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    return null;
  }
})();

export function spanishCountryName(iso2: string): string {
  try {
    return displayNames?.of(iso2.toUpperCase()) ?? iso2.toUpperCase();
  } catch {
    return iso2.toUpperCase();
  }
}

export function flagEmoji(iso2: string) {
  return iso2.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}
