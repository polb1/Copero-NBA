import type { Injury, Player } from './types';
import { clamp, type Rng } from './rng';

const NAMES: Record<Injury['severity'], { name: string; days: [number, number] }[]> = {
  leve: [
    { name: 'Esguince leve de tobillo', days: [2, 8] },
    { name: 'Contusión en la cadera', days: [1, 5] },
    { name: 'Molestias en la espalda', days: [2, 7] },
    { name: 'Dedo dislocado', days: [2, 6] },
    { name: 'Gripe', days: [1, 4] },
    { name: 'Sobrecarga en el gemelo', days: [3, 9] },
  ],
  moderada: [
    { name: 'Esguince de tobillo de grado 2', days: [12, 30] },
    { name: 'Distensión en el isquiotibial', days: [14, 28] },
    { name: 'Tendinitis rotuliana', days: [10, 25] },
    { name: 'Fractura de un dedo de la mano', days: [20, 40] },
    { name: 'Esguince de rodilla (MCL)', days: [18, 40] },
  ],
  grave: [
    { name: 'Rotura del ligamento cruzado anterior', days: [220, 300] },
    { name: 'Rotura del tendón de Aquiles', days: [240, 330] },
    { name: 'Fractura por estrés en el pie', days: [70, 130] },
    { name: 'Lesión de menisco', days: [45, 90] },
  ],
};

export function injuryRisk(p: Player, minutes: number, history: number, extra = 0) {
  const age = p.age > 30 ? 1 + (p.age - 30) * 0.06 : 1;
  return 0.0024 * (minutes / 30) * (1 + p.fatigue / 45) * (1 + history * 0.12) * age * (1 + extra) * (p.injury?.playingThrough ? 2.2 : 1);
}

export function rollInjury(rng: Rng, forced?: Injury['severity']): Injury {
  const r = rng.next();
  const severity: Injury['severity'] = forced ?? (r < 0.72 ? 'leve' : r < 0.965 ? 'moderada' : 'grave');
  const def = rng.pick(NAMES[severity]);
  const days = rng.int(def.days[0], def.days[1]);
  return { name: def.name, severity, daysLeft: days, totalDays: days };
}

/** Lasting damage from serious injuries: athletic loss and sometimes potential. */
export function applyInjuryAftermath(p: Player, inj: Injury, rng: Rng) {
  if (inj.severity !== 'grave') return [] as string[];
  const notes: string[] = [];
  const loss = rng.int(1, 4);
  for (const k of ['speed', 'accel', 'vert'] as const) p.attrs[k] = clamp(p.attrs[k] - loss, 20, 99);
  notes.push(`Atletismo −${loss}`);
  if (rng.chance(0.5)) {
    const pl = rng.int(1, 4);
    p.pot = Math.max(p.ovr, p.pot - pl);
    notes.push(`Potencial −${pl}`);
  }
  return notes;
}

export const injuryLabel = (i: Injury) =>
  `${i.name} (${i.severity}) · ${i.daysLeft} día${i.daysLeft === 1 ? '' : 's'}`;
