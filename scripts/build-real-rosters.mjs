#!/usr/bin/env node
// Fusiona las fuentes reales (Euroliga/EuroCup, ESPN, Wikipedia y overrides manuales)
// en un unico snapshot para el juego. Los nombres, equipos, nacionalidades, alturas,
// dorsales y entrenadores son datos reales; OVR/POT/arquetipo son estimaciones del juego.
import { readFile, writeFile } from 'node:fs/promises';

const AS_OF = '2026-10-26';
const OUT = 'src/data/realRosters2026.json';
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const clubsSrc = await readFile('src/data/clubs.ts', 'utf8');
const blockOf = (name) => {
  const m = clubsSrc.match(new RegExp(`export const ${name}[^=]*=\\s*\\[(.*?)\\];`, 's'));
  if (!m) throw new Error(`${name} no encontrado en clubs.ts`);
  return m[1];
};
const parseClubs = (name) =>
  [...blockOf(name).matchAll(/\{ name: (?:"([^"]+)"|'([^']+)'), league: (?:"([^"]+)"|'([^']+)'), country: (?:"([^"]+)"|'([^']+)'), tier: (\d) \}/g)]
    .map((m) => ({ name: m[1] ?? m[2], league: m[3] ?? m[4], country: m[5] ?? m[6], tier: Number(m[7]) }));

const euroClubs = parseClubs('EURO_CLUBS');
const ncaaClubs = parseClubs('NCAA_PROGRAMS');

const strengths = {};
const strengthBlock = clubsSrc.match(/export const LEAGUE_STRENGTH[^=]*=\s*\{([\s\S]*?)\};/);
if (strengthBlock) {
  for (const m of strengthBlock[1].matchAll(/(?:'([^']+)'|([A-Za-z]+)):\s*(-?\d+(?:\.\d+)?)/g)) {
    strengths[m[1] ?? m[2]] = Number(m[3]);
  }
}

const euro = await readJson('src/data/euroRosters2026.json');
const espn = await readJson('src/data/espnRosters2026.json');
const wiki = await readJson('src/data/wikiRosters2026.json');
const extra = await readJson('src/data/extraRosters2026.json');
const overrides = await readJson('src/data/realRostersOverrides.json');
const nbaCoachesSnap = await readJson('src/data/nbaCoaches2026.json');

const NAT_FIX = {
  SVN: 'SLO', NGR: 'NGA', MTG: 'MNE', SER: 'SRB', BHS: 'BAH', BER: 'BMU',
  ENG: 'GBR', SCO: 'GBR', WAL: 'GBR', NIR: 'GBR', IRI: 'IRN', TPE: 'TWN',
  CRC: 'CRI', ISV: 'VIR', MAD: 'MDG', TRI: 'TTO', ZAI: 'COD',
};
const POS_FIX = { G: 'SG', F: 'SF', GF: 'SF', FG: 'SF', FC: 'PF', CF: 'PF', 'G/F': 'SF', 'F/C': 'PF', 'F/G': 'SF', 'C/F': 'PF' };
const VALID_POS = new Set(['PG', 'SG', 'SF', 'PF', 'C']);
const HEIGHT_BY_POS = { PG: 188, SG: 194, SF: 201, PF: 206, C: 211 };
const ARCH_BY_POS = {
  PG: ['playmaker', 'playmaker', 'sharpshooter', 'twoWay'],
  SG: ['sharpshooter', 'slasher', 'twoWay', 'threeAndD'],
  SF: ['twoWay', 'threeAndD', 'slasher', 'allAround'],
  PF: ['stretchBig', 'postScorer', 'allAround', 'twoWay'],
  C: ['rimProtector', 'postScorer', 'stretchBig', 'rimProtector'],
};

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const normName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const normPos = (raw, heightCm) => {
  const p = String(raw ?? '').toUpperCase().replace(/\s+/g, '').trim();
  if (VALID_POS.has(p)) return p;
  if (POS_FIX[p]) return POS_FIX[p];
  if (heightCm) return heightCm >= 208 ? 'C' : heightCm >= 203 ? 'PF' : heightCm >= 198 ? 'SF' : heightCm >= 190 ? 'SG' : 'PG';
  return 'SF';
};
const normNat = (raw) => {
  const c = String(raw ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return 'UNK';
  return NAT_FIX[c] ?? c;
};
const normCoach = (raw) => {
  const name = normName(raw);
  if (!name || name.length > 60) return null;
  if (/\b(league|cup|championship|conference|division|basketball|superliga|liga|competition|season|record|tbd)\b/i.test(name)) return null;
  if (name.split(' ').length > 5) return null;
  return name;
};

const pickSource = (club) => {
  const override = overrides.clubs?.[club.name];
  if (override) return { ...override, source: override.source ?? 'manual-override' };
  if (club.league === 'NBL Australia') {
    const nbl = espn.nbl?.[club.name];
    if (nbl?.players?.length) return { ...nbl, source: 'espn-nbl' };
  }
  const eu = euro.clubs?.[club.name];
  if (eu?.players?.length) return { ...eu, source: eu.source ?? 'euroleague-api' };
  const ex = extra.clubs?.[club.name];
  if (ex?.players?.length) return { ...ex, source: ex.source ?? 'extra' };
  const ncaa = espn.ncaa?.[club.name];
  if (ncaa?.players?.length) return { ...ncaa, source: 'espn-ncaa' };
  const w = wiki.clubs?.[club.name];
  if (w?.players?.length) return { ...w, source: 'wikipedia' };
  return null;
};

const compOf = (club) => (club.league === 'NBL Australia' ? 'NBL' : ncaaClubs.some((c) => c.name === club.name) ? 'NCAA' : 'EUR');

const decorate = (players, club, comp) => {
  const seen = new Set();
  const clean = [];
  for (const raw of players) {
    const name = normName(raw.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const heightCm = Number.isFinite(raw.heightCm) && raw.heightCm > 140 ? Math.round(raw.heightCm) : null;
    const pos = normPos(raw.pos, heightCm);
    clean.push({
      name,
      pos,
      nat: normNat(raw.nat),
      age: Number.isFinite(raw.age) && raw.age > 14 ? Math.round(raw.age) : null,
      heightCm: heightCm ?? HEIGHT_BY_POS[pos],
      number: Number.isFinite(raw.number) ? Math.round(raw.number) : null,
    });
  }

  const strength = comp === 'NCAA' ? 0 : (strengths[club.league] ?? -3);
  const avg = (comp === 'NCAA' ? 62 : 69) + (3 - club.tier) * 3 + strength * 1.2;
  const top = clamp(Math.round(avg + 8), 50, 90);
  const bottom = clamp(Math.round(avg - 9), 40, 80);

  const scored = clean.map((p) => {
    const age = p.age ?? 25;
    const talent = comp === 'NCAA'
      ? (hash(p.name) / 2 ** 32) * 8 + age * 0.2
      : (hash(p.name) / 2 ** 32) * 6 + age * 0.35;
    return { ...p, _talent: talent };
  }).sort((a, b) => b._talent - a._talent);

  const step = scored.length > 1 ? (top - bottom) / (scored.length - 1) : 0;
  return scored.map((p, i) => {
    const ovr = clamp(Math.round(top - step * i), bottom, top);
    const age = p.age ?? 25;
    const bonus = age <= 19 ? 9 : age <= 21 ? 7 : age <= 23 ? 5 : age <= 25 ? 3 : age <= 27 ? 2 : age <= 29 ? 1 : 0;
    const pot = Math.min(99, ovr + bonus + (hash(p.name + 'pot') % 2));
    const arch = ARCH_BY_POS[p.pos][hash(p.name + 'arch') % ARCH_BY_POS[p.pos].length];
    const { _talent, ...rest } = p;
    return { ...rest, ovr, pot, arch };
  });
};

const out = {
  version: 1,
  asOf: AS_OF,
  note: 'Nombres, equipos, nacionalidades, alturas, dorsales y entrenadores reales. OVR/POT/arquetipo son estimaciones del juego.',
  nbaCoaches: nbaCoachesSnap.coaches,
  clubs: {},
};
const report = { missing: [], incomplete: [], sources: {} };

for (const club of [...euroClubs, ...ncaaClubs]) {
  const comp = compOf(club);
  const source = pickSource(club);
  const players = source?.players?.length ? decorate(source.players, club, comp) : [];
  const coach = normCoach(source?.coach);
  const coachNat = source?.coachNat ? normNat(source.coachNat) : null;
  const entry = {
    league: club.league,
    country: club.country,
    tier: club.tier,
    comp,
    source: source?.source ?? 'none',
    coach,
    coachNat,
    players,
  };
  out.clubs[club.name] = entry;
  if (source) report.sources[entry.source] = (report.sources[entry.source] ?? 0) + 1;
  if (!players.length) report.missing.push(club.name);
  else if (players.length < 9 || !coach) report.incomplete.push(`${club.name} (${players.length} jug., coach ${coach ?? 'NO'})`);
}

await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

const entries = Object.values(out.clubs);
const withRoster = entries.filter((c) => c.players.length > 0).length;
const complete = entries.filter((c) => c.players.length >= 9 && c.coach).length;
console.log(`clubes: ${entries.length}, con plantilla: ${withRoster}, completos (>=9 + entrenador): ${complete}`);
console.log('fuentes:', JSON.stringify(report.sources));
console.log(`sin plantilla (${report.missing.length}): ${report.missing.join(' | ') || 'ninguno'}`);
console.log(`incompletos (${report.incomplete.length}):\n  ${report.incomplete.join('\n  ') || 'ninguno'}`);
