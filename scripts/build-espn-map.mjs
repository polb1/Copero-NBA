import fs from 'fs/promises';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

async function buildEspnMap() {
  const [clubsText, espnTeamsText] = await Promise.all([
    fs.readFile('src/data/clubs.ts', 'utf-8'),
    fs.readFile('src/data/espnTeams.json', 'utf-8')
  ]);

  const ncaaPrograms = clubsText.match(/export const NCAA_PROGRAMS[^=]*=\s*\[(.*?)\];/s)[1];
  const ncaaNames = ncaaPrograms.match(/name:\s*'([^']+)'/g).map(name => name.match(/'([^']+)'/)[1]);

  const euroClubs = clubsText.match(/export const EURO_CLUBS[^=]*=\s*\[(.*?)\];/s)[1];
  const nblClubs = euroClubs.match(/name:\s*'([^']+)',\s*league:\s*'NBL Australia'/g).map(club => club.match(/'([^']+)'/)[1]);

  const espnTeams = JSON.parse(espnTeamsText);

  const map = {
    version: 1,
    ncaa: {},
    nbl: {},
    unmatched: { ncaa: [], nbl: [] }
  };

  const findEspnTeam = (name, league) => {
    const normName = norm(name);
    const teams = league === 'NBL Australia' ? espnTeams.leagues.nbl : espnTeams.leagues.ncaa;
    let bestMatch = null;
    let bestMatchLength = Infinity;

    for (const t of teams) {
      const displayName = t.displayName;
      const normDisplay = norm(displayName);
      if (norm(t.location) === normName) {
        return { id: t.id, displayName };
      }
      if (norm(t.shortDisplayName) === normName) {
        return { id: t.id, displayName };
      }
      if (normDisplay.startsWith(normName) && displayName.length < bestMatchLength) {
        bestMatch = { id: t.id, displayName };
        bestMatchLength = displayName.length;
      }
      if (normDisplay.includes(normName) && displayName.length < bestMatchLength) {
        bestMatch = { id: t.id, displayName };
        bestMatchLength = displayName.length;
      }
    }

    return bestMatch;
  };

  for (const name of ncaaNames) {
    const espnTeam = findEspnTeam(name, 'NCAA');
    if (espnTeam) {
      map.ncaa[name] = espnTeam;
    } else {
      map.unmatched.ncaa.push(name);
    }
  }

  for (const name of nblClubs) {
    const espnTeam = findEspnTeam(name, 'NBL Australia');
    if (espnTeam) {
      map.nbl[name] = espnTeam;
    } else {
      map.unmatched.nbl.push(name);
    }
  }

  await fs.writeFile('src/data/espnMap.json', JSON.stringify(map, null, 2));

  console.log(`NCAA mapeados: ${Object.keys(map.ncaa).length}/38`);
  console.log(`NBL mapeados: ${Object.keys(map.nbl).length}/4`);
  console.log('Unmatched NCAA:', map.unmatched.ncaa);
  console.log('Unmatched NBL:', map.unmatched.nbl);
}

buildEspnMap();