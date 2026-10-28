import { writeFile } from 'node:fs/promises';

const LEAGUES = { nba: 'nba', ncaa: 'mens-college-basketball', nbl: 'nbl' };

async function fetchTeams() {
  const data = {};
  for (const [key, slug] of Object.entries(LEAGUES)) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/${slug}/teams?limit=1000`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${url}`);
    }
    const json = await res.json();
    data[key] = json.sports[0].leagues[0].teams.map(t => ({
      id: t.team.id,
      slug: t.team.slug,
      displayName: t.team.displayName,
      shortDisplayName: t.team.shortDisplayName,
      location: t.team.location,
      abbreviation: t.team.abbreviation
    }));
  }
  await writeFile('src/data/espnTeams.json', JSON.stringify({ version: 1, asOf: '2026-10-26', leagues: data }, null, 2));
  console.log(`nba: ${data.nba.length}, ncaa: ${data.ncaa.length}, nbl: ${data.nbl.length}`);
}

fetchTeams().catch(console.error);