import { writeFile } from 'node:fs/promises';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return await res.json();
}

async function main() {
  const list = await getJson(`${BASE}/teams`);
  const teams = list.sports[0].leagues[0].teams;
  const coaches = {};
  for (const t of teams) {
    await sleep(200);
    const roster = await getJson(`${BASE}/teams/${t.team.id}/roster`);
    const c = Array.isArray(roster.coach) ? roster.coach[0] : null;
    coaches[t.team.abbreviation] = c ? `${c.firstName} ${c.lastName}`.trim() : null;
  }
  await writeFile('src/data/nbaCoaches2026.json', JSON.stringify({ version: 1, asOf: '2026-10-26', source: 'espn-nba-roster', coaches }, null, 2));
  console.log(`NBA coaches: ${Object.keys(coaches).length}/30`);
  console.log('sin entrenador:', Object.keys(coaches).filter((k) => !coaches[k]));
}

main().catch((e) => { console.error(e); process.exit(1); });