import { writeFile } from 'node:fs/promises';

const USER_AGENT = 'nba-legacy-roster-fetch/1.0 (local)';
const BASE = 'https://api-live.euroleague.net/v2';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchPeople(comp, season) {
  const all = [];
  let offset = 0;
  for (;;) {
    const url = `${BASE}/competitions/${comp}/seasons/${season}/people?limit=1000&offset=${offset}`;
    const json = await fetchJson(url);
    const page = json.data ?? [];
    all.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  const eClubs = await fetchJson(`${BASE}/competitions/E/seasons/E2026/clubs`);
  const ePeople = await fetchPeople('E', 'E2026');
  const uClubs = await fetchJson(`${BASE}/competitions/U/seasons/U2026/clubs`);
  const uPeople = await fetchPeople('U', 'U2026');

  const out = {
    version: 1,
    asOf: '2026-10-26',
    competitions: {
      E: { clubs: eClubs.data, people: ePeople },
      U: { clubs: uClubs.data, people: uPeople },
    },
  };

  await writeFile('src/data/euroApiRaw2026.json', JSON.stringify(out, null, 2));
  console.log(`E clubs: ${eClubs.data.length}, E people: ${ePeople.length}, U clubs: ${uClubs.data.length}, U people: ${uPeople.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });