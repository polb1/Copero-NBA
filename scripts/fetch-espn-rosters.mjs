import { readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function normalizePlayer(a) {
  const name = a.fullName || a.displayName || `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim();
  if (!name) return null;
  const rawPos = a.position?.abbreviation;
  const pos = rawPos === 'G' ? 'SG' : rawPos === 'F' ? 'SF' : rawPos === 'C' ? 'C' : ['PG', 'SG', 'SF', 'PF'].includes(rawPos) ? rawPos : null;
  const rawNat = a.birthCountry?.abbreviation || (typeof a.birthCountry === 'string' ? a.birthCountry : null) || (typeof a.birthPlace?.country === 'string' ? a.birthPlace.country : null);
  const nat = typeof rawNat === 'string' && /^[A-Z]{3}$/.test(rawNat) ? rawNat : null;
  const age = Number.isFinite(a.age) && a.age > 0 ? a.age : a.dateOfBirth ? new Date('2026-10-26').getFullYear() - new Date(a.dateOfBirth).getFullYear() : null;
  const heightCm = Number.isFinite(a.height) ? Math.round(a.height * 2.54) : a.displayHeight?.match(/(\d+)'\s*(\d+)/) ? Math.round((parseInt(a.displayHeight.match(/(\d+)'\s*(\d+)/)[1], 10) * 12 + parseInt(a.displayHeight.match(/(\d+)'\s*(\d+)/)[2], 10)) * 2.54) : null;
  const parsed = parseInt(a.jersey, 10);
  const number = Number.isNaN(parsed) ? null : parsed;
  return { name, pos, nat, age, heightCm, number };
}

function normalizeCoach(json) {
  const c = Array.isArray(json.coach) ? json.coach[0] : null;
  return c ? `${c.firstName} ${c.lastName}`.trim() : null;
}

async function fetchLeague(mapObj, leagueSlug) {
  const out = {};
  for (const [gameName, team] of Object.entries(mapObj)) {
    if (!team) {
      out[gameName] = { espnId: null, espnName: null, coach: null, players: [] };
      continue;
    }
    await sleep(250);
    const json = await getJson(`${BASE}/${leagueSlug}/teams/${team.id}/roster`);
    const players = (json.athletes ?? []).map(normalizePlayer).filter((p) => p && p.name);
    players.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
    out[gameName] = { espnId: team.id, espnName: team.displayName, coach: normalizeCoach(json), players };
  }
  return out;
}

async function main() {
  const map = JSON.parse(await readFile('src/data/espnMap.json', 'utf-8'));
  const ncaa = await fetchLeague(map.ncaa, 'mens-college-basketball');
  const nbl = await fetchLeague(map.nbl, 'nbl');
  const data = { version: 1, asOf: '2026-10-26', source: 'espn', ncaa, nbl };
  await writeFile('src/data/espnRosters2026.json', JSON.stringify(data, null, 2));
  const ncaaCount = Object.values(ncaa).filter((t) => t.players.length >= 9 && t.coach).length;
  const nblCount = Object.values(nbl).filter((t) => t.players.length >= 9 && t.coach).length;
  console.log(`NCAA: ${ncaaCount}/38 con >=9 jugadores y entrenador`);
  console.log(`NBL: ${nblCount}/4 con >=9 jugadores y entrenador`);
  const partials = Object.values(ncaa).filter((t) => t.players.length < 9 || !t.coach).map((t) => t.espnName);
  console.log('parciales NCAA:', partials.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});