#!/usr/bin/env node
/**
 * scripts/update-nba-roster.mjs
 *
 * PASO 1: descarga los 30 rosters de ESPN y guarda un JSON intermedio en
 *         /tmp/rosters-espn.json.
 * PASO 2: descarga stats 2025-26 (una request), deriva posición fina, país y
 *         salario, valida y escribe src/data/nbaRoster2026.json.
 *
 * Ejecutar: /opt/homebrew/bin/node scripts/update-nba-roster.mjs
 */

import { rename, writeFile } from 'node:fs/promises';

const SLUGS = [
  'atl', 'bos', 'bkn', 'cha', 'chi', 'cle', 'dal', 'den', 'det', 'gs',
  'hou', 'ind', 'lac', 'lal', 'mem', 'mia', 'mil', 'min', 'no', 'ny',
  'okc', 'orl', 'phi', 'phx', 'por', 'sac', 'sa', 'tor', 'uth', 'was',
];

// teamId = slug en mayúsculas salvo estas excepciones
const TEAM_ID_OVERRIDES = {
  gs: 'GSW',
  no: 'NOP',
  ny: 'NYK',
  sa: 'SAS',
  uth: 'UTA',
  was: 'WAS',
};

// Orden exacto de salida de teams[]
const TEAM_ORDER = [
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
];

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';
const USER_AGENT = 'CoperoNBA/1.0 (contact: dariomititeluradu@gmail.com)';
// ESPN (Akamai) responde 403 a la UA con "(contact: ...)"; fallback documentado.
const USER_AGENT_FALLBACK = 'CoperoNBA/1.0';
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 3 reintentos
const PAUSE_MS = 100;
const OUTPUT_PATH = '/tmp/rosters-espn.json';

const STATS_URL =
  'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete' +
  '?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=600' +
  '&sort=offensive.avgPoints%3Adesc&season=2026&seasontype=2';

const FINAL_PATH = 'src/data/nbaRoster2026.json';
const FINAL_TMP_PATH = 'src/data/nbaRoster2026.json.tmp';

const WIKI_API = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions'
  + '&rvprop=content&rvslots=main&formatversion=2&format=json&titles=';

const WIKI_TEAMS = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
  'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons',
  'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers', 'Los Angeles Clippers',
  'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat', 'Milwaukee Bucks',
  'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks', 'Oklahoma City Thunder',
  'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers',
  'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors', 'Utah Jazz', 'Washington Wizards',
];

const WIKI_SOURCE_URL = 'https://en.wikipedia.org/wiki/Template:{Team}_roster';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function teamIdFor(slug) {
  return TEAM_ID_OVERRIDES[slug] ?? slug.toUpperCase();
}

function numOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function strOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------- HTTP ---------------------------------- */

async function requestJson(url, userAgent) {
  const res = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    const retryAfter = Number(res.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = retryAfter * 1000;
    throw err;
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('respuesta no es JSON (posible página de error HTML)');
  }
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      // Respeta Retry-After (p. ej. 429 de Wikipedia) si es mayor que el backoff
      await sleep(Math.max(RETRY_DELAYS_MS[attempt - 1], lastError?.retryAfterMs ?? 0));
    }
    try {
      return await requestJson(url, USER_AGENT);
    } catch (error) {
      if (error.status === 403) {
        try {
          const data = await requestJson(url, USER_AGENT_FALLBACK);
          console.warn(`  ! 403 con la UA de la spec; usando fallback "${USER_AGENT_FALLBACK}"`);
          return data;
        } catch (fallbackError) {
          lastError = fallbackError;
          continue;
        }
      }
      lastError = error;
    }
  }
  throw lastError ?? new Error('fallo desconocido');
}

/* ------------------------- PASO 1: rosters ----------------------------- */

function toPlayer(athlete) {
  const contract = athlete.contract ?? null;
  const contracts = Array.isArray(athlete.contracts) ? athlete.contracts : [];

  return {
    id: athlete.id ?? null,
    firstName: strOrNull(athlete.firstName),
    lastName: strOrNull(athlete.lastName),
    displayName: strOrNull(athlete.displayName) ?? strOrNull(athlete.fullName),
    height: numOrNull(athlete.height), // pulgadas
    weight: numOrNull(athlete.weight), // libras
    dateOfBirth: strOrNull(athlete.dateOfBirth),
    experience: {
      years: numOrNull(athlete.experience?.years),
    },
    position: {
      abbreviation: strOrNull(athlete.position?.abbreviation),
    },
    birthPlace: {
      country: strOrNull(athlete.birthPlace?.country),
    },
    contract: {
      // ESPN no siempre expone `contract`; si falta, se usa `contracts[0]`.
      salary: numOrNull(contract?.salary) ?? numOrNull(contracts[0]?.salary),
      yearsRemaining: numOrNull(contract?.yearsRemaining),
    },
  };
}

function playersFrom(data) {
  const athletes = Array.isArray(data.athletes) ? data.athletes : [];
  const flat = athletes.flatMap((entry) =>
    Array.isArray(entry?.items) ? entry.items : [entry],
  );
  return flat.filter((athlete) => athlete && athlete.id).map(toPlayer);
}

async function fetchRosters() {
  const teams = [];
  const failures = [];

  for (let index = 0; index < SLUGS.length; index += 1) {
    const slug = SLUGS[index];
    const url = `${BASE_URL}/${slug}/roster`;
    try {
      const data = await fetchJson(url);
      const players = playersFrom(data);
      const withSalary = players.filter((p) => p.contract.salary !== null).length;
      teams.push({ slug, teamId: teamIdFor(slug), players });
      console.log(`${slug.padEnd(4)} ${teamIdFor(slug).padEnd(4)} ${String(players.length).padStart(2)} jugadores (${withSalary} con salario)`);
    } catch (error) {
      failures.push({ slug, message: error?.message ?? String(error) });
      console.error(`${slug.padEnd(4)} ERROR ${error?.message ?? error}`);
    }
    if (index < SLUGS.length - 1) await sleep(PAUSE_MS);
  }

  const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
  const totalWithSalary = teams.reduce(
    (sum, team) => sum + team.players.filter((p) => p.contract.salary !== null).length,
    0,
  );

  if (failures.length > 0) {
    console.error(`\nEquipos con error: ${failures.length} (${failures.map((f) => f.slug).join(', ')})`);
    console.error('No se escribió el JSON intermedio.');
    process.exitCode = 1;
    return null;
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify({ teams }, null, 2)}\n`, 'utf8');

  console.log('\n--- RESUMEN PASO 1 ---');
  console.log(`Equipos descargados: ${teams.length}/${SLUGS.length}`);
  console.log(`Jugadores totales:   ${totalPlayers}`);
  console.log(`Con salario:         ${totalWithSalary}`);
  console.log(`Guardado en:         ${OUTPUT_PATH}`);

  return teams;
}

/* --------------------- PASO 2: stats por atleta ------------------------ */

// Campos leídos de categories[].names[] y volcados a stats{}:
// general:    gamesPlayed, avgMinutes, avgFouls, avgRebounds
// offensive:  avgPoints, avgAssists, avgTurnovers, avgFieldGoalsMade/Attempted,
//             avgThreePointFieldGoalsMade/Attempted, avgFreeThrowsMade/Attempted,
//             fieldGoalPct, threePointFieldGoalPct, freeThrowPct
// defensive:  avgSteals, avgBlocks

function parseStats(data) {
  // categories[] del payload: names[] alinea con values[] de cada atleta
  const namesByCategory = new Map();
  for (const category of data.categories ?? []) {
    namesByCategory.set(category.name, category.names ?? []);
  }

  const byAthleteId = new Map();
  for (const entry of data.athletes ?? []) {
    const espnId = entry?.athlete?.id;
    if (!espnId) continue;

    const raw = {};
    for (const category of entry.categories ?? []) {
      const names = namesByCategory.get(category.name) ?? category.names ?? [];
      const values = category.values ?? [];
      for (let i = 0; i < names.length; i += 1) {
        if (raw[names[i]] === undefined) raw[names[i]] = values[i];
      }
    }

    const gp = numOrNull(raw.gamesPlayed);
    if (gp === null || gp < 1) continue; // solo si gp >= 1

    byAthleteId.set(espnId, { gp, raw });
  }
  return byAthleteId;
}

function buildStats(record, posGroup) {
  const { gp, raw } = record;
  const read = (name) => numOrNull(raw[name]) ?? 0;

  const reb = round1(read('avgRebounds'));
  const share = posGroup === 'G' ? 0.18 : posGroup === 'F' ? 0.24 : 0.3;
  const oreb = round1(reb * share);
  const dreb = round1(reb - oreb);

  const stats = {
    gp: Math.trunc(gp),
    gs: 0,
    min: round1(read('avgMinutes')),
    pts: round1(read('avgPoints')),
    reb,
    oreb,
    dreb,
    ast: round1(read('avgAssists')),
    stl: round1(read('avgSteals')),
    blk: round1(read('avgBlocks')),
    tov: round1(read('avgTurnovers')),
    pf: round1(read('avgFouls')),
    fgm: round1(read('avgFieldGoalsMade')),
    fga: round1(read('avgFieldGoalsAttempted')),
    tpm: round1(read('avgThreePointFieldGoalsMade')),
    tpa: round1(read('avgThreePointFieldGoalsAttempted')),
    ftm: round1(read('avgFreeThrowsMade')),
    fta: round1(read('avgFreeThrowsAttempted')),
    fgPct: round3(read('fieldGoalPct') / 100),
    tpPct: round3(read('threePointFieldGoalPct') / 100),
    ftPct: round3(read('freeThrowPct') / 100),
  };

  return stats;
}

/* -------------------- PASO 2: posición fina ---------------------------- */

const POS_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];

// Rangos de altura (cm) usados solo para la reasignación de posiciones faltantes
const POS_HEIGHT_RANGES = {
  PG: [183, 196],
  SG: [191, 201],
  SF: [198, 206],
  PF: [203, 211],
  C: [208, 222],
};

function groupFromEspn(abbreviation, heightCm) {
  if (abbreviation === 'G' || abbreviation === 'F' || abbreviation === 'C') {
    return abbreviation;
  }
  // Sin grupo en ESPN: se infiere por altura (no ocurre con los datos actuales)
  if (heightCm <= 196) return 'G';
  if (heightCm <= 206) return 'F';
  return 'C';
}

function derivePos(posGroup, heightCm, stats) {
  const ast = stats ? stats.ast : 0;

  if (posGroup === 'G') {
    if (heightCm <= 190 || ast >= 6.0) return 'PG';
    if (heightCm <= 198) return 'SG';
    if (heightCm > 201) return 'SF';
    return 'SG';
  }
  if (posGroup === 'F') {
    if (heightCm >= 206) return 'PF';
    if (heightCm <= 198 && ast >= 5.5) return 'SG';
    return 'SF';
  }
  if (posGroup === 'C') {
    const ratio = stats && stats.fga > 0 ? stats.tpa / stats.fga : 0;
    if (heightCm <= 203 && ratio >= 0.35) return 'PF';
    return 'C';
  }
  return 'SF';
}

function distanceToRange(heightCm, [lo, hi]) {
  if (heightCm < lo) return lo - heightCm;
  if (heightCm > hi) return heightCm - hi;
  return 0;
}

/**
 * Si un equipo queda sin alguna posición, reasigna el jugador (no reasignado
 * aún) de altura más cercana al rango objetivo de esa posición.
 */
function ensureAllPositions(players) {
  const reassigned = new Set();

  for (const pos of POS_ORDER) {
    if (players.some((player) => player.pos === pos)) continue;

    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const player of players) {
      if (reassigned.has(player.id)) continue;
      const distance = distanceToRange(player.heightCm, POS_HEIGHT_RANGES[pos]);
      if (distance < bestDistance
        || (distance === bestDistance && best !== null && (player.heightCm < best.heightCm
          || (player.heightCm === best.heightCm && player.id < best.id)))) {
        best = player;
        bestDistance = distance;
      }
    }
    if (!best) continue;
    best.pos = pos;
    reassigned.add(best.id);
  }
}

/* ----------------------- PASO 2: nacionalidad -------------------------- */

// Códigos alpha-3 del juego
const ALPHA3_BY_COUNTRY = {
  usa: 'USA',
  'united states': 'USA',
  'united states of america': 'USA',
  canada: 'CAN',
  spain: 'ESP',
  france: 'FRA',
  serbia: 'SRB',
  greece: 'GRE',
  germany: 'GER',
  slovenia: 'SLO',
  lithuania: 'LTU',
  italy: 'ITA',
  turkey: 'TUR',
  'türkiye': 'TUR',
  'turkiye': 'TUR',
  croatia: 'CRO',
  australia: 'AUS',
  argentina: 'ARG',
  brazil: 'BRA',
  mexico: 'MEX',
  'dominican republic': 'DOM',
  nigeria: 'NGA',
  cameroon: 'CMR',
  senegal: 'SEN',
  japan: 'JPN',
  china: 'CHN',
  portugal: 'POR',
  belgium: 'BEL',
  poland: 'POL',
  israel: 'ISR',
  'new zealand': 'NZL',
  'puerto rico': 'PUR',
  venezuela: 'VEN',
  colombia: 'COL',
  uruguay: 'URU',
  cuba: 'CUB',
  montenegro: 'MNE',
  latvia: 'LAT',
  'czech republic': 'CZE',
  czechia: 'CZE',
  finland: 'FIN',
  england: 'GBR',
  'great britain': 'GBR',
  'united kingdom': 'GBR',
  philippines: 'PHI',
  'south korea': 'KOR',
  'korea, south': 'KOR',
  'korea': 'KOR',
  mali: 'MLI',
  'south sudan': 'SSD',
  bahamas: 'BAH',
  'the bahamas': 'BAH',
  georgia: 'GEO',
};

// Resto: ISO2 en mayúsculas
const ISO2_BY_COUNTRY = {
  netherlands: 'NL',
  'the netherlands': 'NL',
  'bosnia & herzegovina': 'BA',
  'bosnia and herzegovina': 'BA',
  switzerland: 'CH',
  russia: 'RU',
  estonia: 'EE',
  guinea: 'GN',
  congo: 'CG',
  'republic of the congo': 'CG',
  'democratic republic of congo': 'CD',
  'democratic republic of the congo': 'CD',
  'dr congo': 'CD',
  sweden: 'SE',
  jamaica: 'JM',
  austria: 'AT',
  ukraine: 'UA',
  albania: 'AL',
  'north macedonia': 'MK',
  macedonia: 'MK',
  hungary: 'HU',
  romania: 'RO',
  bulgaria: 'BG',
  slovakia: 'SK',
  denmark: 'DK',
  norway: 'NO',
  iceland: 'IS',
  ireland: 'IE',
  wales: 'GB',
  scotland: 'GB',
  belarus: 'BY',
  moldova: 'MD',
  kosovo: 'XK',
  armenia: 'AM',
  azerbaijan: 'AZ',
  kazakhstan: 'KZ',
  uzbekistan: 'UZ',
  'saudi arabia': 'SA',
  'united arab emirates': 'AE',
  qatar: 'QA',
  kuwait: 'KW',
  lebanon: 'LB',
  jordan: 'JO',
  iran: 'IR',
  iraq: 'IQ',
  syria: 'SY',
  egypt: 'EG',
  morocco: 'MA',
  algeria: 'DZ',
  libya: 'LY',
  tunisia: 'TN',
  ghana: 'GH',
  'ivory coast': 'CI',
  "côte d'ivoire": 'CI',
  benin: 'BJ',
  togo: 'TG',
  'burkina faso': 'BF',
  gabon: 'GA',
  chad: 'TD',
  'central african republic': 'CF',
  rwanda: 'RW',
  uganda: 'UG',
  kenya: 'KE',
  tanzania: 'TZ',
  ethiopia: 'ET',
  somalia: 'SO',
  eritrea: 'ER',
  angola: 'AO',
  mozambique: 'MZ',
  zimbabwe: 'ZW',
  zambia: 'ZM',
  botswana: 'BW',
  namibia: 'NA',
  malawi: 'MW',
  madagascar: 'MG',
  'cape verde': 'CV',
  'sao tome and principe': 'ST',
  gambia: 'GM',
  'sierra leone': 'SL',
  liberia: 'LR',
  'guinea-bissau': 'GW',
  'equatorial guinea': 'GQ',
  mauritania: 'MR',
  niger: 'NE',
  burundi: 'BI',
  djibouti: 'DJ',
  comoros: 'KM',
  mauritius: 'MU',
  seychelles: 'SC',
  'south africa': 'ZA',
  lesotho: 'LS',
  eswatini: 'SZ',
  sudan: 'SD',
  india: 'IN',
  pakistan: 'PK',
  bangladesh: 'BD',
  'sri lanka': 'LK',
  nepal: 'NP',
  thailand: 'TH',
  vietnam: 'VN',
  malaysia: 'MY',
  singapore: 'SG',
  indonesia: 'ID',
  taiwan: 'TW',
  'hong kong': 'HK',
  mongolia: 'MN',
  'north korea': 'KP',
  fiji: 'FJ',
  samoa: 'WS',
  tonga: 'TO',
  'papua new guinea': 'PG',
  guam: 'GU',
  'new caledonia': 'NC',
  'solomon islands': 'SB',
  vanuatu: 'VU',
  haiti: 'HT',
  panama: 'PA',
  chile: 'CL',
  peru: 'PE',
  ecuador: 'EC',
  guatemala: 'GT',
  honduras: 'HN',
  'costa rica': 'CR',
  'trinidad and tobago': 'TT',
  barbados: 'BB',
  belize: 'BZ',
  suriname: 'SR',
  guyana: 'GY',
  paraguay: 'PY',
  bolivia: 'BO',
  nicaragua: 'NI',
  'el salvador': 'SV',
  'curaçao': 'CW',
  curacao: 'CW',
};

const KNOWN_ALPHA3 = new Set(Object.values(ALPHA3_BY_COUNTRY));

function nationalityFor(country) {
  const name = strOrNull(country);
  if (!name) return 'USA'; // fallback: nunca vacío
  const key = name.trim().toLowerCase();

  if (ALPHA3_BY_COUNTRY[key]) return ALPHA3_BY_COUNTRY[key];
  if (ISO2_BY_COUNTRY[key]) return ISO2_BY_COUNTRY[key];

  const upper = name.trim().toUpperCase();
  if (KNOWN_ALPHA3.has(upper)) return upper;
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  return 'USA';
}

/* --------------------- PASO 3: Wikipedia rosters ----------------------- */

const SUFFIX_TOKENS = new Set(['jr', 'ii', 'iii', 'iv']);
const SUFFIX_RE = /\s+(jr\.?|ii|iii|iv)$/i;

function normalizeName(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSuffixes(normalized) {
  const parts = normalized.split(' ').filter(Boolean);
  while (parts.length > 1 && SUFFIX_TOKENS.has(parts[parts.length - 1])) parts.pop();
  return parts.join(' ');
}

function nameKey(first, last) {
  return stripSuffixes(normalizeName(`${first ?? ''} ${last ?? ''}`));
}

function splitSuffix(last) {
  const match = last.match(SUFFIX_RE);
  if (!match) return { base: last.trim(), suffix: null };
  return { base: last.slice(0, match.index).trim(), suffix: match[1].trim() };
}

// Limpia valores de plantilla: "Georgia (country){{!}}Georgia" -> "Georgia"
function cleanWikiText(value) {
  if (!value) return null;
  let text = value.split('{{!}}').pop();
  text = text.replace(/\[\[[^\]]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  return text.trim() || null;
}

function parseWikiPlayers(content) {
  const players = [];

  for (const line of (content ?? '').split('\n')) {
    if (!/^\s*\{\{\s*player2/i.test(line)) continue;

    const body = line.trim().replace(/^\{\{/, '').replace(/\}\}\s*$/, '');
    const fields = {};
    for (const part of body.split('|').slice(1)) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      fields[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
    }

    const ft = Number(fields.ft);
    const inches = Number(fields.in);
    const lbs = Number(fields.lbs);

    players.push({
      pos: fields.pos ? fields.pos.toUpperCase() : null,
      first: cleanWikiText(fields.first),
      last: cleanWikiText(fields.last),
      heightCm: Number.isFinite(ft) && Number.isFinite(inches)
        ? Math.round((ft * 12 + inches) * 2.54)
        : null,
      weightKg: Number.isFinite(lbs) ? Math.round(lbs * 0.45359237) : null,
      dateOfBirth: fields.dob ? fields.dob : null,
      from: cleanWikiText(fields.from),
      note: fields.note ? fields.note : null,
    });
  }
  return players;
}

async function fetchWikiRosters() {
  const byName = new Map();
  const stats = { templates: 0, failed: 0, players: 0, duplicates: 0 };

  for (let index = 0; index < WIKI_TEAMS.length; index += 1) {
    const team = WIKI_TEAMS[index];
    const url = `${WIKI_API}${encodeURIComponent(`Template:${team} roster`)}`;
    try {
      const data = await fetchJson(url);
      const page = data?.query?.pages?.[0];
      const content = page?.revisions?.[0]?.slots?.main?.content ?? null;
      if (page?.missing || !content) throw new Error('plantilla inexistente o sin contenido');

      const players = parseWikiPlayers(content);
      stats.templates += 1;
      stats.players += players.length;
      console.log(`wiki ${team.padEnd(24)} ${String(players.length).padStart(2)} jugadores`);

      for (const player of players) {
        const key = nameKey(player.first, player.last);
        if (!key) continue;
        if (byName.has(key)) {
          stats.duplicates += 1;
          console.warn(`  ! nombre duplicado en Wikipedia: "${player.first} ${player.last}" (${team})`);
          continue;
        }
        byName.set(key, player);
      }
    } catch (error) {
      stats.failed += 1;
      console.warn(`wiki ${team}: WARNING ${error?.message ?? error} (se continúa)`);
    }
    if (index < WIKI_TEAMS.length - 1) await sleep(PAUSE_MS);
  }

  return { byName, stats };
}

// Posición fina a partir de la posición de Wikipedia, refinada por altura/ast
function derivePosFromWiki(wikiPos, heightCm, stats) {
  const ast = stats ? stats.ast : 0;
  const ratio = stats && stats.fga > 0 ? stats.tpa / stats.fga : 0;

  switch (wikiPos) {
    case 'PG':
      return 'PG';
    case 'G':
      return heightCm <= 190 || ast >= 6.0 ? 'PG' : 'SG';
    case 'GF':
      return heightCm <= 198 && ast >= 5.5 ? 'SG' : 'SF';
    case 'F':
      return heightCm >= 206 ? 'PF' : 'SF';
    case 'FC':
    case 'CF':
      return heightCm <= 203 && ratio >= 0.35 ? 'PF' : 'C';
    case 'C':
      return 'C';
    default:
      return null;
  }
}

/* --------------------------- PASO 2: build ----------------------------- */

function buildPlayer(teamPlayer, statsById, wikiByName) {
  const espnId = teamPlayer.id;
  const id = `nba-${espnId}`;
  const wiki = wikiByName?.get(nameKey(teamPlayer.firstName, teamPlayer.lastName)) ?? null;

  const espnHeightCm = teamPlayer.height !== null ? Math.round(teamPlayer.height * 2.54) : null;
  const espnWeightKg = teamPlayer.weight !== null ? Math.round(teamPlayer.weight * 0.45359237) : null;
  // Wikipedia solo cubre el físico cuando ESPN no lo trae
  const heightCm = espnHeightCm ?? wiki?.heightCm ?? 0;
  const weightKg = espnWeightKg ?? wiki?.weightKg ?? 0;

  const posGroup = groupFromEspn(teamPlayer.position.abbreviation, heightCm);
  const statsRecord = statsById.get(espnId) ?? null;
  const stats = statsRecord ? buildStats(statsRecord, posGroup) : null;

  let first = teamPlayer.firstName ?? '';
  let last = teamPlayer.lastName ?? '';
  let suffix = null;
  let pos = derivePos(posGroup, heightCm, stats);
  let posSource = 'derived';
  let nat = nationalityFor(teamPlayer.birthPlace.country);
  let twoWay = false;

  if (wiki) {
    if (wiki.first) first = wiki.first;
    if (wiki.last) {
      const split = splitSuffix(wiki.last);
      last = split.base;
      suffix = split.suffix;
    }
    if (wiki.from) nat = nationalityFor(wiki.from);
    if (wiki.note) twoWay = /\bTW\b/i.test(wiki.note);
    const wikiPos = derivePosFromWiki(wiki.pos, heightCm, stats);
    if (wikiPos) {
      pos = wikiPos;
      posSource = 'wiki';
    }
  }

  const player = {
    id,
    espnId,
    first,
    last,
  };
  if (suffix) player.suffix = suffix;
  Object.assign(player, {
    pos,
    posGroup,
    posSource,
    heightCm,
    weightKg,
    birthDate: teamPlayer.dateOfBirth ? teamPlayer.dateOfBirth.slice(0, 10) : null,
    nat,
    yearsPro: teamPlayer.experience.years ?? 0,
  });

  if (stats) player.stats = stats;

  const salary = teamPlayer.contract.salary;
  if (salary !== null && salary > 0) player.salary = salary;
  const contractYears = teamPlayer.contract.yearsRemaining;
  if (contractYears !== null && contractYears > 0) player.contractYears = contractYears;

  player.twoWay = twoWay;
  player.gLeague = false;
  player.source = 'espn';

  return player;
}

function buildOutput(rosterTeams, statsById, wikiByName) {
  const playersByTeam = [];
  const players = {};

  for (const team of rosterTeams) {
    const teamPlayers = team.players.map((teamPlayer) =>
      buildPlayer(teamPlayer, statsById, wikiByName));
    ensureAllPositions(teamPlayers);
    playersByTeam.push({ teamId: team.teamId, list: teamPlayers });
    for (const player of teamPlayers) players[player.id] = player;
  }

  const sortedPlayerIds = Object.keys(players).sort((a, b) => {
    const na = Number(a.slice(4));
    const nb = Number(b.slice(4));
    return na - nb || a.localeCompare(b);
  });
  const sortedPlayers = {};
  for (const id of sortedPlayerIds) sortedPlayers[id] = players[id];

  const order = new Map(TEAM_ORDER.map((teamId, index) => [teamId, index]));
  const teams = [...playersByTeam]
    .sort((a, b) => order.get(a.teamId) - order.get(b.teamId))
    .map(({ teamId, list }) => ({ teamId, players: list.map((p) => p.id) }));

  const asOf = todayIso();
  return {
    version: 1,
    season: 2026,
    label: '2026-27',
    asOf,
    sources: [
      {
        id: 'espn-roster',
        name: 'ESPN NBA rosters',
        url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{slug}/roster',
        retrievedAt: asOf,
        license: 'ESPN terms; facts only',
      },
      {
        id: 'espn-stats',
        name: 'ESPN NBA 2025-26 stats',
        url: 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete',
        retrievedAt: asOf,
        license: 'ESPN terms; facts only',
      },
      {
        id: 'wikipedia-roster',
        name: 'Wikipedia NBA team rosters',
        url: WIKI_SOURCE_URL,
        retrievedAt: asOf,
        license: 'CC BY-SA 4.0',
      },
    ],
    teams,
    players: sortedPlayers,
    freeAgents: [],
  };
}

/* --------------------------- PASO 2: validación ------------------------ */

function validate(output) {
  const errors = [];
  const playerList = Object.values(output.players);
  const statsCount = playerList.filter((p) => p.stats).length;
  const salaryCount = playerList.filter((p) => p.salary !== undefined).length;

  if (output.teams.length !== 30) errors.push(`teams: ${output.teams.length} (esperado 30)`);
  const teamIds = output.teams.map((t) => t.teamId);
  if (teamIds.join(',') !== TEAM_ORDER.join(',')) {
    errors.push(`orden/ids de teams distinto del esperado: ${teamIds.join(',')}`);
  }
  if (playerList.length < 450 || playerList.length > 520) {
    errors.push(`jugadores: ${playerList.length} (esperado 450-520)`);
  }
  for (const team of output.teams) {
    if (team.players.length < 13 || team.players.length > 18) {
      errors.push(`${team.teamId}: ${team.players.length} jugadores (esperado 13-18)`);
    }
    const positions = new Set(team.players.map((id) => output.players[id]?.pos));
    for (const pos of POS_ORDER) {
      if (!positions.has(pos)) errors.push(`${team.teamId}: sin posición ${pos}`);
    }
  }
  const ids = Object.keys(output.players);
  const badIds = ids.filter((id) => !/^nba-\d+$/.test(id));
  if (badIds.length > 0) errors.push(`ids inválidos: ${badIds.slice(0, 5).join(', ')}`);
  if (new Set(ids).size !== ids.length) errors.push('ids duplicados');
  if (statsCount < 430) errors.push(`con stats: ${statsCount} (esperado >= 430)`);
  if (salaryCount < 250) errors.push(`con salario: ${salaryCount} (esperado >= 250)`);
  for (const player of playerList) {
    if (!POS_ORDER.includes(player.pos)) errors.push(`${player.id}: pos ${player.pos}`);
    if (!(player.heightCm >= 175 && player.heightCm <= 232)) {
      errors.push(`${player.id}: heightCm ${player.heightCm}`);
    }
    if (!(player.weightKg >= 70 && player.weightKg <= 160)) {
      errors.push(`${player.id}: weightKg ${player.weightKg}`);
    }
    if (!player.birthDate || Number.isNaN(Date.parse(player.birthDate))) {
      errors.push(`${player.id}: birthDate ${player.birthDate}`);
    }
    if (!player.nat) errors.push(`${player.id}: nat vacío`);
  }

  return { errors, statsCount, salaryCount };
}

/* ------------------------------- main ---------------------------------- */

async function main() {
  const rosterTeams = await fetchRosters();
  if (!rosterTeams) return;

  console.log('\n--- PASO 2: stats 2025-26 ---');
  const statsData = await fetchJson(STATS_URL);
  const statsById = parseStats(statsData);
  console.log(`Atletas con stats (gp>=1): ${statsById.size}`);

  console.log('\n--- PASO 3: plantillas de Wikipedia ---');
  const { byName: wikiByName, stats: wikiStats } = await fetchWikiRosters();
  console.log(`Plantillas OK: ${wikiStats.templates}/${WIKI_TEAMS.length}`
    + ` (fallos: ${wikiStats.failed}), jugadores wiki: ${wikiStats.players}`);

  const output = buildOutput(rosterTeams, statsById, wikiByName);
  const playerList = Object.values(output.players);
  const withStats = playerList.filter((p) => p.stats).length;
  const statsMatched = playerList.filter((p) => statsById.has(p.espnId)).length;

  // Cruce calculado con los nombres de ESPN (antes del enriquecimiento)
  const espnKeys = rosterTeams.flatMap((team) =>
    team.players.map((p) => nameKey(p.firstName, p.lastName)));
  const espnKeySet = new Set(espnKeys);
  const wikiMatched = espnKeys.filter((key) => wikiByName.has(key)).length;
  const wikiWithoutEspn = [...wikiByName.keys()].filter((key) => !espnKeySet.has(key)).length;
  console.log(`Cruce roster<->stats por athlete.id: ${statsMatched}/${playerList.length}`);
  console.log(`Cruce ESPN<->Wikipedia por nombre:    ${wikiMatched}/${espnKeys.length}`
    + ` (wiki sin par en ESPN: ${wikiWithoutEspn})`);

  const { errors, statsCount, salaryCount } = validate(output);
  if (errors.length > 0) {
    console.error('\nVALIDACIÓN FALLIDA:');
    for (const error of errors.slice(0, 40)) console.error(`  - ${error}`);
    if (errors.length > 40) console.error(`  ... y ${errors.length - 40} más`);
    console.error(`\nNo se escribió ${FINAL_PATH}.`);
    process.exitCode = 1;
    return;
  }

  const json = `${JSON.stringify(output, null, 2)}\n`;
  await writeFile(FINAL_TMP_PATH, json, 'utf8');
  await rename(FINAL_TMP_PATH, FINAL_PATH);

  const byPos = {};
  for (const pos of POS_ORDER) byPos[pos] = 0;
  for (const player of playerList) byPos[player.pos] += 1;

  const twoWayCount = playerList.filter((p) => p.twoWay).length;
  const accents = playerList.filter((p) => /[^\x00-\x7F]/.test(`${p.first} ${p.last}`)).length;
  const wikiPosCount = playerList.filter((p) => p.posSource === 'wiki').length;
  const fromWiki = espnKeys.filter((key) => wikiByName.has(key)).length;

  console.log('\n--- RESUMEN ---');
  console.log(`Equipos:                 ${output.teams.length}`);
  console.log(`Jugadores:               ${playerList.length}`);
  console.log(`Con stats:               ${statsCount}`);
  console.log(`Con salario:             ${salaryCount}`);
  console.log(`Two-way:                 ${twoWayCount}`);
  console.log(`Nombres con acentos:     ${accents}`);
  console.log(`Cruce Wikipedia/ESPN:    ${fromWiki}/${espnKeys.length} (plantillas wiki: ${wikiStats.templates}/${WIKI_TEAMS.length}, jugadores wiki: ${wikiStats.players})`);
  console.log(`Posición vía Wikipedia:  ${wikiPosCount}`);
  console.log(`Por posición:            ${POS_ORDER.map((pos) => `${pos}=${byPos[pos]}`).join(' ')}`);
  console.log(`Tamaño JSON:             ${Buffer.byteLength(json, 'utf8')} bytes`);
  console.log(`Escrito en:              ${FINAL_PATH}`);
}

main().catch((error) => {
  console.error('Fallo inesperado:', error);
  process.exit(1);
});
