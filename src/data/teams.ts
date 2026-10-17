// The 30 NBA franchises, conferences and divisions (nba.com, consulted 2026-10-17).
// Names are used for identification only. Rosters, coaches and players are fictional.

export interface TeamSeed {
  id: string;
  city: string;
  name: string;
  conf: 'E' | 'W';
  div: string;
  color: string;
  market: 'large' | 'mid' | 'small';
}

export const TEAM_SEEDS: TeamSeed[] = [
  { id: 'BOS', city: 'Boston', name: 'Celtics', conf: 'E', div: 'Atlantic', color: '#1f8a4c', market: 'large' },
  { id: 'BKN', city: 'Brooklyn', name: 'Nets', conf: 'E', div: 'Atlantic', color: '#9a9a9a', market: 'large' },
  { id: 'NYK', city: 'New York', name: 'Knicks', conf: 'E', div: 'Atlantic', color: '#1d5ec9', market: 'large' },
  { id: 'PHI', city: 'Philadelphia', name: '76ers', conf: 'E', div: 'Atlantic', color: '#2257c4', market: 'large' },
  { id: 'TOR', city: 'Toronto', name: 'Raptors', conf: 'E', div: 'Atlantic', color: '#ce1141', market: 'large' },
  { id: 'CHI', city: 'Chicago', name: 'Bulls', conf: 'E', div: 'Central', color: '#ce1141', market: 'large' },
  { id: 'CLE', city: 'Cleveland', name: 'Cavaliers', conf: 'E', div: 'Central', color: '#8a2342', market: 'mid' },
  { id: 'DET', city: 'Detroit', name: 'Pistons', conf: 'E', div: 'Central', color: '#c8102e', market: 'mid' },
  { id: 'IND', city: 'Indiana', name: 'Pacers', conf: 'E', div: 'Central', color: '#fdbb30', market: 'small' },
  { id: 'MIL', city: 'Milwaukee', name: 'Bucks', conf: 'E', div: 'Central', color: '#2e7d4f', market: 'small' },
  { id: 'ATL', city: 'Atlanta', name: 'Hawks', conf: 'E', div: 'Southeast', color: '#e03a3e', market: 'mid' },
  { id: 'CHA', city: 'Charlotte', name: 'Hornets', conf: 'E', div: 'Southeast', color: '#1d9fb5', market: 'small' },
  { id: 'MIA', city: 'Miami', name: 'Heat', conf: 'E', div: 'Southeast', color: '#c8102e', market: 'mid' },
  { id: 'ORL', city: 'Orlando', name: 'Magic', conf: 'E', div: 'Southeast', color: '#0b77bd', market: 'mid' },
  { id: 'WAS', city: 'Washington', name: 'Wizards', conf: 'E', div: 'Southeast', color: '#e31837', market: 'mid' },
  { id: 'DEN', city: 'Denver', name: 'Nuggets', conf: 'W', div: 'Northwest', color: '#fec524', market: 'mid' },
  { id: 'MIN', city: 'Minnesota', name: 'Timberwolves', conf: 'W', div: 'Northwest', color: '#3a7bbf', market: 'mid' },
  { id: 'OKC', city: 'Oklahoma City', name: 'Thunder', conf: 'W', div: 'Northwest', color: '#007ac1', market: 'small' },
  { id: 'POR', city: 'Portland', name: 'Trail Blazers', conf: 'W', div: 'Northwest', color: '#e03a3e', market: 'small' },
  { id: 'UTA', city: 'Utah', name: 'Jazz', conf: 'W', div: 'Northwest', color: '#7b5ea7', market: 'small' },
  { id: 'GSW', city: 'Golden State', name: 'Warriors', conf: 'W', div: 'Pacific', color: '#ffc72c', market: 'large' },
  { id: 'LAC', city: 'LA', name: 'Clippers', conf: 'W', div: 'Pacific', color: '#c8102e', market: 'large' },
  { id: 'LAL', city: 'Los Angeles', name: 'Lakers', conf: 'W', div: 'Pacific', color: '#7a4fc0', market: 'large' },
  { id: 'PHX', city: 'Phoenix', name: 'Suns', conf: 'W', div: 'Pacific', color: '#e56020', market: 'mid' },
  { id: 'SAC', city: 'Sacramento', name: 'Kings', conf: 'W', div: 'Pacific', color: '#6d4fa3', market: 'small' },
  { id: 'DAL', city: 'Dallas', name: 'Mavericks', conf: 'W', div: 'Southwest', color: '#2273c9', market: 'large' },
  { id: 'HOU', city: 'Houston', name: 'Rockets', conf: 'W', div: 'Southwest', color: '#ce1141', market: 'large' },
  { id: 'MEM', city: 'Memphis', name: 'Grizzlies', conf: 'W', div: 'Southwest', color: '#6189b9', market: 'small' },
  { id: 'NOP', city: 'New Orleans', name: 'Pelicans', conf: 'W', div: 'Southwest', color: '#b4975a', market: 'small' },
  { id: 'SAS', city: 'San Antonio', name: 'Spurs', conf: 'W', div: 'Southwest', color: '#a7a9ac', market: 'small' },
];
