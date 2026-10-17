// League rules and model parameters. Values sourced on 2026-10-17 (see docs/RESEARCH.md).
// Everything here is data: tune it without touching the engine.

export interface LeagueRules {
  label: string;
  baseSeason: number;
  cap: number;
  tax: number;
  apron1: number;
  apron2: number;
  minTeamSalary: number;
  ntmle: number;
  tmle: number;
  rmle: number;
  /** Minimum salary by years of service (index = years, last value = 10+). 0, 2 and 10+ are official; others interpolated. */
  minSalary: number[];
  twoWaySalary: number;
  twoWayNbaGameLimit: number;
  maxPct: [number, number, number]; // 0-6, 7-9, 10+ years
  rookieScaleTopPct: number; // #1 pick as share of cap (approximation, not the official scale)
  rookieScaleBottomPct: number; // #30 pick
  capGrowth: number; // projected yearly growth for future seasons (assumption)
  roundSize: number;
  rounds: number;
  lotteryFormat: '321' | 'classic2019';
  lotteryPicksDrawn: number; // assumption for 3-2-1: sources don't specify
  gamesPerSeason: number;
  directPlayoffSeeds: number;
  playIn: boolean;
  awardMinGames: number;
  awardMinMinutes: number;
  statLeaderMinGames: number;
  hofWaitSeasons: number;
  rosterMax: number;
  simplifiedCbaNotice: string;
}

export const RULES: LeagueRules = {
  label: '2026-27',
  baseSeason: 2026,
  cap: 164_961_000,
  tax: 200_428_000,
  apron1: 209_015_000,
  apron2: 221_686_000,
  minTeamSalary: 148_465_000,
  ntmle: 15_044_000,
  tmle: 6_064_000,
  rmle: 9_366_000,
  minSalary: [1_357_763, 2_183_000, 2_449_421, 2_531_000, 2_613_000, 2_831_000, 3_050_000, 3_268_000, 3_486_000, 3_704_000, 3_876_529],
  twoWaySalary: 678_882,
  twoWayNbaGameLimit: 50,
  maxPct: [0.25, 0.3, 0.35],
  rookieScaleTopPct: 0.084,
  rookieScaleBottomPct: 0.016,
  capGrowth: 0.065,
  roundSize: 30,
  rounds: 2,
  lotteryFormat: '321',
  lotteryPicksDrawn: 4,
  gamesPerSeason: 82,
  directPlayoffSeeds: 6,
  playIn: true,
  awardMinGames: 65,
  awardMinMinutes: 20,
  statLeaderMinGames: 58,
  hofWaitSeasons: 4,
  rosterMax: 15,
  simplifiedCbaNotice:
    'Modelo salarial simplificado: tope, impuesto, aprons, MLE, mínimos, two-way y escala de novato aproximada. No incluye todas las cláusulas del convenio colectivo (Bird rights completos, sign-and-trade, matching de salarios).',
};

/** Cap-indexed figures grow every season after the base one. */
export function capFactor(season: number) {
  return Math.pow(1 + RULES.capGrowth, Math.max(0, season - RULES.baseSeason));
}
export const capFor = (season: number) => Math.round(RULES.cap * capFactor(season));
export const scaled = (amount: number, season: number) => Math.round(amount * capFactor(season));

export function minSalary(years: number, season: number) {
  return scaled(RULES.minSalary[Math.min(10, Math.max(0, years))], season);
}

export function maxSalary(years: number, season: number) {
  const pct = years >= 10 ? RULES.maxPct[2] : years >= 7 ? RULES.maxPct[1] : RULES.maxPct[0];
  return Math.round(capFor(season) * pct);
}

/** Approximate rookie scale (first-round picks), first-year salary. */
export function rookieScale(pick: number, season: number) {
  const t = (Math.min(30, Math.max(1, pick)) - 1) / 29;
  const pct = RULES.rookieScaleTopPct * Math.pow(RULES.rookieScaleBottomPct / RULES.rookieScaleTopPct, Math.pow(t, 0.8));
  return Math.round(capFor(season) * pct);
}

// ---- Statistical model parameters (calibrated against recent league averages) ----
export const SIM = {
  basePace: 99.5,
  paceSd: 2.6,
  tovRate: 0.128,
  ftaPerPoss: 0.225,
  orebRate: 0.25,
  base3: 0.36,
  base2: 0.538,
  baseFt: 0.78,
  threeShare: 0.41, // share of FGA that are threes, league-wide
  astPerFgm: 0.64,
  stlPerTov: 0.52,
  blkPer2Miss: 0.17,
  foulsPerTeam: 19.5,
  homeEdge: 0.008, // FG% bonus at home
  teamTalentEffect: 0.0042, // FG% per point of team talent differential
  defenseEffect: 0.0032,
  usagePower: 2.5,
  fatiguePenalty: 0.0015,
  formEffect: 0.004,
  gameVariance: 0.028, // per-team per-game shooting luck (sd)
};

// Minutes template by rotation slot (0 = best). Coaches shorten rotations in playoffs.
export const MINUTES_TEMPLATE = [35, 34, 32, 31, 29, 25, 21, 16, 10, 5, 2, 0, 0, 0, 0];
export const PLAYOFF_MINUTES_TEMPLATE = [39, 38, 36, 34, 31, 23, 18, 12, 6, 3, 0, 0, 0, 0, 0];

// Short and intense: 1-2 narrative decisions per season (injuries and trade requests aside).
export const EVENT_RATE = {
  full: { perWeek: 0.12, maxPerSeason: 2 },
  quick: { perWeek: 0.07, maxPerSeason: 1 },
  daily: { perWeek: 0.07, maxPerSeason: 1 },
};

export const DAILY_MAX_SEASONS = 12;
export const MAX_AGE = 42;
