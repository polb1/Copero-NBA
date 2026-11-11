// Reto diario: el mismo escenario y el mismo objetivo para todo el mundo cada día.
// Determinista por fecha (local), sin servidor: el seed sale del YYYY-MM-DD.
import type { Career } from './types';
import type { NewCareerInput } from './career';
import { awardCounts, careerTotals } from './legacy';

// Retos del día: más duros que el reto de carrera. El de carrera es "el objetivo
// de tu carrera"; el diario es un extra de dificultad con racha, para todos igual.
export interface DailyGoal {
  id: string;
  label: string;
  progress: (c: Career) => [number, number];
}

const award = (k: string) => (c: Career) => awardCounts(c)[k] ?? 0;
const nbaSeasons = (c: Career) => new Set(c.seasons.filter((s) => s.comp === 'NBA' && s.stats.gp > 0).map((s) => s.season)).size;
const peak = (c: Career) => Math.max(0, ...c.ovrHistory.map((o) => o.ovr));

export const DAILY_GOALS: DailyGoal[] = [
  { id: 'd-ring2', label: 'Gana 2 anillos NBA', progress: (c) => [award('champion')(c), 2] },
  { id: 'd-allstar5', label: 'Sé All-Star 5 veces', progress: (c) => [award('allStar')(c), 5] },
  { id: 'd-ovr90', label: 'Alcanza 90 de OVR', progress: (c) => [peak(c), 90] },
  { id: 'd-seasons15', label: 'Juega 15 temporadas en la NBA', progress: (c) => [nbaSeasons(c), 15] },
  { id: 'd-pts30k', label: 'Anota 30.000 puntos en la NBA', progress: (c) => [careerTotals(c).pts, 30000] },
  { id: 'd-allnba2', label: 'Entra 2 veces en un quinteto All-NBA', progress: (c) => [award('allNba1')(c) + award('allNba2')(c) + award('allNba3')(c), 2] },
];

const KEY = 'anillero.daily.v1';

export interface DailyState {
  date: string;      // último día con reto jugado
  done: boolean;     // si se cumplió ese día
  streak: number;    // días consecutivos cumplidos
  playedDays: number;
  best: number;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** FNV-1a sobre la fecha: entero estable y distinto cada día. */
export function seedForDay(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Objetivo del día: mismo índice para todos porque depende solo de la fecha. */
export function dailyChallengeIndex(key: string): number {
  return seedForDay(key) % DAILY_GOALS.length;
}

/** Objetivo del día (duro, igual para todos). */
export function dailyGoal(key: string): DailyGoal {
  return DAILY_GOALS[dailyChallengeIndex(key)];
}

export function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DailyState;
  } catch { /* modo incógnito o storage bloqueado */ }
  return { date: '', done: false, streak: 0, playedDays: 0, best: 0 };
}

function saveDaily(s: DailyState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function dailyPlayedToday(s = loadDaily()): boolean {
  return s.date === todayKey();
}

/**
 * Registra el resultado del día. Idempotente: repetir el reto el mismo día
 * no infla la racha, solo actualiza el mejor resultado.
 */
export function recordDaily(done: boolean): DailyState {
  const key = todayKey();
  const s = loadDaily();
  if (s.date === key) {
    const next = { ...s, done: s.done || done, best: s.best + (done && !s.done ? 1 : 0) };
    saveDaily(next);
    return next;
  }
  // ¿venía de ayer? entonces la racha continúa; si no, empieza de cero
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const siguiente = s.date === todayKey(ayer) && s.done ? s.streak + (done ? 1 : 0) : (done ? 1 : 0);
  const next: DailyState = {
    date: key,
    done,
    streak: siguiente,
    playedDays: s.playedDays + 1,
    best: Math.max(s.best, siguiente),
  };
  saveDaily(next);
  return next;
}

/** Escenario fijo del día: mismo país, posición y arquetipo para todos. */
export function dailySetup(key: string): Partial<NewCareerInput> {
  const seed = seedForDay(key);
  const nats = ['ESP', 'ARG', 'FRA', 'SRB', 'USA', 'GRE', 'TUR', 'LTU'];
  const posiciones = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  const arquetipos = ['sharpshooter', 'slasher', 'playmaker'] as const; // los ids de ARCHETYPES (otro id rompía el reto)
  return {
    nat: nats[seed % nats.length],
    pos: posiciones[(seed >>> 3) % posiciones.length] as NewCareerInput['pos'],
    arch: arquetipos[(seed >>> 7) % arquetipos.length] as NewCareerInput['arch'],
    first: 'Jugador',
    last: 'Reto Diario',
    number: (seed % 99) + 1,
  };
}

/** Etiqueta del objetivo del día, para mostrarla antes de jugar. */
export function dailyGoalLabel(key: string): string {
  return dailyGoal(key).label;
}

/** ¿Esta carrera es la del reto de hoy? */
export function isDailyCareer(c: Career): boolean {
  return (c.flags as Record<string, unknown>).daily === todayKey();
}

/** Resultado del reto para esta carrera. */
export function dailyResult(c: Career): { label: string; done: boolean; progress: [number, number] } {
  // El objetivo es el del día en que se creó la carrera, no el reto de carrera.
  const id = (c.flags as Record<string, unknown>).dailyGoal as string | undefined;
  const goal = DAILY_GOALS.find((g) => g.id === id) ?? dailyGoal(String((c.flags as Record<string, unknown>).daily ?? todayKey()));
  const [v, target] = goal.progress(c);
  return { label: goal.label, done: v >= target, progress: [v, target] };
}
