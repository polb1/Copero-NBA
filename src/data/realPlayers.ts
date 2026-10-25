// Real players API & dataset for Euroleague, ACB, NCAA, International and NBA Draft.
import type { Archetype, Player, Pos } from '../engine/types';
import { buildAttrs, computeOvr } from '../engine/attributes';
import type { Rng } from '../engine/rng';
import { HEIGHT_RANGE, applyPhysique, emptyStats } from '../engine/players';
import { prospectValue } from '../engine/draft';
import type { SimPlayer } from '../engine/gamesim';
import nbaRosterSnap from './nbaRoster2026.json';

export interface RealClubPlayer {
  name: string;
  pos: Pos;
  ovr: number;
  pot?: number;
  age: number;
  nat: string; // ISO 3 country code
  arch?: Archetype;
  number?: number;
}

export interface RealDraftProspect {
  name: string;
  pos: Pos;
  age: number;
  nat: string;
  ovr: number;
  pot: number;
  arch: Archetype;
  college?: string;
}

/** Real rosters of European clubs and international teams. */
export const CLUB_REAL_ROSTERS: Record<string, RealClubPlayer[]> = {
  // España - Liga ACB / Euroliga
  'Real Madrid': [
    { name: 'Facundo Campazzo', pos: 'PG', ovr: 81, pot: 81, age: 33, nat: 'ARG', arch: 'playmaker', number: 7 },
    { name: 'Walter Tavares', pos: 'C', ovr: 82, pot: 82, age: 32, nat: 'CPV', arch: 'rimProtector', number: 22 },
    { name: 'Mario Hezonja', pos: 'SF', ovr: 79, pot: 80, age: 29, nat: 'CRO', arch: 'allAround', number: 11 },
    { name: 'Dzanan Musa', pos: 'SG', ovr: 78, pot: 80, age: 25, nat: 'BIH', arch: 'allAround', number: 13 },
    { name: 'Gabriel Deck', pos: 'PF', ovr: 77, pot: 77, age: 29, nat: 'ARG', arch: 'twoWay', number: 14 },
    { name: 'Sergio Llull', pos: 'SG', ovr: 74, pot: 74, age: 37, nat: 'ESP', arch: 'sharpshooter', number: 23 },
    { name: 'Usman Garuba', pos: 'PF', ovr: 75, pot: 79, age: 22, nat: 'ESP', arch: 'twoWay', number: 16 },
    { name: 'Serge Ibaka', pos: 'C', ovr: 76, pot: 76, age: 35, nat: 'ESP', arch: 'rimProtector', number: 9 },
    { name: 'Alberto Abalde', pos: 'SF', ovr: 73, pot: 74, age: 28, nat: 'ESP', arch: 'twoWay', number: 6 },
    { name: 'Andrés Feliz', pos: 'PG', ovr: 74, pot: 76, age: 27, nat: 'DOM', arch: 'playmaker', number: 24 },
    { name: 'Xavier Rathan-Mayes', pos: 'SG', ovr: 73, pot: 74, age: 30, nat: 'CAN', arch: 'allAround', number: 0 },
    { name: 'Eli Ndiaye', pos: 'PF', ovr: 72, pot: 78, age: 20, nat: 'ESP', arch: 'twoWay', number: 30 },
  ],
  'FC Barcelona': [
    { name: 'Kevin Punter', pos: 'SG', ovr: 79, pot: 79, age: 31, nat: 'USA', arch: 'sharpshooter', number: 0 },
    { name: 'Jan Vesely', pos: 'C', ovr: 79, pot: 79, age: 34, nat: 'CZE', arch: 'postScorer', number: 6 },
    { name: 'Jabari Parker', pos: 'PF', ovr: 78, pot: 78, age: 29, nat: 'USA', arch: 'allAround', number: 22 },
    { name: 'Tomas Satoransky', pos: 'PG', ovr: 77, pot: 77, age: 33, nat: 'CZE', arch: 'playmaker', number: 13 },
    { name: 'Nicolas Laprovittola', pos: 'PG', ovr: 77, pot: 77, age: 34, nat: 'ARG', arch: 'sharpshooter', number: 20 },
    { name: 'Willy Hernangómez', pos: 'C', ovr: 77, pot: 77, age: 30, nat: 'ESP', arch: 'postScorer', number: 14 },
    { name: 'Chimezie Metu', pos: 'PF', ovr: 76, pot: 77, age: 27, nat: 'NGA', arch: 'twoWay', number: 10 },
    { name: 'Justin Anderson', pos: 'SF', ovr: 75, pot: 75, age: 31, nat: 'USA', arch: 'twoWay', number: 1 },
    { name: 'Álex Abrines', pos: 'SF', ovr: 74, pot: 74, age: 31, nat: 'ESP', arch: 'sharpshooter', number: 21 },
    { name: 'Darío Brizuela', pos: 'SG', ovr: 74, pot: 74, age: 30, nat: 'ESP', arch: 'allAround', number: 8 },
    { name: 'Juan Núñez', pos: 'PG', ovr: 74, pot: 80, age: 20, nat: 'ESP', arch: 'playmaker', number: 17 },
    { name: 'Youssoupha Fall', pos: 'C', ovr: 74, pot: 74, age: 29, nat: 'SEN', arch: 'rimProtector', number: 19 },
  ],
  'Baskonia': [
    { name: 'Markus Howard', pos: 'SG', ovr: 80, pot: 81, age: 25, nat: 'USA', arch: 'sharpshooter', number: 0 },
    { name: 'Chima Moneke', pos: 'PF', ovr: 78, pot: 79, age: 29, nat: 'NGA', arch: 'twoWay', number: 95 },
    { name: 'Donta Hall', pos: 'C', ovr: 76, pot: 77, age: 27, nat: 'USA', arch: 'rimProtector', number: 45 },
    { name: 'Tadas Sedekerskis', pos: 'SF', ovr: 76, pot: 77, age: 26, nat: 'LTU', arch: 'twoWay', number: 8 },
    { name: 'Kamar Baldwin', pos: 'PG', ovr: 75, pot: 76, age: 27, nat: 'USA', arch: 'playmaker', number: 2 },
    { name: 'Trent Forrest', pos: 'PG', ovr: 74, pot: 75, age: 26, nat: 'USA', arch: 'playmaker', number: 5 },
    { name: 'Nikos Rogkavopoulos', pos: 'SF', ovr: 74, pot: 77, age: 23, nat: 'GRE', arch: 'sharpshooter', number: 17 },
    { name: 'Ognjen Jaramaz', pos: 'SG', ovr: 73, pot: 73, age: 29, nat: 'SRB', arch: 'twoWay', number: 10 },
  ],
  'Valencia Basket': [
    { name: 'Chris Jones', pos: 'PG', ovr: 77, pot: 77, age: 31, nat: 'ARM', arch: 'allAround', number: 7 },
    { name: 'Jean Montero', pos: 'SG', ovr: 77, pot: 82, age: 21, nat: 'DOM', arch: 'allAround', number: 3 },
    { name: 'Semi Ojeleye', pos: 'SF', ovr: 77, pot: 77, age: 30, nat: 'USA', arch: 'twoWay', number: 37 },
    { name: 'Matt Costello', pos: 'C', ovr: 76, pot: 76, age: 31, nat: 'CIV', arch: 'stretchBig', number: 24 },
    { name: 'Jaime Pradilla', pos: 'PF', ovr: 74, pot: 77, age: 23, nat: 'ESP', arch: 'postScorer', number: 4 },
    { name: 'Xabi López-Arostegui', pos: 'SF', ovr: 74, pot: 74, age: 27, nat: 'ESP', arch: 'twoWay', number: 6 },
    { name: 'Brancou Badio', pos: 'PG', ovr: 73, pot: 76, age: 25, nat: 'SEN', arch: 'playmaker', number: 0 },
  ],
  'Unicaja Málaga': [
    { name: 'Kendrick Perry', pos: 'PG', ovr: 76, pot: 76, age: 32, nat: 'MNE', arch: 'allAround', number: 55 },
    { name: 'Dylan Osetkowski', pos: 'PF', ovr: 76, pot: 77, age: 28, nat: 'GER', arch: 'stretchBig', number: 1 },
    { name: 'Tyson Carter', pos: 'SG', ovr: 75, pot: 77, age: 26, nat: 'USA', arch: 'sharpshooter', number: 11 },
    { name: 'Kameron Taylor', pos: 'SF', ovr: 75, pot: 75, age: 30, nat: 'USA', arch: 'twoWay', number: 7 },
    { name: 'David Kravish', pos: 'C', ovr: 75, pot: 75, age: 32, nat: 'BUL', arch: 'postScorer', number: 45 },
    { name: 'Alberto Díaz', pos: 'PG', ovr: 74, pot: 74, age: 30, nat: 'ESP', arch: 'twoWay', number: 9 },
  ],
  'Joventut Badalona': [
    { name: 'Ante Tomic', pos: 'C', ovr: 76, pot: 76, age: 37, nat: 'CRO', arch: 'postScorer', number: 19 },
    { name: 'Kassius Robertson', pos: 'SG', ovr: 75, pot: 75, age: 30, nat: 'CAN', arch: 'sharpshooter', number: 30 },
    { name: 'Devon Dotson', pos: 'PG', ovr: 75, pot: 76, age: 25, nat: 'USA', arch: 'playmaker', number: 1 },
    { name: 'Artem Pustovyi', pos: 'C', ovr: 74, pot: 74, age: 32, nat: 'UKR', arch: 'rimProtector', number: 37 },
    { name: 'Guillem Vives', pos: 'PG', ovr: 73, pot: 73, age: 31, nat: 'ESP', arch: 'playmaker', number: 16 },
  ],
  'Gran Canaria': [
    { name: 'Nicolas Brussino', pos: 'SF', ovr: 75, pot: 75, age: 31, nat: 'ARG', arch: 'sharpshooter', number: 9 },
    { name: 'Mike Tobey', pos: 'C', ovr: 75, pot: 75, age: 30, nat: 'SLO', arch: 'stretchBig', number: 10 },
    { name: 'Andrew Albicy', pos: 'PG', ovr: 74, pot: 74, age: 34, nat: 'FRA', arch: 'twoWay', number: 6 },
    { name: 'John Shurna', pos: 'PF', ovr: 74, pot: 74, age: 34, nat: 'USA', arch: 'sharpshooter', number: 14 },
    { name: 'Caleb Homesley', pos: 'SG', ovr: 74, pot: 75, age: 28, nat: 'USA', arch: 'allAround', number: 3 },
  ],
  'La Laguna Tenerife': [
    { name: 'Marcelinho Huertas', pos: 'PG', ovr: 77, pot: 77, age: 41, nat: 'BRA', arch: 'playmaker', number: 9 },
    { name: 'Giorgi Shermadini', pos: 'C', ovr: 77, pot: 77, age: 35, nat: 'GEO', arch: 'postScorer', number: 19 },
    { name: 'Bruno Fitipaldo', pos: 'PG', ovr: 74, pot: 74, age: 33, nat: 'URU', arch: 'sharpshooter', number: 6 },
    { name: 'Fran Guerra', pos: 'C', ovr: 74, pot: 74, age: 32, nat: 'ESP', arch: 'postScorer', number: 35 },
    { name: 'Joan Sastre', pos: 'SF', ovr: 73, pot: 73, age: 33, nat: 'ESP', arch: 'twoWay', number: 15 },
  ],

  // Grecia
  'Panathinaikos': [
    { name: 'Kendrick Nunn', pos: 'SG', ovr: 81, pot: 81, age: 29, nat: 'USA', arch: 'allAround', number: 25 },
    { name: 'Mathias Lessort', pos: 'C', ovr: 80, pot: 81, age: 29, nat: 'FRA', arch: 'postScorer', number: 26 },
    { name: 'Kostas Sloukas', pos: 'PG', ovr: 79, pot: 79, age: 34, nat: 'GRE', arch: 'playmaker', number: 10 },
    { name: 'Cedi Osman', pos: 'SF', ovr: 77, pot: 77, age: 29, nat: 'TUR', arch: 'twoWay', number: 16 },
    { name: 'Jerian Grant', pos: 'PG', ovr: 77, pot: 77, age: 32, nat: 'USA', arch: 'twoWay', number: 22 },
    { name: 'Lorenzo Brown', pos: 'PG', ovr: 77, pot: 77, age: 34, nat: 'ESP', arch: 'playmaker', number: 2 },
    { name: 'Konstantinos Mitoglou', pos: 'PF', ovr: 76, pot: 77, age: 28, nat: 'GRE', arch: 'stretchBig', number: 44 },
    { name: 'Juancho Hernangómez', pos: 'PF', ovr: 76, pot: 76, age: 29, nat: 'ESP', arch: 'stretchBig', number: 41 },
    { name: 'Ioannis Papapetrou', pos: 'SF', ovr: 73, pot: 73, age: 30, nat: 'GRE', arch: 'twoWay', number: 33 },
  ],
  'Olympiacos': [
    { name: 'Sasha Vezenkov', pos: 'PF', ovr: 82, pot: 82, age: 29, nat: 'BUL', arch: 'allAround', number: 14 },
    { name: 'Nikola Milutinov', pos: 'C', ovr: 79, pot: 79, age: 29, nat: 'SRB', arch: 'postScorer', number: 33 },
    { name: 'Evan Fournier', pos: 'SG', ovr: 78, pot: 78, age: 32, nat: 'FRA', arch: 'allAround', number: 94 },
    { name: 'Moustapha Fall', pos: 'C', ovr: 78, pot: 78, age: 32, nat: 'FRA', arch: 'rimProtector', number: 10 },
    { name: 'Thomas Walkup', pos: 'PG', ovr: 77, pot: 77, age: 31, nat: 'GRE', arch: 'twoWay', number: 0 },
    { name: 'Alec Peters', pos: 'PF', ovr: 77, pot: 77, age: 29, nat: 'USA', arch: 'sharpshooter', number: 25 },
    { name: 'Nigel Williams-Goss', pos: 'PG', ovr: 76, pot: 76, age: 30, nat: 'USA', arch: 'playmaker', number: 3 },
    { name: 'Luca Vildoza', pos: 'PG', ovr: 75, pot: 75, age: 29, nat: 'ARG', arch: 'playmaker', number: 1 },
    { name: 'Tyler Dorsey', pos: 'SG', ovr: 75, pot: 75, age: 28, nat: 'GRE', arch: 'sharpshooter', number: 9 },
  ],

  // Turquía
  'Fenerbahçe': [
    { name: 'Nigel Hayes-Davis', pos: 'PF', ovr: 80, pot: 80, age: 29, nat: 'USA', arch: 'twoWay', number: 11 },
    { name: 'Wade Baldwin IV', pos: 'PG', ovr: 79, pot: 79, age: 28, nat: 'USA', arch: 'allAround', number: 2 },
    { name: 'Bonzie Colson', pos: 'SF', ovr: 77, pot: 77, age: 28, nat: 'USA', arch: 'twoWay', number: 50 },
    { name: 'Marko Guduric', pos: 'SG', ovr: 76, pot: 76, age: 29, nat: 'SRB', arch: 'sharpshooter', number: 23 },
    { name: 'Nicolo Melli', pos: 'PF', ovr: 76, pot: 76, age: 33, nat: 'ITA', arch: 'postScorer', number: 4 },
    { name: 'Devon Hall', pos: 'SG', ovr: 75, pot: 75, age: 29, nat: 'USA', arch: 'twoWay', number: 0 },
    { name: 'Tarik Biberovic', pos: 'SF', ovr: 75, pot: 79, age: 23, nat: 'TUR', arch: 'sharpshooter', number: 13 },
    { name: 'Boban Marjanovic', pos: 'C', ovr: 74, pot: 74, age: 36, nat: 'SRB', arch: 'postScorer', number: 51 },
  ],
  'Anadolu Efes': [
    { name: 'Shane Larkin', pos: 'PG', ovr: 80, pot: 80, age: 32, nat: 'TUR', arch: 'sharpshooter', number: 0 },
    { name: 'Vincent Poirier', pos: 'C', ovr: 78, pot: 78, age: 31, nat: 'FRA', arch: 'rimProtector', number: 17 },
    { name: 'Elijah Bryant', pos: 'SG', ovr: 77, pot: 77, age: 29, nat: 'USA', arch: 'twoWay', number: 3 },
    { name: 'Darius Thompson', pos: 'PG', ovr: 77, pot: 77, age: 29, nat: 'USA', arch: 'playmaker', number: 11 },
    { name: 'Rodrigue Beaubois', pos: 'SG', ovr: 76, pot: 76, age: 36, nat: 'FRA', arch: 'sharpshooter', number: 1 },
    { name: 'Dan Oturu', pos: 'C', ovr: 76, pot: 78, age: 25, nat: 'NGA', arch: 'twoWay', number: 13 },
    { name: 'Jordan Nwora', pos: 'SF', ovr: 76, pot: 77, age: 26, nat: 'NGA', arch: 'allAround', number: 24 },
    { name: 'Rolands Smits', pos: 'PF', ovr: 75, pot: 75, age: 29, nat: 'LAT', arch: 'stretchBig', number: 25 },
  ],

  // Serbia / Liga ABA
  'Partizan': [
    { name: 'Carlik Jones', pos: 'PG', ovr: 77, pot: 78, age: 26, nat: 'SSD', arch: 'allAround', number: 8 },
    { name: 'Brandon Davies', pos: 'C', ovr: 77, pot: 77, age: 33, nat: 'UGA', arch: 'postScorer', number: 0 },
    { name: 'Tyrique Jones', pos: 'C', ovr: 77, pot: 78, age: 27, nat: 'USA', arch: 'twoWay', number: 88 },
    { name: 'Sterling Brown', pos: 'SG', ovr: 76, pot: 76, age: 29, nat: 'USA', arch: 'twoWay', number: 12 },
    { name: 'Iffe Lundberg', pos: 'SG', ovr: 76, pot: 76, age: 29, nat: 'DEN', arch: 'allAround', number: 1 },
    { name: 'Frank Ntilikina', pos: 'PG', ovr: 75, pot: 76, age: 26, nat: 'FRA', arch: 'twoWay', number: 21 },
    { name: 'Isaac Bonga', pos: 'SF', ovr: 75, pot: 76, age: 24, nat: 'GER', arch: 'twoWay', number: 17 },
    { name: 'Vanja Marinkovic', pos: 'SG', ovr: 74, pot: 75, age: 27, nat: 'SRB', arch: 'sharpshooter', number: 9 },
    { name: 'Aleksej Pokusevski', pos: 'PF', ovr: 74, pot: 78, age: 22, nat: 'SRB', arch: 'stretchBig', number: 7 },
  ],
  'Estrella Roja': [
    { name: 'Nikola Kalinic', pos: 'SF', ovr: 77, pot: 77, age: 33, nat: 'SRB', arch: 'twoWay', number: 12 },
    { name: 'Joel Bolomboy', pos: 'C', ovr: 77, pot: 77, age: 30, nat: 'RUS', arch: 'rimProtector', number: 21 },
    { name: 'Codi Miller-McIntyre', pos: 'PG', ovr: 76, pot: 76, age: 30, nat: 'BUL', arch: 'playmaker', number: 0 },
    { name: 'Nemanja Nedovic', pos: 'SG', ovr: 76, pot: 76, age: 33, nat: 'SRB', arch: 'allAround', number: 26 },
    { name: 'Milos Teodosic', pos: 'PG', ovr: 75, pot: 75, age: 37, nat: 'SRB', arch: 'playmaker', number: 4 },
    { name: 'Isaiah Canaan', pos: 'SG', ovr: 75, pot: 75, age: 33, nat: 'USA', arch: 'sharpshooter', number: 3 },
    { name: 'Rokas Giedraitis', pos: 'SF', ovr: 75, pot: 75, age: 32, nat: 'LTU', arch: 'sharpshooter', number: 31 },
    { name: 'Yago dos Santos', pos: 'PG', ovr: 74, pot: 76, age: 25, nat: 'BRA', arch: 'playmaker', number: 99 },
  ],

  // Francia
  'AS Monaco': [
    { name: 'Mike James', pos: 'PG', ovr: 82, pot: 82, age: 34, nat: 'USA', arch: 'allAround', number: 55 },
    { name: 'Alpha Diallo', pos: 'SF', ovr: 78, pot: 79, age: 27, nat: 'USA', arch: 'twoWay', number: 11 },
    { name: 'Elie Okobo', pos: 'SG', ovr: 77, pot: 78, age: 27, nat: 'FRA', arch: 'allAround', number: 0 },
    { name: 'Jordan Loyd', pos: 'SG', ovr: 77, pot: 77, age: 31, nat: 'USA', arch: 'sharpshooter', number: 3 },
    { name: 'Georgios Papagiannis', pos: 'C', ovr: 76, pot: 77, age: 27, nat: 'GRE', arch: 'stretchBig', number: 9 },
    { name: 'Donatas Motiejunas', pos: 'C', ovr: 75, pot: 75, age: 34, nat: 'LTU', arch: 'postScorer', number: 20 },
    { name: 'Matthew Strazel', pos: 'PG', ovr: 74, pot: 77, age: 22, nat: 'FRA', arch: 'playmaker', number: 32 },
  ],
  'Paris Basketball': [
    { name: 'TJ Shorts', pos: 'PG', ovr: 79, pot: 80, age: 27, nat: 'MKD', arch: 'playmaker', number: 0 },
    { name: 'Nadir Hifi', pos: 'SG', ovr: 77, pot: 81, age: 22, nat: 'FRA', arch: 'allAround', number: 2 },
    { name: 'Tyson Ward', pos: 'SF', ovr: 75, pot: 76, age: 27, nat: 'USA', arch: 'twoWay', number: 3 },
    { name: 'Kevarrius Hayes', pos: 'C', ovr: 75, pot: 75, age: 27, nat: 'USA', arch: 'rimProtector', number: 4 },
    { name: 'Collin Malcolm', pos: 'SF', ovr: 74, pot: 74, age: 27, nat: 'USA', arch: 'twoWay', number: 5 },
  ],

  // Italia
  'Olimpia Milano': [
    { name: 'Nikola Mirotic', pos: 'PF', ovr: 80, pot: 80, age: 33, nat: 'ESP', arch: 'allAround', number: 33 },
    { name: 'Shavon Shields', pos: 'SF', ovr: 79, pot: 79, age: 30, nat: 'DEN', arch: 'twoWay', number: 31 },
    { name: 'Zach LeDay', pos: 'PF', ovr: 77, pot: 77, age: 30, nat: 'AZE', arch: 'twoWay', number: 2 },
    { name: 'Josh Nebo', pos: 'C', ovr: 77, pot: 78, age: 27, nat: 'SLO', arch: 'rimProtector', number: 7 },
    { name: 'Leandro Bolmaro', pos: 'PG', ovr: 75, pot: 77, age: 24, nat: 'ARG', arch: 'twoWay', number: 10 },
    { name: 'Armoni Brooks', pos: 'SG', ovr: 75, pot: 76, age: 26, nat: 'USA', arch: 'sharpshooter', number: 12 },
  ],
  'Virtus Bologna': [
    { name: 'Toko Shengelia', pos: 'PF', ovr: 79, pot: 79, age: 33, nat: 'GEO', arch: 'postScorer', number: 21 },
    { name: 'Will Clyburn', pos: 'SF', ovr: 78, pot: 78, age: 34, nat: 'USA', arch: 'allAround', number: 9 },
    { name: 'Isaia Cordinier', pos: 'SG', ovr: 77, pot: 78, age: 27, nat: 'FRA', arch: 'twoWay', number: 0 },
    { name: 'Marco Belinelli', pos: 'SG', ovr: 75, pot: 75, age: 38, nat: 'ITA', arch: 'sharpshooter', number: 3 },
    { name: 'Ante Zizic', pos: 'C', ovr: 75, pot: 75, age: 27, nat: 'CRO', arch: 'postScorer', number: 41 },
    { name: 'Daniel Hackett', pos: 'PG', ovr: 74, pot: 74, age: 36, nat: 'ITA', arch: 'twoWay', number: 23 },
    { name: 'Alessandro Pajola', pos: 'PG', ovr: 74, pot: 75, age: 25, nat: 'ITA', arch: 'twoWay', number: 6 },
  ],

  // Lituania
  'Žalgiris Kaunas': [
    { name: 'Sylvain Francisco', pos: 'PG', ovr: 77, pot: 78, age: 27, nat: 'FRA', arch: 'allAround', number: 3 },
    { name: 'Ignas Brazdeikis', pos: 'SF', ovr: 75, pot: 76, age: 25, nat: 'LTU', arch: 'allAround', number: 17 },
    { name: 'Deividas Sirvydis', pos: 'SG', ovr: 75, pot: 77, age: 24, nat: 'LTU', arch: 'sharpshooter', number: 91 },
    { name: 'Laurynas Birutis', pos: 'C', ovr: 75, pot: 75, age: 27, nat: 'LTU', arch: 'postScorer', number: 15 },
    { name: 'Alen Smailagic', pos: 'PF', ovr: 75, pot: 77, age: 24, nat: 'SRB', arch: 'twoWay', number: 9 },
    { name: 'Edgaras Ulanovas', pos: 'SF', ovr: 74, pot: 74, age: 32, nat: 'LTU', arch: 'twoWay', number: 92 },
  ],

  // Alemania
  'Bayern Múnich': [
    { name: 'Carsen Edwards', pos: 'PG', ovr: 78, pot: 79, age: 26, nat: 'USA', arch: 'sharpshooter', number: 3 },
    { name: 'Shabazz Napier', pos: 'PG', ovr: 76, pot: 76, age: 33, nat: 'PUR', arch: 'allAround', number: 5 },
    { name: 'Devin Booker', pos: 'C', ovr: 76, pot: 76, age: 33, nat: 'USA', arch: 'postScorer', number: 31 },
    { name: 'Johannes Voigtmann', pos: 'C', ovr: 75, pot: 75, age: 32, nat: 'GER', arch: 'stretchBig', number: 7 },
    { name: 'Andreas Obst', pos: 'SG', ovr: 75, pot: 75, age: 28, nat: 'GER', arch: 'sharpshooter', number: 42 },
    { name: 'Vladimir Lucic', pos: 'SF', ovr: 75, pot: 75, age: 35, nat: 'SRB', arch: 'twoWay', number: 11 },
    { name: 'Nick Weiler-Babb', pos: 'SG', ovr: 75, pot: 75, age: 28, nat: 'GER', arch: 'twoWay', number: 0 },
  ],
  'ALBA Berlín': [
    { name: 'Trevion Williams', pos: 'C', ovr: 76, pot: 77, age: 24, nat: 'USA', arch: 'postScorer', number: 50 },
    { name: 'Matt Thomas', pos: 'SG', ovr: 75, pot: 75, age: 30, nat: 'USA', arch: 'sharpshooter', number: 21 },
    { name: 'Martin Hermannsson', pos: 'PG', ovr: 74, pot: 74, age: 30, nat: 'ISL', arch: 'playmaker', number: 10 },
    { name: 'Louis Olinde', pos: 'SF', ovr: 74, pot: 75, age: 26, nat: 'GER', arch: 'twoWay', number: 9 },
    { name: 'Gabriele Procida', pos: 'SG', ovr: 74, pot: 79, age: 22, nat: 'ITA', arch: 'slasher', number: 5 },
    { name: 'Matteo Spagnolo', pos: 'PG', ovr: 74, pot: 79, age: 21, nat: 'ITA', arch: 'playmaker', number: 18 },
  ],

  // Israel
  'Maccabi Tel Aviv': [
    { name: 'Rokas Jokubaitis', pos: 'PG', ovr: 76, pot: 79, age: 24, nat: 'LTU', arch: 'playmaker', number: 19 },
    { name: 'Jaylen Hoard', pos: 'PF', ovr: 76, pot: 78, age: 25, nat: 'FRA', arch: 'twoWay', number: 1 },
    { name: 'Levi Randolph', pos: 'SG', ovr: 76, pot: 76, age: 32, nat: 'USA', arch: 'allAround', number: 5 },
    { name: 'Jasiel Rivero', pos: 'C', ovr: 76, pot: 76, age: 31, nat: 'CUB', arch: 'postScorer', number: 32 },
    { name: 'Tamir Blatt', pos: 'PG', ovr: 75, pot: 76, age: 27, nat: 'ISR', arch: 'playmaker', number: 45 },
    { name: 'Roman Sorkin', pos: 'C', ovr: 75, pot: 76, age: 28, nat: 'ISR', arch: 'postScorer', number: 9 },
    { name: 'Wenyen Gabriel', pos: 'PF', ovr: 75, pot: 75, age: 27, nat: 'SSD', arch: 'rimProtector', number: 35 },
  ],

  // NCAA destacados
  'Duke': [
    { name: 'Cooper Flagg', pos: 'SF', ovr: 79, pot: 95, age: 18, nat: 'USA', arch: 'twoWay', number: 2 },
    { name: 'Khaman Maluach', pos: 'C', ovr: 74, pot: 91, age: 18, nat: 'SSD', arch: 'rimProtector', number: 9 },
    { name: 'Kon Knueppel', pos: 'SG', ovr: 73, pot: 88, age: 19, nat: 'USA', arch: 'sharpshooter', number: 7 },
    { name: 'Tyrese Proctor', pos: 'PG', ovr: 72, pot: 84, age: 20, nat: 'AUS', arch: 'playmaker', number: 5 },
    { name: 'Sion James', pos: 'SG', ovr: 71, pot: 82, age: 21, nat: 'USA', arch: 'twoWay', number: 14 },
    { name: 'Caleb Foster', pos: 'PG', ovr: 71, pot: 83, age: 19, nat: 'USA', arch: 'allAround', number: 1 },
  ],
  'Rutgers': [
    { name: 'Dylan Harper', pos: 'PG', ovr: 77, pot: 93, age: 18, nat: 'USA', arch: 'playmaker', number: 2 },
    { name: 'Ace Bailey', pos: 'SF', ovr: 77, pot: 93, age: 18, nat: 'USA', arch: 'allAround', number: 1 },
    { name: 'Jeremiah Williams', pos: 'SG', ovr: 71, pot: 80, age: 22, nat: 'USA', arch: 'twoWay', number: 0 },
    { name: 'Lathan Sommerville', pos: 'C', ovr: 70, pot: 82, age: 19, nat: 'USA', arch: 'postScorer', number: 99 },
  ],
  'UConn': [
    { name: 'Alex Karaban', pos: 'PF', ovr: 74, pot: 85, age: 22, nat: 'USA', arch: 'stretchBig', number: 11 },
    { name: 'Liam McNeeley', pos: 'SF', ovr: 74, pot: 89, age: 19, nat: 'USA', arch: 'sharpshooter', number: 30 },
    { name: 'Tarris Reed Jr.', pos: 'C', ovr: 72, pot: 83, age: 21, nat: 'USA', arch: 'rimProtector', number: 32 },
    { name: 'Solo Ball', pos: 'SG', ovr: 71, pot: 83, age: 20, nat: 'USA', arch: 'allAround', number: 1 },
    { name: 'Hassan Diarra', pos: 'PG', ovr: 71, pot: 80, age: 23, nat: 'USA', arch: 'twoWay', number: 10 },
  ],
  'Kansas': [
    { name: 'Hunter Dickinson', pos: 'C', ovr: 76, pot: 80, age: 24, nat: 'USA', arch: 'postScorer', number: 1 },
    { name: 'Dajuan Harris Jr.', pos: 'PG', ovr: 73, pot: 78, age: 23, nat: 'USA', arch: 'playmaker', number: 3 },
    { name: 'AJ Storr', pos: 'SF', ovr: 73, pot: 84, age: 21, nat: 'USA', arch: 'allAround', number: 2 },
    { name: 'KJ Adams Jr.', pos: 'PF', ovr: 73, pot: 81, age: 22, nat: 'USA', arch: 'twoWay', number: 24 },
    { name: 'Zeke Mayo', pos: 'SG', ovr: 72, pot: 80, age: 23, nat: 'USA', arch: 'sharpshooter', number: 4 },
  ],
  'North Carolina': [
    { name: 'RJ Davis', pos: 'PG', ovr: 76, pot: 80, age: 23, nat: 'USA', arch: 'allAround', number: 4 },
    { name: 'Drake Powell', pos: 'SF', ovr: 73, pot: 89, age: 19, nat: 'USA', arch: 'twoWay', number: 9 },
    { name: 'Ian Jackson', pos: 'SG', ovr: 73, pot: 88, age: 19, nat: 'USA', arch: 'slasher', number: 11 },
    { name: 'Elliot Cadeau', pos: 'PG', ovr: 72, pot: 84, age: 20, nat: 'SWE', arch: 'playmaker', number: 2 },
    { name: 'Jae\'Lyn Withers', pos: 'PF', ovr: 70, pot: 78, age: 24, nat: 'USA', arch: 'twoWay', number: 24 },
  ],
  'Kentucky': [
    { name: 'Jaxson Robinson', pos: 'SG', ovr: 73, pot: 82, age: 22, nat: 'USA', arch: 'sharpshooter', number: 2 },
    { name: 'Amari Williams', pos: 'C', ovr: 72, pot: 80, age: 22, nat: 'GBR', arch: 'rimProtector', number: 22 },
    { name: 'Lamont Butler', pos: 'PG', ovr: 72, pot: 79, age: 22, nat: 'USA', arch: 'twoWay', number: 5 },
    { name: 'Otega Oweh', pos: 'SG', ovr: 72, pot: 81, age: 21, nat: 'USA', arch: 'twoWay', number: 0 },
    { name: 'Kerr Kriisa', pos: 'PG', ovr: 71, pot: 78, age: 23, nat: 'EST', arch: 'playmaker', number: 77 },
  ],
  'Baylor': [
    { name: 'VJ Edgecombe', pos: 'SG', ovr: 76, pot: 93, age: 19, nat: 'BAH', arch: 'slasher', number: 24 },
    { name: 'Norchad Omier', pos: 'PF', ovr: 74, pot: 80, age: 23, nat: 'NCA', arch: 'postScorer', number: 15 },
    { name: 'Jeremy Roach', pos: 'PG', ovr: 73, pot: 78, age: 23, nat: 'USA', arch: 'playmaker', number: 3 },
    { name: 'Robert Wright III', pos: 'PG', ovr: 71, pot: 84, age: 19, nat: 'USA', arch: 'playmaker', number: 1 },
  ],
  'Gonzaga': [
    { name: 'Ryan Nembhard', pos: 'PG', ovr: 74, pot: 80, age: 21, nat: 'CAN', arch: 'playmaker', number: 0 },
    { name: 'Graham Ike', pos: 'C', ovr: 74, pot: 80, age: 22, nat: 'USA', arch: 'postScorer', number: 13 },
    { name: 'Nolan Hickman', pos: 'SG', ovr: 72, pot: 78, age: 21, nat: 'USA', arch: 'sharpshooter', number: 11 },
    { name: 'Ben Gregg', pos: 'PF', ovr: 71, pot: 77, age: 22, nat: 'USA', arch: 'stretchBig', number: 33 },
  ],
  'Alabama': [
    { name: 'Mark Sears', pos: 'PG', ovr: 76, pot: 81, age: 23, nat: 'USA', arch: 'allAround', number: 1 },
    { name: 'Grant Nelson', pos: 'PF', ovr: 73, pot: 80, age: 22, nat: 'USA', arch: 'stretchBig', number: 2 },
    { name: 'Clifford Omoruyi', pos: 'C', ovr: 73, pot: 80, age: 23, nat: 'NGA', arch: 'rimProtector', number: 11 },
    { name: 'Latrell Wrightsell Jr.', pos: 'SG', ovr: 71, pot: 78, age: 23, nat: 'USA', arch: 'sharpshooter', number: 12 },
  ],
  'Houston': [
    { name: 'LJ Cryer', pos: 'SG', ovr: 74, pot: 79, age: 23, nat: 'USA', arch: 'sharpshooter', number: 4 },
    { name: 'J\'Wan Roberts', pos: 'PF', ovr: 73, pot: 78, age: 23, nat: 'USA', arch: 'postScorer', number: 13 },
    { name: 'Emanuel Sharp', pos: 'SG', ovr: 72, pot: 80, age: 20, nat: 'USA', arch: 'allAround', number: 21 },
    { name: 'Milos Uzan', pos: 'PG', ovr: 72, pot: 80, age: 21, nat: 'USA', arch: 'playmaker', number: 7 },
  ],
};

/** Real prospects of the incoming draft class (2025/2026). */
export const DRAFT_REAL_PROSPECTS: RealDraftProspect[] = [
  { name: 'Cooper Flagg', pos: 'SF', age: 19, nat: 'USA', ovr: 77, pot: 96, arch: 'twoWay', college: 'Duke' },
  { name: 'Dylan Harper', pos: 'PG', age: 19, nat: 'USA', ovr: 76, pot: 94, arch: 'playmaker', college: 'Rutgers' },
  { name: 'Ace Bailey', pos: 'SF', age: 19, nat: 'USA', ovr: 75, pot: 93, arch: 'allAround', college: 'Rutgers' },
  { name: 'VJ Edgecombe', pos: 'SG', age: 19, nat: 'BAH', ovr: 75, pot: 93, arch: 'slasher', college: 'Baylor' },
  { name: 'Nolan Traore', pos: 'PG', age: 19, nat: 'FRA', ovr: 74, pot: 92, arch: 'playmaker', college: 'Saint-Quentin' },
  { name: 'Khaman Maluach', pos: 'C', age: 19, nat: 'SSD', ovr: 73, pot: 91, arch: 'rimProtector', college: 'Duke' },
  { name: 'Tre Johnson', pos: 'SG', age: 19, nat: 'USA', ovr: 73, pot: 91, arch: 'sharpshooter', college: 'Texas' },
  { name: 'Hugo González', pos: 'SF', age: 19, nat: 'ESP', ovr: 72, pot: 90, arch: 'twoWay', college: 'Real Madrid' },
  { name: 'Egor Demin', pos: 'PG', age: 19, nat: 'RUS', ovr: 72, pot: 90, arch: 'playmaker', college: 'BYU' },
  { name: 'Kasparas Jakucionis', pos: 'PG', age: 19, nat: 'LTU', ovr: 72, pot: 89, arch: 'playmaker', college: 'Illinois' },
  { name: 'Drake Powell', pos: 'SF', age: 19, nat: 'USA', ovr: 72, pot: 89, arch: 'twoWay', college: 'North Carolina' },
  { name: 'Liam McNeeley', pos: 'SF', age: 19, nat: 'USA', ovr: 72, pot: 89, arch: 'sharpshooter', college: 'UConn' },
  { name: 'Jalil Bethea', pos: 'SG', age: 19, nat: 'USA', ovr: 71, pot: 88, arch: 'allAround', college: 'Miami' },
  { name: 'Ben Saraf', pos: 'PG', age: 19, nat: 'ISR', ovr: 72, pot: 88, arch: 'allAround', college: 'ratiopharm Ulm' },
  { name: 'Noa Essengue', pos: 'PF', age: 19, nat: 'FRA', ovr: 71, pot: 88, arch: 'twoWay', college: 'ratiopharm Ulm' },
  { name: 'Kon Knueppel', pos: 'SG', age: 19, nat: 'USA', ovr: 72, pot: 88, arch: 'sharpshooter', college: 'Duke' },
  { name: 'Rocco Zikarsky', pos: 'C', age: 19, nat: 'AUS', ovr: 70, pot: 87, arch: 'rimProtector', college: 'Brisbane Bullets' },
  { name: 'Joan Beringer', pos: 'C', age: 19, nat: 'FRA', ovr: 70, pot: 87, arch: 'rimProtector', college: 'Cedevita Olimpija' },
  { name: 'Ian Jackson', pos: 'SG', age: 19, nat: 'USA', ovr: 71, pot: 87, arch: 'slasher', college: 'North Carolina' },
  { name: 'Boogie Fland', pos: 'PG', age: 19, nat: 'USA', ovr: 71, pot: 87, arch: 'allAround', college: 'Arkansas' },
  { name: 'Carter Bryant', pos: 'SF', age: 19, nat: 'USA', ovr: 71, pot: 87, arch: 'twoWay', college: 'Arizona' },
  { name: 'Collin Murray-Boyles', pos: 'PF', age: 20, nat: 'USA', ovr: 73, pot: 87, arch: 'postScorer', college: 'South Carolina' },
  { name: 'Asa Newell', pos: 'PF', age: 19, nat: 'USA', ovr: 71, pot: 86, arch: 'stretchBig', college: 'Georgia' },
  { name: 'Derik Queen', pos: 'C', age: 19, nat: 'USA', ovr: 72, pot: 86, arch: 'postScorer', college: 'Maryland' },
  { name: 'Thomas Sorber', pos: 'C', age: 19, nat: 'USA', ovr: 71, pot: 86, arch: 'rimProtector', college: 'Georgetown' },
  { name: 'Will Riley', pos: 'SF', age: 19, nat: 'CAN', ovr: 70, pot: 86, arch: 'allAround', college: 'Illinois' },
  { name: 'Alex Karaban', pos: 'PF', age: 22, nat: 'USA', ovr: 74, pot: 84, arch: 'stretchBig', college: 'UConn' },
  { name: 'Hunter Dickinson', pos: 'C', age: 23, nat: 'USA', ovr: 76, pot: 80, arch: 'postScorer', college: 'Kansas' },
  { name: 'RJ Davis', pos: 'PG', age: 23, nat: 'USA', ovr: 75, pot: 80, arch: 'allAround', college: 'North Carolina' },
  { name: 'Mark Sears', pos: 'PG', age: 23, nat: 'USA', ovr: 75, pot: 81, arch: 'playmaker', college: 'Alabama' },
];

/**
 * Returns the real roster for a club if available, or undefined if procedural generation is needed.
 */
export function getClubRealRoster(clubName: string): RealClubPlayer[] | undefined {
  if (CLUB_REAL_ROSTERS[clubName]) return CLUB_REAL_ROSTERS[clubName];
  const key = Object.keys(CLUB_REAL_ROSTERS).find(
    (k) => clubName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(clubName.toLowerCase())
  );
  return key ? CLUB_REAL_ROSTERS[key] : undefined;
}

/**
 * Builds a SimPlayer for game simulation from a real player entry.
 */
export function realToSimPlayer(real: RealClubPlayer, id: string, rng: Rng): SimPlayer {
  const [lo, hi] = HEIGHT_RANGE[real.pos];
  const height = Math.round((lo + hi) / 2);
  const weight = Math.round(height * 0.52 - 6);
  const arch = real.arch ?? 'twoWay';
  const noise = () => rng.normal(0, 2);
  const attrs = buildAttrs(real.ovr, real.pos, arch, noise);
  applyPhysique(attrs, real.pos, height, weight);
  const ovr = computeOvr(attrs, real.pos);

  return {
    id,
    attrs,
    ovr,
    arch,
    pos: real.pos,
    form: 0,
    fatigue: 0,
    hurt: false,
    minutes: 0,
    starter: false,
  };
}

/**
 * Generates a full deterministic player object from a real draft prospect definition.
 */
export function realProspectToPlayer(real: RealDraftProspect, id: string, season: number, rng: Rng): { p: Player; value: number } {
  const [first, ...rest] = real.name.split(' ');
  const last = rest.join(' ');
  const [lo, hi] = HEIGHT_RANGE[real.pos];
  const height = Math.round(rng.range(lo, hi));
  const weight = Math.round(height * 0.52 - 6 + rng.normal(0, 4));
  const noise = () => rng.normal(0, 2);
  const attrs = buildAttrs(real.ovr, real.pos, real.arch, noise);
  applyPhysique(attrs, real.pos, height, weight);
  const ovr = computeOvr(attrs, real.pos);

  const p: Player = {
    id,
    first,
    last,
    nat: real.nat,
    birthYear: season - real.age,
    age: real.age,
    height,
    weight,
    hand: rng.chance(0.88) ? 'R' : 'L',
    pos: real.pos,
    arch: real.arch,
    ovr,
    pot: Math.max(ovr + 1, real.pot),
    teamId: null,
    prevGmsc: 0,
    yearsPro: 0,
    season: emptyStats(),
    playoffs: emptyStats(),
    contract: null,
    injury: null,
    fatigue: 0,
    form: 0,
    attrs,
    retired: false,
  };

  const val = prospectValue(p.ovr, p.pot, p.age) + rng.normal(0, 1.2);
  return { p, value: val };
}

/**
 * Public summary of real players API for external consumption or UI lookups.
 */
export function getRealPlayersStats() {
  const nbaCount = Object.keys(nbaRosterSnap.players).length;
  const clubCount = Object.keys(CLUB_REAL_ROSTERS).length;
  const clubPlayersCount = Object.values(CLUB_REAL_ROSTERS).reduce((sum, list) => sum + list.length, 0);
  const draftProspectsCount = DRAFT_REAL_PROSPECTS.length;

  return {
    nbaTeams: nbaRosterSnap.teams.length,
    nbaPlayers: nbaCount,
    clubTeams: clubCount,
    clubPlayers: clubPlayersCount,
    draftProspects: draftProspectsCount,
    totalRealPlayers: nbaCount + clubPlayersCount + draftProspectsCount,
  };
}

/**
 * Search real players across all databases (NBA snapshot + Clubs + Draft).
 */
export function searchRealPlayers(query: string): Array<{ name: string; team: string; pos: string; ovr?: number }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Array<{ name: string; team: string; pos: string; ovr?: number }> = [];

  // 1. NBA
  for (const [id, np] of Object.entries(nbaRosterSnap.players)) {
    const fullName = `${np.first} ${np.last}`;
    if (fullName.toLowerCase().includes(q)) {
      const team = nbaRosterSnap.teams.find((t) => t.players.includes(id))?.teamId ?? 'NBA FA';
      results.push({ name: fullName, team, pos: np.pos });
    }
  }

  // 2. Clubs
  for (const [club, players] of Object.entries(CLUB_REAL_ROSTERS)) {
    for (const cp of players) {
      if (cp.name.toLowerCase().includes(q)) {
        results.push({ name: cp.name, team: club, pos: cp.pos, ovr: cp.ovr });
      }
    }
  }

  // 3. Draft Prospects
  for (const dp of DRAFT_REAL_PROSPECTS) {
    if (dp.name.toLowerCase().includes(q)) {
      results.push({ name: dp.name, team: `Draft / ${dp.college ?? 'NCAA'}`, pos: dp.pos, ovr: dp.ovr });
    }
  }

  return results.slice(0, 30);
}
