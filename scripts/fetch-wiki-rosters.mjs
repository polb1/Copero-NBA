#!/usr/bin/env node
// Descarga plantillas reales de Wikipedia para los clubes del juego que no cubren
// la API de Euroliga/EuroCup ni ESPN. Solo hechos: no inventa jugadores ni entrenadores.
// Fuente: Wikipedia (CC BY-SA 4.0), acción `raw`, con redirects y transclusiones.
import { readFile, writeFile } from 'node:fs/promises';

const AS_OF = new Date('2026-10-26T00:00:00Z');
const API = 'https://en.wikipedia.org/w/api.php';
const RAW = 'https://en.wikipedia.org/w/index.php';
const THROTTLE = 1200;
const UA = 'nba-legacy-roster-fetch/1.0 (local; data import)';

const ALIAS = {
  'Unicaja Málaga': 'Baloncesto Málaga',
  'Gran Canaria': 'CB Gran Canaria',
  'Casademont Zaragoza': 'Basket Zaragoza',
  'Río Breogán': 'CB Breogán',
  'Surne Bilbao': 'Bilbao Basket',
  'Galatasaray': "Galatasaray S.K. (men's basketball)",
  'AEK Atenas': 'AEK Athens B.C.',
  'Aris Salónica': 'Aris Thessaloniki B.C.',
  'Estrella Roja': 'KK Crvena zvezda',
  'Maccabi Tel Aviv': 'Maccabi Tel Aviv B.C.',
  'Hapoel Tel Aviv': 'Hapoel Tel Aviv B.C.',
  'AS Monaco': 'AS Monaco Basket',
  'ALBA Berlín': 'Alba Berlin',
  'Mega Basket': 'KK Mega Basket',
  'FMP': 'KK FMP',
  'Rytas Vilnius': 'BC Rytas',
  'Lietkabelis': 'BC Lietkabelis',
  'Metropolitans 92': 'Metropolitans Basketball Club',
  'JL Bourg': 'JL Bourg Basket',
  'Cholet Basket': 'Cholet Basket',
  'ratiopharm Ulm': 'Ratiopharm Ulm',
  'Niners Chemnitz': 'Niners Chemnitz',
  'Benfica': 'S.L. Benfica (basketball)',
  'FC Porto': 'FC Porto (basketball)',
  'Sporting CP': 'Sporting CP (basketball)',
  'Filou Oostende': 'Filou Oostende',
  'Antwerp Giants': 'Antwerp Giants',
  'Heroes Den Bosch': 'Heroes Den Bosch',
  'Śląsk Wrocław': 'Śląsk Wrocław (basketball)',
  'Anwil Włocławek': 'Anwil Włocławek',
  'Legia Varsovia': 'Legia Warsaw (basketball)',
  'ERA Nymburk': 'ČEZ Nymburk',
  'Cibona': 'KK Cibona',
  'KK Split': 'KK Split',
  'KK Zadar': 'KK Zadar',
  'Igokea': 'KK Igokea',
  'Krka Novo Mesto': 'KK Krka',
  'VEF Rīga': 'VEF Rīga',
  'BC Kalev': 'BC Kalev/Cramo',
  'Kauhajoki Karhu': 'Kauhajoki Karhu Basket',
  'Prometey': 'BC Prometey',
  'CSKA Moscú': 'PBC CSKA Moscow',
  'UNICS Kazán': 'UNICS Kazan',
  'Zenit San Petersburgo': 'BC Zenit Saint Petersburg',
  'Falco Szombathely': 'Falco KC Szombathely',
  'Levski Sofía': 'BC Levski Sofia',
  'BC Vienna': 'BC Vienna',
  'Fribourg Olympic': 'Fribourg Olympic Basket',
  'Bakken Bears': 'Bakken Bears',
  'Norrköping Dolphins': 'Norrköping Dolphins',
  'Rustavi': 'BC Rustavi',
  'Boca Juniors': 'Boca Juniors (basketball)',
  'Quimsa': 'Quimsa',
  'Instituto de Córdoba': 'Instituto ACC (basketball)',
  'Obras Sanitarias': 'Obras Sanitarias',
  'Flamengo': 'Flamengo Basketball',
  'Franca': 'Franca Basquetebol Clube',
  'Minas': 'Minas Tênis Clube (basketball)',
  'São Paulo': 'São Paulo FC (basketball)',
  'Nacional': 'Club Nacional de Football (basketball)',
  'Diablos Rojos del México': 'Diablos Rojos del México',
  'Halcones de Xalapa': 'Halcones de Xalapa',
  'Astros de Jalisco': 'Astros de Jalisco',
  'Cangrejeros de Santurce': 'Cangrejeros de Santurce',
  'Vaqueros de Bayamón': 'Vaqueros de Bayamón',
  'Capitanes de Arecibo': 'Capitanes de Arecibo',
  'Guaros de Lara': 'Guaros de Lara',
  'San Miguel Beermen': 'San Miguel Beermen',
  'Barangay Ginebra': 'Barangay Ginebra San Miguel',
  'TNT Tropang Giga': 'TNT Tropang Giga',
  'Al Riyadi': 'Al Riyadi Club Beirut',
  'Al Ahli': 'Al Ahli (basketball)',
  'Petro de Luanda': 'Atlético Petróleos de Luanda',
  'APR': 'APR BBC',
  'AS Douanes': 'AS Douanes (basketball)',
  'Al Ahly': 'Al Ahly (basketball)',
  'FUS Rabat': 'FUS Rabat (basketball)',
  'City Oilers': 'City Oilers',
  'US Monastir': 'US Monastir (basketball)',
  'Kwara Falcons': 'Kwara Falcons',
  'ABC Fighters': 'ABC Fighters',
  'SLAC': 'SLAC (basketball)',
  'Maliens': 'Stade Malien (basketball)',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

async function http(url, asText = true) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(8000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    return asText ? res.text() : res.json();
  }
  return null;
}

const rawUrl = (title) => `${RAW}?title=${encodeURIComponent(title)}&action=raw`;

async function fetchRaw(title) {
  let current = title;
  for (let hop = 0; hop < 3; hop++) {
    const text = await http(rawUrl(current));
    if (!text) return null;
    const redirect = text.match(/^\s*#REDIRECT\s*\[\[([^\]|#]+)/i);
    if (!redirect) return { title: current, text };
    current = redirect[1].trim();
    await sleep(THROTTLE);
  }
  return null;
}

const cleanName = (name) => {
  if (!name) return '';
  const t = name.trim();
  const piped = t.match(/\[\[([^\]|]*)\|([^\]]*)\]\]/);
  if (piped) return piped[2].trim();
  const plain = t.match(/\[\[([^\]]*)\]\]/);
  if (plain) return plain[1].trim();
  return t;
};

function findTranscludedPage(text) {
  const section = text.match(/\{\{\s*#\s*section:\s*([^|{}]+)\s*\|\s*roster\s*\}\}/i);
  if (section) return section[1].trim();
  const transcluded = text.match(/\{\{\s*transcluded\s+section\s*\|\s*([^|}]+)/i);
  if (transcluded) return transcluded[1].trim();
  return null;
}

function extractBlocks(text, template) {
  const blocks = [];
  const regex = new RegExp(`\\{\\{\\s*(?:${template})\\b`, 'gi');
  let match;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    if (end > start) { blocks.push(text.slice(start, end)); regex.lastIndex = end; }
    else regex.lastIndex = start + 1;
  }
  return blocks;
}

function paramsOf(block) {
  const params = {};
  const re = /\|\s*([a-z_]+)\s*=\s*([^|}]*)/gi;
  let m;
  while ((m = re.exec(block)) !== null) params[m[1].toLowerCase()] = m[2].trim();
  return params;
}

function parsePlayer(block) {
  const p = paramsOf(block);
  if ((p.note || '').toUpperCase() === 'Y') return null; // canterano / youth
  const name = p.name
    ? cleanName(p.name).replace(/\s+/g, ' ').trim()
    : p.first && p.last
      ? `${cleanName(p.first)} ${cleanName(p.last)}`.replace(/\s+/g, ' ').trim()
      : '';
  if (!name) return null;

  let heightCm = null;
  if (p.m) {
    const meters = Number.parseFloat(p.m.replace(',', '.'));
    if (!Number.isNaN(meters) && meters > 1 && meters < 3) heightCm = Math.round(meters * 100);
  } else if (p.ft) {
    const feet = Number.parseInt(p.ft, 10);
    const inches = Number.parseInt(p.in || '0', 10);
    if (!Number.isNaN(feet)) heightCm = Math.round((feet * 12 + (Number.isNaN(inches) ? 0 : inches)) * 2.54);
  }

  const posRaw = (p.pos || '').toUpperCase().split('/')[0].trim();
  let pos = ['PG', 'SG', 'SF', 'PF', 'C'].includes(posRaw)
    ? posRaw
    : posRaw === 'G'
      ? (heightCm >= 193 ? 'SG' : 'PG')
      : posRaw === 'F'
        ? (heightCm >= 203 ? 'PF' : 'SF')
        : null;

  let age = null;
  if (p.year) {
    const y = Number.parseInt(p.year, 10);
    if (!Number.isNaN(y)) {
      if (p.month && p.date) {
        const birth = new Date(Date.UTC(y, Number.parseInt(p.month, 10) - 1, Number.parseInt(p.date, 10)));
        age = AS_OF.getUTCFullYear() - birth.getUTCFullYear();
        const monthDiff = AS_OF.getUTCMonth() - birth.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && AS_OF.getUTCDate() < birth.getUTCDate())) age -= 1;
      } else {
        age = AS_OF.getUTCFullYear() - y;
      }
    }
  }

  if (!pos && heightCm) {
    pos = heightCm >= 208 ? 'C' : heightCm >= 201 ? 'PF' : heightCm >= 196 ? 'SF' : heightCm >= 190 ? 'SG' : 'PG';
  }

  const num = Number.parseInt(p.num ?? p.no, 10);

  return {
    name,
    pos,
    nat: p.nat ? p.nat.toUpperCase().slice(0, 3) : null,
    age,
    heightCm,
    number: Number.isNaN(num) ? null : num,
  };
}

/** Devuelve el texto de la primera sección (== Título ==) que contenga una plantilla de roster. */
function firstRosterSection(text) {
  const heading = /^={2,}\s*([^=\n]+?)\s*={2,}\s*$/gm;
  const marks = [];
  let m;
  while ((m = heading.exec(text)) !== null) marks.push({ index: m.index, end: heading.lastIndex, title: m[1] });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].end;
    const stop = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const chunk = text.slice(start, stop);
    if (/\{\{\s*(?:player3|player2)\b/i.test(chunk)) return chunk;
  }
  return text;
}

function parsePlayers(text) {
  const section = firstRosterSection(text);
  const blocks = [
    ...extractBlocks(section, 'player3'),
    ...extractBlocks(section, 'player2'),
    ...extractBlocks(section, 'bs player'),
  ];
  const seen = new Set();
  const out = [];
  for (const block of blocks) {
    const p = parsePlayer(block);
    if (!p || seen.has(p.name)) continue;
    seen.add(p.name);
    out.push(p);
  }
  return out;
}

function parseCoach(text) {
  const headMatch = /\|\s*head_coach\s*=\s*/i.exec(text);
  const coachMatch = /\|\s*coach\s*=\s*/i.exec(text);
  const match = !headMatch ? coachMatch : !coachMatch ? headMatch : (headMatch.index <= coachMatch.index ? headMatch : coachMatch);
  let chunk = '';
  if (match) {
    // Solo el valor del campo: hasta el siguiente parametro del infobox (multilinea o en una sola linea)
    // o el cierre de la plantilla. Nunca atraviesa un enlace con pipe porque exigimos `=` tras el pipe.
    const rest = text.slice(match.index + match[0].length).replace(/^[ \t]*/, '');
    if (rest.startsWith('|')) return null; // campo vacio: el valor es el siguiente parametro
    const stop = rest.search(/\n\s*\||\n\}\}|\|\s*[a-z_]+\s*=/i);
    chunk = rest.slice(0, stop === -1 ? 200 : stop);
  } else {
    // Solo lineas que declaren el entrenador, no encabezados de seccion ni prosa.
    const line = text.split('\n').find((l) => !/^\s*[=*{|]/.test(l) && /head[ _]?coach\s*[:=]/i.test(l));
    chunk = line ?? '';
  }
  if (!chunk.trim()) return null;

  const candidates = [];
  for (const m of chunk.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    candidates.push((m[2] ?? m[1]).trim());
  }
  if (!candidates.length) {
    const plain = chunk.match(/\{\{\s*(?:bkaicon|flagicon)\s*\|[^}]*\}\}\s*([A-Z][^|{}\n]+)/);
    if (plain) candidates.push(plain[1].trim());
  }
  let name = candidates.find((c) => c.length > 2 && !/^(flagicon|bkaicon|player|transcluded)$/i.test(c));
  if (!name) {
    const plain = chunk
      .replace(/<ref[\s\S]*?<\/ref>/gi, '')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/'''?/g, '')
      .split(/<br\s*\/?>|\n/)[0]
      .replace(/\[\[|\]\]/g, '')
      .trim();
    if (plain) name = plain;
  }
  if (!name) return null;
  name = name.replace(/^\|+\s*/, '').trim();
  // Descarta valores que son competiciones, campos del infobox o encabezados, no personas.
  if (/\b(league|cup|championship|conference|division|basketball|superliga|liga|competition|season|record)\b/i.test(name)) return null;
  if (name.length > 60 || name.split(/\s+/).length > 5) return null;
  if (name.includes('=') || /^[=|{*#]/.test(name)) return null;
  return name.replace(/\s+/g, ' ').trim();
}

/** Entrenador declarado en {{Basketball roster footer|head_coach=...}} (el valor puede ir en la linea siguiente). */
function parseFooterCoach(text) {
  const m = /\|\s*head_coach\s*=\s*([\s\S]*?)(?=\n\s*\|\s*[a-z_]+\s*=|$)/i.exec(text);
  if (!m) return null;
  const value = m[1].trim();
  if (!value) return null;
  const link = value.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (link) return (link[2] ?? link[1]).replace(/\s+/g, ' ').trim();
  const tpl = value.match(/\{\{\s*player\s*\|([^}]*)\}\}/i);
  if (tpl) {
    const parts = tpl[1].split('|').map((x) => x.trim()).filter(Boolean);
    const name = parts[parts.length - 1];
    if (name) return name.replace(/\s+/g, ' ').trim();
  }
  const plain = value.replace(/\{\{[^}]*\}\}/g, '').replace(/^[*\s]+/, '').split('\n')[0].trim();
  if (!plain || plain.includes('=') || plain.startsWith('|')) return null;
  return plain.replace(/\s+/g, ' ').trim();
}

/** Plantilla de plantilla actual: {{Nombre del club current roster}} o {{Nombre del club roster}}. */
function findRosterTemplate(text) {
  for (const m of text.matchAll(/\{\{\s*([^{}|]+?)\s*\}\}/g)) {
    const name = m[1].trim();
    if (/\b(current roster|roster)\b/i.test(name) && !/^(basketball roster|player[23]?|bs player)$/i.test(name)) return name;
  }
  return null;
}

async function searchTitles(club) {
  const url = `${API}?action=query&list=search&srsearch=${encodeURIComponent(`${club} basketball roster`)}&format=json&formatversion=2&srlimit=5`;
  const json = await http(url, false);
  return (json?.query?.search ?? []).map((r) => r.title);
}

async function fetchClub(club) {
  const titles = [ALIAS[club] ?? club];
  for (const title of titles) {
    let page = await fetchRaw(title);
    if (!page) continue;
    let text = page.text;
    const transcluded = findTranscludedPage(text);
    if (transcluded) {
      await sleep(THROTTLE);
      const sub = await fetchRaw(transcluded);
      // Solo usamos la pagina transcluida si aporta mas plantilla que la actual:
      // muchas fichas transcluyen su pagina de records/historial, no el roster.
      const countPlayers = (t) => (t.match(/\{\{\s*player[23]\b/gi) ?? []).length;
      if (sub && countPlayers(sub.text) > countPlayers(text)) {
        text = sub.text;
        page = { title: sub.title, text };
      }
    }
    let players = parsePlayers(text);
    let coach = parseCoach(text) ?? parseFooterCoach(text);

    // Plantillas tipo {{Club current roster}} (KBL, PBA, etc.): se resuelven en Template:.
    if (players.length === 0) {
      const rosterTemplate = findRosterTemplate(text);
      if (rosterTemplate) {
        await sleep(THROTTLE);
        const tpl = await fetchRaw(`Template:${rosterTemplate}`);
        if (tpl) {
          players = parsePlayers(tpl.text);
          coach = coach ?? parseCoach(tpl.text) ?? parseFooterCoach(tpl.text);
          if (players.length > 0) page = { title: tpl.title, text: tpl.text };
        }
      }
    }

    if (players.length === 0) {
      const clubKey = norm(club);
      const aliasKey = norm(ALIAS[club] ?? club);
      for (const alt of await searchTitles(club)) {
        if (alt === page.title) continue;
        const altKey = norm(alt);
        const related = altKey.includes(clubKey) || clubKey.includes(altKey) || altKey.includes(aliasKey) || aliasKey.includes(altKey);
        if (!related) continue;
        await sleep(THROTTLE);
        const altPage = await fetchRaw(alt);
        if (!altPage) continue;
        const altPlayers = parsePlayers(altPage.text);
        if (altPlayers.length > players.length) {
          players = altPlayers;
          coach = coach ?? parseCoach(altPage.text) ?? parseFooterCoach(altPage.text);
          page = altPage;
        }
        if (players.length >= 9) break;
      }
    }
    return { title: page.title, coach, players, status: players.length ? 'ok' : 'empty' };
  }
  return { title: null, coach: null, players: [], status: 'no-page' };
}

const euroSource = await readFile('src/data/clubs.ts', 'utf8');
const block = euroSource.match(/export const EURO_CLUBS[^=]*=\s*\[(.*?)\];/s);
if (!block) throw new Error('EURO_CLUBS no encontrado');
const gameClubs = [...block[1].matchAll(/name:\s*(?:"([^"]+)"|'([^']+)')/g)].map((m) => m[1] ?? m[2]);

const covered = new Set([
  ...Object.keys(JSON.parse(await readFile('src/data/euroRosters2026.json', 'utf8')).clubs),
  ...Object.keys(JSON.parse(await readFile('src/data/espnRosters2026.json', 'utf8')).nbl),
]);

let existing = { clubs: {} };
try {
  existing = JSON.parse(await readFile('src/data/wikiRosters2026.json', 'utf8'));
} catch {
  // primera ejecucion: no hay cache
}
const out = { version: 1, asOf: '2026-10-26', source: 'wikipedia', clubs: { ...existing.clubs } };
const isOk = (r) => Boolean(r && Array.isArray(r.players) && r.players.length >= 9 && r.coach);

const limit = Number.parseInt(process.env.WIKI_LIMIT ?? '', 10);
const only = process.env.WIKI_ONLY ? new Set(process.env.WIKI_ONLY.split(',').map((c) => c.trim())) : null;
const pending = gameClubs
  .filter((c) => !covered.has(c))
  .filter((c) => (only ? only.has(c) : !isOk(out.clubs[c])))
  .slice(0, Number.isNaN(limit) ? undefined : limit);
console.log(`clubes del juego: ${gameClubs.length}, ya cubiertos: ${covered.size}, pendientes: ${pending.length}`);

const failures = [];

for (const [i, club] of pending.entries()) {
  process.stdout.write(`[${i + 1}/${pending.length}] ${club} ... `);
  const result = await fetchClub(club);
  out.clubs[club] = result;
  const ok = result.players.length >= 9 && result.coach;
  console.log(`${result.status} | ${result.players.length} jugadores | ${result.coach ?? 'sin coach'} | ${ok ? 'OK' : 'INCOMPLETO'}`);
  if (!ok) failures.push(`${club}: ${result.status}, ${result.players.length} jugadores, coach ${result.coach ?? 'NO'} (${result.title ?? 'sin página'})`);
  await sleep(THROTTLE);
  if ((i + 1) % 10 === 0) await writeFile('src/data/wikiRosters2026.json', `${JSON.stringify(out, null, 2)}\n`);
}

await writeFile('src/data/wikiRosters2026.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nfallos: ${failures.length}`);
for (const f of failures) console.log(`  - ${f}`);
