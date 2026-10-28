// Real coaches database: NBA head coaches, European club head coaches, NCAA head coaches,
// and real replacement coaches for mid-season firings and offseason market.

import type { Coach } from '../engine/types';
import type { Rng } from '../engine/rng';

export interface RealCoachDef {
  name: string;
  rating: number;
  style: Coach['style'];
  patience: number;
  hiredSeason?: number;
}

/** Real 2024-2026 NBA Head Coaches for all 30 franchises. */
export const NBA_REAL_COACHES: Record<string, RealCoachDef> = {
  ATL: { name: 'Quin Snyder', rating: 83, style: 'motion', patience: 70, hiredSeason: 2023 },
  BOS: { name: 'Joe Mazzulla', rating: 89, style: 'pace', patience: 75, hiredSeason: 2022 },
  BKN: { name: 'Jordi Fernández', rating: 80, style: 'motion', patience: 75, hiredSeason: 2024 },
  CHA: { name: 'Charles Lee', rating: 79, style: 'balanced', patience: 70, hiredSeason: 2024 },
  CHI: { name: 'Billy Donovan', rating: 81, style: 'balanced', patience: 65, hiredSeason: 2020 },
  CLE: { name: 'Kenny Atkinson', rating: 85, style: 'pace', patience: 75, hiredSeason: 2024 },
  DAL: { name: 'Jason Kidd', rating: 86, style: 'iso', patience: 70, hiredSeason: 2021 },
  DEN: { name: 'Michael Malone', rating: 88, style: 'motion', patience: 80, hiredSeason: 2015 },
  DET: { name: 'J.B. Bickerstaff', rating: 80, style: 'defense', patience: 65, hiredSeason: 2024 },
  GSW: { name: 'Steve Kerr', rating: 90, style: 'motion', patience: 75, hiredSeason: 2014 },
  HOU: { name: 'Ime Udoka', rating: 86, style: 'defense', patience: 70, hiredSeason: 2023 },
  IND: { name: 'Rick Carlisle', rating: 88, style: 'pace', patience: 75, hiredSeason: 2021 },
  LAC: { name: 'Tyronn Lue', rating: 87, style: 'iso', patience: 75, hiredSeason: 2020 },
  LAL: { name: 'JJ Redick', rating: 79, style: 'pace', patience: 60, hiredSeason: 2024 },
  MEM: { name: 'Taylor Jenkins', rating: 83, style: 'pace', patience: 75, hiredSeason: 2019 },
  MIA: { name: 'Erik Spoelstra', rating: 93, style: 'defense', patience: 85, hiredSeason: 2008 },
  MIL: { name: 'Doc Rivers', rating: 83, style: 'iso', patience: 60, hiredSeason: 2024 },
  MIN: { name: 'Chris Finch', rating: 86, style: 'balanced', patience: 75, hiredSeason: 2021 },
  NOP: { name: 'Willie Green', rating: 80, style: 'balanced', patience: 65, hiredSeason: 2021 },
  NYK: { name: 'Tom Thibodeau', rating: 86, style: 'defense', patience: 55, hiredSeason: 2020 },
  OKC: { name: 'Mark Daigneault', rating: 89, style: 'balanced', patience: 80, hiredSeason: 2020 },
  ORL: { name: 'Jamahl Mosley', rating: 84, style: 'defense', patience: 80, hiredSeason: 2021 },
  PHI: { name: 'Nick Nurse', rating: 86, style: 'defense', patience: 65, hiredSeason: 2023 },
  PHX: { name: 'Mike Budenholzer', rating: 84, style: 'motion', patience: 65, hiredSeason: 2024 },
  POR: { name: 'Chauncey Billups', rating: 78, style: 'balanced', patience: 65, hiredSeason: 2021 },
  SAC: { name: 'Mike Brown', rating: 84, style: 'pace', patience: 70, hiredSeason: 2022 },
  SAS: { name: 'Gregg Popovich', rating: 92, style: 'motion', patience: 90, hiredSeason: 1996 },
  TOR: { name: 'Darko Rajaković', rating: 79, style: 'motion', patience: 75, hiredSeason: 2023 },
  UTA: { name: 'Will Hardy', rating: 82, style: 'motion', patience: 75, hiredSeason: 2022 },
  WAS: { name: 'Brian Keefe', rating: 77, style: 'balanced', patience: 70, hiredSeason: 2024 },
};

/** Real European club and NCAA head coaches. */
export const CLUB_REAL_COACHES: Record<string, RealCoachDef> = {
  // España / ACB
  'Real Madrid': { name: 'Chus Mateo', rating: 86, style: 'motion', patience: 75 },
  'FC Barcelona': { name: 'Joan Peñarroya', rating: 83, style: 'pace', patience: 70 },
  'Baskonia': { name: 'Pablo Laso', rating: 85, style: 'pace', patience: 75 },
  'Valencia Basket': { name: 'Pedro Martínez', rating: 84, style: 'pace', patience: 80 },
  'Unicaja Málaga': { name: 'Ibon Navarro', rating: 84, style: 'defense', patience: 80 },
  'Joventut Badalona': { name: 'Dani Miret', rating: 78, style: 'balanced', patience: 85 },
  'Gran Canaria': { name: 'Jaka Lakovic', rating: 80, style: 'motion', patience: 75 },
  'UCAM Murcia': { name: 'Sito Alonso', rating: 81, style: 'defense', patience: 75 },
  'La Laguna Tenerife': { name: 'Txus Vidorreta', rating: 82, style: 'motion', patience: 80 },
  'Bàsquet Girona': { name: 'Fotios Katsikaris', rating: 78, style: 'balanced', patience: 75 },
  'Casademont Zaragoza': { name: 'Porfirio Fisac', rating: 79, style: 'balanced', patience: 75 },
  'Surne Bilbao': { name: 'Jaume Ponsarnau', rating: 79, style: 'motion', patience: 80 },
  'Río Breogán': { name: 'Veljko Mrsic', rating: 77, style: 'defense', patience: 75 },

  // Grecia
  'Panathinaikos': { name: 'Ergin Ataman', rating: 88, style: 'iso', patience: 70 },
  'Olympiacos': { name: 'Georgios Bartzokas', rating: 88, style: 'motion', patience: 75 },

  // Turquía
  'Fenerbahçe': { name: 'Sarunas Jasikevicius', rating: 87, style: 'defense', patience: 70 },
  'Anadolu Efes': { name: 'Tomislav Mijatovic', rating: 80, style: 'pace', patience: 75 },

  // Serbia / ABA
  'Partizan': { name: 'Zeljko Obradovic', rating: 91, style: 'motion', patience: 75 },
  'Estrella Roja': { name: 'Ioannis Sfairopoulos', rating: 82, style: 'defense', patience: 70 },

  // Francia
  'AS Monaco': { name: 'Sasa Obradovic', rating: 84, style: 'iso', patience: 70 },
  'Paris Basketball': { name: 'Tiago Splitter', rating: 81, style: 'pace', patience: 75 },
  'LDLC ASVEL': { name: 'Pierric Poupet', rating: 78, style: 'balanced', patience: 75 },

  // Italia
  'Olimpia Milano': { name: 'Ettore Messina', rating: 88, style: 'defense', patience: 70 },
  'Virtus Bologna': { name: 'Luca Banchi', rating: 83, style: 'motion', patience: 75 },

  // Lituania
  'Žalgiris Kaunas': { name: 'Andrea Trinchieri', rating: 85, style: 'motion', patience: 75 },

  // Alemania
  'Bayern Múnich': { name: 'Gordon Herbert', rating: 84, style: 'balanced', patience: 80 },
  'ALBA Berlín': { name: 'Israel González', rating: 79, style: 'motion', patience: 85 },

  // Israel
  'Maccabi Tel Aviv': { name: 'Oded Kattash', rating: 81, style: 'pace', patience: 75 },

  // NCAA
  'Duke': { name: 'Jon Scheyer', rating: 84, style: 'motion', patience: 85 },
  'UConn': { name: 'Dan Hurley', rating: 90, style: 'motion', patience: 80 },
  'Kansas': { name: 'Bill Self', rating: 90, style: 'balanced', patience: 80 },
  'North Carolina': { name: 'Hubert Davis', rating: 83, style: 'pace', patience: 80 },
  'Kentucky': { name: 'Mark Pope', rating: 82, style: 'pace', patience: 80 },
  'Gonzaga': { name: 'Mark Few', rating: 89, style: 'pace', patience: 85 },
  'Alabama': { name: 'Nate Oats', rating: 86, style: 'pace', patience: 80 },
  'Houston': { name: 'Kelvin Sampson', rating: 88, style: 'defense', patience: 80 },
  'Baylor': { name: 'Scott Drew', rating: 87, style: 'motion', patience: 85 },
  'Auburn': { name: 'Bruce Pearl', rating: 86, style: 'defense', patience: 80 },
  'Purdue': { name: 'Matt Painter', rating: 87, style: 'motion', patience: 85 },
  'Rutgers': { name: 'Steve Pikiell', rating: 81, style: 'defense', patience: 85 },
  'Arizona': { name: 'Tommy Lloyd', rating: 85, style: 'pace', patience: 85 },
  'UCLA': { name: 'Mick Cronin', rating: 84, style: 'defense', patience: 80 },
  'Michigan State': { name: 'Tom Izzo', rating: 89, style: 'defense', patience: 85 },
  'Arkansas': { name: 'John Calipari', rating: 87, style: 'iso', patience: 80 },
};

/**
 * Pool of real experienced coaches for mid-season firings and offseason hires,
 * avoiding randomly invented names.
 */
export const REAL_FREE_AGENT_COACHES: RealCoachDef[] = [
  { name: 'Frank Vogel', rating: 83, style: 'defense', patience: 65 },
  { name: 'Monty Williams', rating: 82, style: 'balanced', patience: 70 },
  { name: 'Darvin Ham', rating: 79, style: 'balanced', patience: 60 },
  { name: 'Terry Stotts', rating: 81, style: 'motion', patience: 75 },
  { name: 'Mike D\'Antoni', rating: 85, style: 'pace', patience: 65 },
  { name: 'Sam Cassell', rating: 80, style: 'balanced', patience: 75 },
  { name: 'David Adelman', rating: 81, style: 'motion', patience: 80 },
  { name: 'Chris Quinn', rating: 80, style: 'defense', patience: 80 },
  { name: 'Micah Nori', rating: 80, style: 'balanced', patience: 80 },
  { name: 'Jeff Van Gundy', rating: 84, style: 'defense', patience: 60 },
  { name: 'Stan Van Gundy', rating: 82, style: 'defense', patience: 60 },
  { name: 'Luke Walton', rating: 78, style: 'pace', patience: 70 },
  { name: 'James Borrego', rating: 80, style: 'pace', patience: 75 },
  { name: 'Dave Joerger', rating: 80, style: 'defense', patience: 65 },
  { name: 'Scott Brooks', rating: 79, style: 'balanced', patience: 70 },
  { name: 'Adrian Griffin', rating: 78, style: 'balanced', patience: 65 },
  { name: 'Jacque Vaughn', rating: 78, style: 'balanced', patience: 70 },
  { name: 'Nate McMillan', rating: 81, style: 'defense', patience: 65 },
  { name: 'Stephen Silas', rating: 77, style: 'motion', patience: 75 },
  { name: 'Kevin Ollie', rating: 78, style: 'defense', patience: 75 },
  { name: 'Becky Hammon', rating: 84, style: 'motion', patience: 80 },
  { name: 'Sergio Scariolo', rating: 87, style: 'defense', patience: 75 },
  { name: 'Dimitris Itoudis', rating: 86, style: 'motion', patience: 70 },
  { name: 'Dusko Ivanovic', rating: 83, style: 'defense', patience: 60 },
];

/**
 * Returns a Coach object for a specific NBA team.
 */
export function getRealNbaCoach(teamId: string, season: number): Coach {
  const def = NBA_REAL_COACHES[teamId];
  if (def) {
    return {
      name: def.name,
      rating: def.rating,
      style: def.style,
      patience: def.patience,
      hiredSeason: def.hiredSeason ?? season,
    };
  }
  return {
    name: 'Entrenador NBA',
    rating: 80,
    style: 'balanced',
    patience: 70,
    hiredSeason: season,
  };
}

/**
 * Returns the real coach for an international club or NCAA program.
 */
export function getClubRealCoach(clubName: string): RealCoachDef | undefined {
  if (CLUB_REAL_COACHES[clubName]) return CLUB_REAL_COACHES[clubName];
  const key = Object.keys(CLUB_REAL_COACHES).find(
    (k) => clubName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(clubName.toLowerCase())
  );
  return key ? CLUB_REAL_COACHES[key] : undefined;
}

/**
 * Picks a realistic replacement coach from the free agent pool.
 */
export function pickRealReplacementCoach(rng: Rng, season: number): Coach {
  const def = rng.pick(REAL_FREE_AGENT_COACHES);
  return {
    name: def.name,
    rating: Math.round(def.rating + rng.normal(0, 1.5)),
    style: def.style,
    patience: Math.round(def.patience + rng.normal(0, 3)),
    hiredSeason: season,
  };
}
