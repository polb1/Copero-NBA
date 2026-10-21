export type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const POSITIONS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export type AttrKey =
  | 'three' | 'mid' | 'ft' | 'close' | 'layup' | 'dunk'
  | 'handle' | 'pass' | 'vision'
  | 'speed' | 'accel' | 'strength' | 'vert' | 'stamina'
  | 'perD' | 'intD' | 'steal' | 'block' | 'oreb' | 'dreb'
  | 'offIQ' | 'defIQ' | 'consistency';
export type Attrs = Record<AttrKey, number>;

export type Archetype =
  | 'playmaker' | 'sharpshooter' | 'slasher' | 'twoWay' | 'threeAndD'
  | 'stretchBig' | 'rimProtector' | 'postScorer' | 'allAround';

export type Competition = 'NBA' | 'GLG' | 'NCAA' | 'EUR';
/** Pace: express = 1 decision per season, quick ("Normal") = 2-3, full ("Larga") = 4-5. */
export type Mode = 'express' | 'quick' | 'full' | 'daily';
export type Hand = 'R' | 'L';

export interface StatLine {
  gp: number; gs: number; min: number; pts: number;
  oreb: number; dreb: number; ast: number; stl: number; blk: number;
  tov: number; pf: number;
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  pm: number; dd: number; td: number; qd: number; gmsc: number;
}

export interface BoxLine {
  pid: string; min: number; pts: number; oreb: number; dreb: number; ast: number;
  stl: number; blk: number; tov: number; pf: number;
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  pm: number; starter: boolean;
}

export interface Contract {
  teamId: string;
  /** Salary per season, index 0 = startSeason. */
  salaries: number[];
  startSeason: number;
  kind: 'rookie' | 'standard' | 'two-way' | 'minimum' | 'max' | 'exhibit10' | 'gleague' | 'overseas';
  option?: { type: 'player' | 'team'; season: number };
  rookieScale?: boolean;
  bonus?: { label: string; amount: number; stat: 'gp' | 'ppg' | 'allstar' | 'playoffs'; target: number };
}

export interface Injury {
  name: string;
  severity: 'leve' | 'moderada' | 'grave';
  daysLeft: number;
  totalDays: number;
  playingThrough?: boolean;
}

export interface Player {
  id: string;
  first: string;
  last: string;
  nat: string;
  pos: Pos;
  arch: Archetype;
  birthYear: number;
  age: number;
  height: number; // cm
  weight: number; // kg
  hand: Hand;
  attrs: Attrs;
  pot: number;
  /** True ceiling (user only). `pot` is the scouting estimate that converges towards it. */
  hiddenPot?: number;
  ovr: number;
  teamId: string | null;
  contract: Contract | null;
  injury: Injury | null;
  fatigue: number; // 0-100
  form: number; // -10..10
  yearsPro: number;
  season: StatLine;
  playoffs: StatLine;
  prevGmsc?: number;
  draft?: { season: number; round: number; pick: number; teamId: string } | null;
  isUser?: boolean;
  allStars?: number;
  rings?: number;
  retired?: boolean;
}

export interface Coach {
  name: string;
  rating: number; // 40-95, development + tactics
  style: 'pace' | 'motion' | 'iso' | 'defense' | 'balanced';
  patience: number; // 0-100: tolerance with young players
  hiredSeason: number;
}

export type TeamStatus = 'contender' | 'playoff' | 'middle' | 'rebuild';

export interface TeamSeasonRecord {
  season: number; w: number; l: number; seed: number | null; result: string;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  conf: 'E' | 'W';
  div: string;
  color: string;
  market: 'large' | 'mid' | 'small';
  coach: Coach;
  pace: number;
  status: TeamStatus;
  reputation: number;
  roster: string[];
  w: number; l: number;
  homeW: number; homeL: number; awayW: number; awayL: number;
  pf: number; pa: number;
  streak: number; // +n wins, -n losses
  last10: ('W' | 'L')[];
  history: TeamSeasonRecord[];
  gLeagueName: string;
}

export interface Game {
  id: number;
  day: number;
  home: string;
  away: string;
  played: boolean;
  hs?: number;
  as?: number;
  ot?: number;
  kind: 'regular' | 'playin' | 'playoff';
  seriesId?: string;
}

export interface Series {
  id: string;
  round: number; // 1-4 (4 = finals)
  conf: 'E' | 'W' | 'F';
  high: string; // home-court team
  low: string;
  highSeed: number;
  lowSeed: number;
  winsHigh: number;
  winsLow: number;
  winner?: string;
}

export interface PlayInGame {
  id: string;
  conf: 'E' | 'W';
  home: string;
  away: string;
  winner?: string;
  label: string;
}

export interface Postseason {
  playIn: PlayInGame[];
  series: Series[];
  champion?: string;
  finalsMvp?: string;
  seeds: Record<'E' | 'W', string[]>;
  finalsGmsc?: Record<string, number>;
}

export interface AwardResult {
  season: number;
  mvp?: string; roy?: string; dpoy?: string; mip?: string; smoy?: string; fmvp?: string;
  allNba: string[][];
  allDef: string[][];
  allStars: string[];
  leaders: Record<'pts' | 'reb' | 'ast' | 'stl' | 'blk', { pid: string; value: number } | undefined>;
  champion?: string;
  /** Snapshot names so history survives player retirement. */
  names: Record<string, string>;
  /** Top-5 MVP voting, for display. */
  mvpVoting: { pid: string; score: number }[];
}

export type Phase =
  | 'predraft' | 'draft' | 'signing' | 'preseason' | 'regular' | 'postseason'
  | 'season-end' | 'offseason' | 'retired';

export interface LeagueChampion {
  season: number;
  team: string;
  runnerUp: string;
}

export interface League {
  season: number; // starting year, e.g. 2026 for 2026-27
  day: number;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  schedule: Game[];
  allStarDay: number;
  deadlineDay: number;
  lastDay: number;
  postseason: Postseason | null;
  awards: AwardResult[];
  champions: LeagueChampion[];
  freeAgents: string[];
  lastNo1: string | null;
  nextPlayerId: number;
  allStarsSelected: boolean;
  allStars?: string[];
  /** Where the rosters came from: the real NBA snapshot ('real') or generated players ('fictional'). */
  rosterSource?: 'real' | 'fictional';
}

export interface UserGame {
  season: number;
  day: number;
  comp: Competition;
  kind: 'regular' | 'playin' | 'playoff';
  teamId: string;
  oppName: string;
  home: boolean;
  teamScore: number;
  oppScore: number;
  ot: number;
  line: BoxLine | null; // null = DNP
  dnp?: string;
}

export interface SeasonRecord {
  season: number;
  age: number;
  comp: Competition;
  teamId: string | null;
  teamName: string;
  stats: StatLine;
  playoffs: StatLine | null;
  ovrStart: number;
  ovrEnd: number;
  pot: number;
  salary: number;
  teamRecord: string;
  result: string;
  awards: string[];
  role: string;
}

export interface NewsItem {
  id: number;
  season: number;
  day: number;
  date: string;
  kind: 'event' | 'game' | 'award' | 'contract' | 'injury' | 'league' | 'milestone' | 'training' | 'draft';
  title: string;
  body: string;
  tone?: 'good' | 'bad' | 'neutral';
}

export interface EffectBag {
  trust?: number; morale?: number; chemistry?: number; reputation?: number; fame?: number;
  pressure?: number; loyalty?: number; workEthic?: number; fatigue?: number; form?: number;
  money?: number; endorsement?: number; pot?: number;
  /** Overall rating change (spread over the attributes). */
  ovr?: number;
  attrs?: Partial<Attrs>;
  flag?: string; unflag?: string;
  chain?: { id: string; inDays: number };
  injuryRisk?: number;
  tradeRequest?: boolean;
  injure?: 'leve' | 'moderada' | 'grave';
  heal?: number; // reduce injury days by %
  playThrough?: boolean;
  gleague?: boolean; // assign to G League
  recall?: boolean;
  news?: string;
  trophy?: 'threeContest';
  /** Agency signed: commission and contacts for the rest of the career. */
  agent?: 'top' | 'family' | 'self';
  buyAsset?: string; sellAsset?: string; borrow?: number;
}

export interface ActiveEvent {
  defId: string;
  title: string;
  text: string;
  category: string;
  /** cost: money the option needs up front (it cannot be chosen without it). */
  /** odds: chance (0-100) that a risky option turns out well, shown before choosing. */
  options: { label: string; desc: string; cost?: number; odds?: number; action?: 'sell' | 'loan' | 'bankrupt'; assetId?: string; amount?: number }[];
  vars: Record<string, string>;
  /** odds/lucky: for a risky option, the chance shown and whether the roll went the player's way. */
  resolved?: { option: number; result: string; effectsSummary: string[]; made?: number; odds?: number; lucky?: boolean };
  minigame?: MinigameSpec;
  /** Difficulty levels offered for this challenge. Absent (saves v1) = no selector. */
  minigameTiers?: { id: MinigameTierId; label: string; desc: string; spec: MinigameSpec }[];
  /** Armed difficulty level. Absent (saves v1) = 'normal'. */
  minigameTier?: MinigameTierId;
}

/** How the player interacts with the challenge. Absent (saves v1) = 'meter'. */
export type MinigameMechanic = 'meter' | 'target' | 'power' | 'reaction' | 'choice';

/** Difficulty level. Absent (saves v1) = 'normal'. */
export type MinigameTierId = 'easy' | 'normal' | 'hard';

export type MinigameKind =
  | 'clutch' | 'freethrows' | 'threes' | 'drill'   // existing
  | 'spotlight' | 'dunk' | 'boards' | 'steal' | 'pass' | 'close'; // phase 2

/** Interactive challenge. Zone and speed come from the player's attributes and the pressure. */
export interface MinigameSpec {
  kind: MinigameKind;
  attempts: number;
  /** Green zone width as % of the meter. */
  zone: number;
  /** Full sweeps per second of the marker. */
  speed: number;
  /** Probability per shot when simulated instead of played. */
  autoProb: number;
  /** Shots needed for the best and middle outcomes. */
  great: number;
  ok: number;
  // --- phase 2, all optional ---
  /** Widget that plays the challenge. Default 'meter'. */
  mechanic?: MinigameMechanic;
  /** Armed difficulty level. Default 'normal'. */
  tier?: MinigameTierId;
  /** 'choice'/'reaction': number of options or quadrants. */
  slots?: number;
  /** 'reaction': total reaction window in ms. */
  windowMs?: number;
  /** 0..1 chance of a light injury when failing. */
  risk?: { injury: number };
  /** Multiplier applied to the level's rewards. */
  reward?: { mul: number };
}

export interface Goal {
  id: string;
  label: string;
  desc: string;
  status: 'active' | 'done' | 'failed';
  progress?: string;
}

export interface Offer {
  id: string;
  teamId: string;
  kind: Contract['kind'];
  years: number;
  salary: number; // first-year salary
  raise: number; // annual raise
  option?: 'player' | 'team';
  role: string;
  note: string;
  /** Overseas offers: the club making it. */
  club?: string;
  expiresDay?: number;
}

export interface Prospect {
  id: string;
  name: string;
  nat: string;
  pos: Pos;
  age: number;
  ovr: number;
  pot: number;
  arch: Archetype;
  isUser?: boolean;
  /** Hidden "true" board value used by teams. */
  value: number;
}

export interface PreDraft {
  route: 'college' | 'international' | 'alternative' | 'drafted';
  step: 'club' | 'season' | 'decision' | 'combine' | 'combineTests' | 'interviews' | 'mock' | 'lottery' | 'draft' | 'done';
  /** Plan chosen at the combine. Absent on saves v1. */
  combinePlan?: 'full' | 'hard' | 'safe' | 'measure' | 'skip';
  /** Tests of the phase-2 combine. Absent on saves v1. */
  combineTests?: { id: string; label: string; desc: string; weight: number; spec: MinigameSpec; made?: number }[];
  /** Result of the phase-2 combine. Absent on saves v1. */
  combineResult?: { grade: string; bonus: number; detail: string };
  /** Starting clubs offered after the agency decision (simple flow). */
  clubChoices?: { name: string; comp: 'NCAA' | 'EUR' }[];
  userBoosts: Record<string, number>;
  interviewQuestions?: { teamId: string; question: string; answers: string[] }[];
  seasonLog?: string;
  clubName: string;
  satelliteDone: boolean;
  seasonsPlayed: number;
  combine?: { sprint: number; vertical: number; lane: number; shooting: number; grade: string };
  interviews: { teamId: string; result: 'good' | 'neutral' | 'bad'; answer: number }[];
  interviewTeams: string[];
  mock?: { pickLow: number; pickHigh: number; text: string };
  stockBonus: number;
  draftClass?: Prospect[];
  order?: string[]; // team ids in pick order (60)
  lottery?: { teamId: string; from: number; to: number }[];
  picks?: { pick: number; teamId: string; prospectId: string }[];
  userPick?: { pick: number; round: number; teamId: string } | null;
  workouts: string[];
}

export interface OwnedAsset { id: string; bought: number; value: number; }
export interface FinanceState {
  assets: OwnedAsset[];
  debt: number;
  credit: number;
  bankruptcies: number;
  ruined: boolean;
  ruinCooldown: number;
}

export interface Satellite {
  comp: Competition;
  teamName: string;
  level: number; // average opponent/teammate strength
  gamesPlanned: number;
  w: number;
  l: number;
  /** Minutes multiplier from the club's depth (big clubs play their veterans). */
  minutes?: number;
  league?: string;
}

export interface Career {
  version: number;
  id: string;
  seed: number;
  mode: Mode;
  dailyKey?: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  league: League;
  phase: Phase;
  trust: number;
  morale: number;
  chemistry: number;
  reputation: number;
  fame: number;
  pressure: number;
  loyalty: number;
  workEthic: number;
  earnings: number;
  /** Money in hand: starts at 0, salary is paid at the end of each season, costs come out of it. */
  cash?: number;
  finance?: FinanceState; // only full mode saves from phase 3
  endorsement: number; // per season
  agent: { name: string; quality: number };
  training: { focus: TrainingFocus; intensity: 'light' | 'normal' | 'intense' };
  devPoints: Partial<Record<TrainingFocus, number>>;
  goals: Goal[];
  pendingEvent: ActiveEvent | null;
  eventQueue: { id: string; day: number; season: number }[];
  eventHistory: Record<string, number>; // defId -> absolute day last fired
  decisions: { season: number; title: string; choice: string }[];
  flags: Record<string, number>;
  news: NewsItem[];
  nextNewsId: number;
  gameLog: UserGame[];
  seasons: SeasonRecord[];
  ovrHistory: { season: number; age: number; ovr: number; pot: number }[];
  highs: Partial<Record<'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm', { value: number; season: number; opp: string }>>;
  playoffHighs: Partial<Record<'pts' | 'reb' | 'ast', { value: number; season: number; opp: string }>>;
  achievements: string[];
  predraft: PreDraft | null;
  satellite: Satellite | null;
  satStats: StatLine; // current satellite season stats (G League / college / Europe)
  assignment: 'NBA' | 'GLG';
  twoWayNbaGames: number;
  offers: Offer[];
  tradeRequested: boolean;
  seasonOvrStart: number;
  teamsPlayed: string[];
  bestTeamPeak: { teamId: string; ovr: number } | null;
  retirement: RetirementSummary | null;
  lastSummary: SeasonSummary | null;
  settings: { autoPauseEvents: boolean };
  profile: { jersey: string; number: number; birthplace: string; origin: string; bio: string; look: { skin: number; hair: number; accent: string } };
  allStarGames: number;
  forcedRetire?: boolean;
}

export type TrainingFocus =
  | 'shooting' | 'finishing' | 'playmaking' | 'defense' | 'athleticism' | 'rebounding' | 'balanced' | 'rest';

export interface SeasonSummary {
  season: number;
  lines: { label: string; value: string; tone?: 'good' | 'bad' }[];
  /** Money paid at the end of the season (absent on old saves). */
  money?: {
    salary: number; sponsor: number; agent: number; cash: number;
    lifestyle?: number; upkeep?: number; assetIncome?: number; interest?: number; payment?: number;
    debt?: number; assets?: number; netWorth?: number; sold?: string[];
  };
  highlights: string[];
  awards: string[];
  goals: Goal[];
  decisions: string[];
  ovrDelta: number;
  teamResult: string;
  contract: string;
}

export interface RetirementSummary {
  age: number;
  season: number;
  reason: string;
  legacyScore: number;
  hofProbability: number;
  hofVerdict: string;
  peakOvr: number;
  bestTeam: string;
  totals: StatLine;
  playoffTotals: StatLine;
  titles: number;
  awards: Record<string, number>;
  earnings: number;
  tier: string;
}
