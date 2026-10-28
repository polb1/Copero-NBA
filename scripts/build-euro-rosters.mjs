#!/usr/bin/env node
// Transforma la respuesta cruda de la API oficial Euroliga/EuroCup en rosters normalizados
// para los clubes del juego. Solo hechos: nombre, posición, nacionalidad, edad, altura, dorsal
// y entrenador. No inventa nada: si un club no está en E/U, no aparece en la salida.
import { readFile, writeFile } from 'node:fs/promises';

const SRC = 'src/data/euroApiRaw2026.json';
const CLUBS = 'src/data/clubs.ts';
const OUT = 'src/data/euroRosters2026.json';
const AS_OF = new Date('2026-10-26T00:00:00Z');

const ALIAS = {
  'Real Madrid': 'Real Madrid',
  'FC Barcelona': 'FC Barcelona',
  'Baskonia': 'Kosner Baskonia Vitoria-Gasteiz',
  'Valencia Basket': 'Valencia Basket',
  'La Laguna Tenerife': 'La Laguna Tenerife',
  'Fenerbahçe': 'Fenerbahce Tarfin Istanbul',
  'Anadolu Efes': 'Anadolu Efes Istanbul',
  'Beşiktaş': 'Besiktas Istanbul',
  'Türk Telekom': 'Turk Telekom Ankara',
  'Olympiacos': 'Olympiacos Piraeus',
  'Panathinaikos': 'Panathinaikos AKTOR Athens',
  'PAOK': 'PAOK Thessaloniki',
  'Virtus Bologna': 'Virtus Bologna',
  'Partizan': 'Partizan Mozzart Bet Belgrade',
  'Cedevita Olimpija': 'Cedevita Olimpija Ljubljana',
  'Budućnost': 'Buducnost VOLI Podgorica',
  'Žalgiris Kaunas': 'Zalgiris Kaunas',
  'Lietkabelis': 'Lietkabelis Panevezys',
  'LDLC ASVEL': 'LDLC ASVEL Villeurbanne',
  'Paris Basketball': 'Paris Basketball',
  'JL Bourg': 'Cosea JL Bourg-en-Bresse',
  'Bayern Múnich': 'FC Bayern Munich',
  'ratiopharm Ulm': 'ratiopharm ulm',
  'Niners Chemnitz': 'NINERS Chemnitz',
  'U-BT Cluj-Napoca': 'U-BT Cluj-Napoca',
  'London Lions': 'London Lions',
  'Olimpia Milano': 'Armani Olimpia Milan',
  'Estrella Roja': 'Crvena Zvezda Meridianbet Belgrade',
  'Aris Salónica': 'Aris Thessaloniki',
  'Reyer Venezia': 'Umana Reyer Venice',
  'Śląsk Wrocław': 'Slask Wroclaw',
};

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const SMALL = new Set(['de', 'del', 'da', 'das', 'do', 'dos', 'van', 'von', 'der', 'den', 'la', 'le', 'di', 'du', 'el']);
const SUFFIX = /^(jr|sr|ii|iii|iv|v)$/i;
const SUFFIX_LABEL = { JR: 'Jr.', SR: 'Sr.', II: 'II', III: 'III', IV: 'IV', V: 'V' };

function titleCase(word) {
  if (SUFFIX.test(word)) return SUFFIX_LABEL[word.toUpperCase()] ?? word;
  return word
    .split('-')
    .map((part) => part
      .split("'")
      .map((chunk) => (chunk.length <= 2 && /^[A-Z]{2,3}$/.test(chunk)
        ? chunk
        : chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase()))
      .join("'"))
    .join('-');
}

/** "WALKER IV, LONNIE" -> "Lonnie Walker IV" */
function personName(raw) {
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, ' ').trim();
  let first;
  let last;
  if (clean.includes(',')) {
    const [surname, given] = clean.split(',', 2);
    first = given.trim();
    last = surname.trim();
  } else {
    const parts = clean.split(' ');
    first = parts.slice(0, -1).join(' ') || parts[0];
    last = parts.length > 1 ? parts[parts.length - 1] : '';
  }
  const words = [...first.split(' '), ...last.split(' ')].filter(Boolean);
  return words
    .map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : titleCase(w)))
    .join(' ');
}

function ageFrom(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  let age = AS_OF.getUTCFullYear() - d.getUTCFullYear();
  const m = AS_OF.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && AS_OF.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

function readGameClubs(source) {
  const block = source.match(/export const EURO_CLUBS[^=]*=\s*\[(.*?)\];/s);
  if (!block) throw new Error('EURO_CLUBS no encontrado en clubs.ts');
  return [...block[1].matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);
}

const raw = JSON.parse(await readFile(SRC, 'utf8'));
const gameClubs = readGameClubs(await readFile(CLUBS, 'utf8'));

// Índice de clubes de la API con su competición
const apiClubs = [];
for (const comp of ['E', 'U']) {
  for (const club of raw.competitions[comp].clubs) {
    apiClubs.push({ code: club.code, name: club.name, comp });
  }
}

function findApiClub(gameName) {
  const alias = ALIAS[gameName];
  if (alias) {
    const exact = apiClubs.find((c) => c.name === alias);
    if (exact) return exact;
  }
  const n = norm(gameName);
  return apiClubs.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name)));
}

/** La API solo distingue Guard/Forward/Center. Reparte PG/SG y SF/PF por altura dentro del grupo. */
function assignPositions(players) {
  const groups = { Guard: [], Forward: [], Center: [] };
  for (const p of players) (groups[p.positionName] ?? groups.Forward).push(p);
  const pos = new Map();
  for (const [group, list] of Object.entries(groups)) {
    const sorted = [...list].sort((a, b) => (a.person.height || 0) - (b.person.height || 0));
    sorted.forEach((p, i) => {
      if (group === 'Guard') pos.set(p, i < Math.ceil(sorted.length / 2) ? 'PG' : 'SG');
      else if (group === 'Forward') pos.set(p, i < Math.ceil(sorted.length / 2) ? 'SF' : 'PF');
      else pos.set(p, 'C');
    });
  }
  return players.map((p) => ({ ...p, pos: pos.get(p) ?? 'SF' }));
}

const out = { version: 1, asOf: '2026-10-26', source: 'euroleague-api', clubs: {} };
const report = [];

for (const gameName of gameClubs) {
  const api = findApiClub(gameName);
  if (!api) continue;

  const people = raw.competitions[api.comp].people.filter((p) => p.club?.code === api.code);
  const coaches = people.filter((p) => p.typeName === 'Coach');
  // Solo jugadores adultos (la API incluye canteranos de 16-17 años) y como máximo 16,
  // priorizando los contratos más antiguos, que son el núcleo sénior de la plantilla.
  const players = people
    .filter((p) => p.typeName === 'Player')
    .filter((p) => (ageFrom(p.person.birthDate) ?? 0) >= 18)
    .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')))
    .slice(0, 16);

  const entry = {
    source: 'euroleague-api',
    comp: api.comp,
    apiName: api.name,
    coach: coaches.length ? personName(coaches[0].person.name) : null,
    coachNat: coaches.length ? (coaches[0].person.country?.code ?? null) : null,
    players: assignPositions(players).map((p) => ({
      name: personName(p.person.name),
      pos: p.pos,
      nat: p.person.country?.code?.trim() || null,
      age: ageFrom(p.person.birthDate),
      heightCm: p.person.height > 0 ? p.person.height : null,
      number: Number.isNaN(parseInt(p.dorsal, 10)) ? null : parseInt(p.dorsal, 10),
    })),
  };

  out.clubs[gameName] = entry;
  if (entry.players.length < 9 || !entry.coach) {
    report.push(`${gameName} (${api.comp}): ${entry.players.length} jugadores, coach ${entry.coach ?? 'NO'}`);
  }
}

await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

const total = Object.keys(out.clubs).length;
const complete = Object.values(out.clubs).filter((c) => c.players.length >= 9 && c.coach).length;
console.log(`clubes mapeados: ${total}/${gameClubs.length}`);
console.log(`completos (>=9 jugadores + entrenador): ${complete}`);
console.log(`incompletos: ${report.length ? `\n  ${report.join('\n  ')}` : 'ninguno'}`);
