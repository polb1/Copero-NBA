import type { Career, Goal, Player, StatLine } from './types';
import { averages, f1, fpct } from './stats';

export interface GoalDef {
  id: string;
  label: string;
  desc: string;
  available: (c: Career, u: Player) => boolean;
  /** Returns [achieved, progress text]. */
  check: (s: StatLine, c: Career, u: Player) => [boolean, string];
  reward: { reputation: number; morale: number; trust: number; pot?: number };
}

export const GOALS: GoalDef[] = [
  { id: 'shooting', label: 'Mejorar el tiro exterior', desc: '≥ 36% en triples con al menos 2 intentos por partido.',
    available: (_c, u) => u.attrs.three >= 50,
    check: (s) => { const a = averages(s); return [a.tpp >= 0.36 && s.tpa / Math.max(1, s.gp) >= 2, `${fpct(a.tpp)} en ${f1(s.tpa / Math.max(1, s.gp))} intentos`]; },
    reward: { reputation: 3, morale: 4, trust: 4 } },
  { id: 'playmaking', label: 'Aumentar la creación de juego', desc: '≥ 4 asistencias por partido.',
    available: (_c, u) => ['PG', 'SG', 'SF'].includes(u.pos),
    check: (s) => { const a = averages(s); return [a.apg >= 4, `${f1(a.apg)} AST`]; },
    reward: { reputation: 3, morale: 4, trust: 4 } },
  { id: 'turnovers', label: 'Reducir pérdidas', desc: 'Menos de 1 pérdida por cada 2,5 asistencias + 15 minutos.',
    available: () => true,
    check: (s) => { const a = averages(s); const limit = a.apg / 2.5 + a.mpg / 15; return [s.gp >= 20 && a.tpg <= limit, `${f1(a.tpg)} TOV (máx. ${f1(limit)})`]; },
    reward: { reputation: 2, morale: 3, trust: 6 } },
  { id: 'defense', label: 'Mejorar la defensa', desc: '≥ 1,8 robos + tapones por partido.',
    available: () => true,
    check: (s) => { const a = averages(s); return [a.spg + a.bpg >= 1.8, `${f1(a.spg + a.bpg)} STL+BLK`]; },
    reward: { reputation: 3, morale: 3, trust: 6 } },
  { id: 'starter', label: 'Ganarte la titularidad', desc: 'Al menos 41 partidos como titular.',
    available: (c) => c.trust < 90,
    check: (s) => [s.gs >= 41, `${s.gs} titularidades`],
    reward: { reputation: 4, morale: 6, trust: 5 } },
  { id: 'efficiency', label: 'Mejorar la eficiencia', desc: 'True shooting ≥ 58% con 8+ tiros por partido.',
    available: () => true,
    check: (s) => { const a = averages(s); return [a.ts >= 0.58 && s.fga / Math.max(1, s.gp) >= 8, `TS ${fpct(a.ts)}`]; },
    reward: { reputation: 4, morale: 4, trust: 4 } },
  { id: 'scoring', label: 'Dar el salto anotador', desc: '≥ 18 puntos por partido.',
    available: (_c, u) => u.ovr >= 70,
    check: (s) => { const a = averages(s); return [a.ppg >= 18, `${f1(a.ppg)} PTS`]; },
    reward: { reputation: 5, morale: 5, trust: 3 } },
  { id: 'rebounding', label: 'Dominar el rebote', desc: '≥ 8 rebotes por partido.',
    available: (_c, u) => ['SF', 'PF', 'C'].includes(u.pos),
    check: (s) => { const a = averages(s); return [a.rpg >= 8, `${f1(a.rpg)} REB`]; },
    reward: { reputation: 3, morale: 3, trust: 4 } },
  { id: 'durability', label: 'Estar disponible', desc: 'Jugar al menos 70 partidos.',
    available: () => true,
    check: (s) => [s.gp >= 70, `${s.gp} partidos`],
    reward: { reputation: 2, morale: 3, trust: 5 } },
  { id: 'strength', label: 'Ganar fuerza', desc: 'Subir +3 el atributo de fuerza durante la temporada.',
    available: (_c, u) => u.attrs.strength < 90,
    check: (_s, c, u) => { const base = c.flags.goalStrengthBase ?? u.attrs.strength; return [u.attrs.strength - base >= 3, `+${u.attrs.strength - base} fuerza`]; },
    reward: { reputation: 1, morale: 3, trust: 3, pot: 1 } },
];

export const goalDef = (id: string) => GOALS.find((g) => g.id === id)!;

export function goalOptions(c: Career, u: Player) {
  return GOALS.filter((g) => g.available(c, u));
}

export function makeGoal(id: string): Goal {
  const d = goalDef(id);
  return { id, label: d.label, desc: d.desc, status: 'active' };
}

export function updateGoalProgress(c: Career, u: Player, stats: StatLine) {
  for (const g of c.goals) {
    if (g.status !== 'active') continue;
    const [, text] = goalDef(g.id).check(stats, c, u);
    g.progress = text;
  }
}
