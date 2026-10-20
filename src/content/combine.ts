// Draft combine tests: what the franchises measure before the draft. Pure data.
import type { AttrKey, MinigameKind, MinigameMechanic, Pos } from '../engine/types';

export interface CombineTestDef {
  id: string;
  label: string;
  /** Short Spanish description shown before the test. */
  desc: string;
  /** Share of the final combine score (the three canonical tests add up to ~3.7-3.8). */
  weight: number;
  kind: MinigameKind;
  mechanic: MinigameMechanic;
  attempts: number;
  /** Attributes that widen the green zone. */
  attrs: AttrKey[];
  /** 0 (relaxed) to 1 (maximum pressure). */
  pressure: number;
  /** Made attempts needed for the best and middle outcome. */
  great: number;
  ok: number;
  /** 'choice'/'reaction': number of options or quadrants. */
  slots?: number;
  /** 'reaction': total reaction window in ms. */
  windowMs?: number;
}

export const COMBINE_TESTS: CombineTestDef[] = [
  {
    id: 'shooting',
    label: 'Tiro',
    desc: 'Diez tiros: los ojeadores quieren ver el rango y la muñeca bajo presión.',
    weight: 1.5,
    kind: 'threes',
    mechanic: 'target',
    attempts: 10,
    attrs: ['three', 'mid'],
    pressure: 0.3,
    great: 7,
    ok: 4,
  },
  {
    id: 'athletic',
    label: 'Atletismo',
    desc: 'Tres mates para medir el salto, la velocidad y la arrancada.',
    weight: 1.2,
    kind: 'dunk',
    mechanic: 'power',
    attempts: 3,
    attrs: ['vert', 'speed', 'accel'],
    pressure: 0.25,
    great: 3,
    ok: 2,
  },
  {
    id: 'handling',
    label: 'Manejo de balón',
    desc: 'Cuatro lecturas con el balón: conducir, mirar y decidir.',
    weight: 1.0,
    kind: 'pass',
    mechanic: 'choice',
    attempts: 4,
    attrs: ['handle', 'vision', 'pass'],
    pressure: 0.35,
    great: 3,
    ok: 2,
    slots: 3,
  },
  {
    id: 'strength',
    label: 'Fuerza',
    desc: 'Tres pruebas de potencia: el cuerpo a cuerpo también se mide.',
    weight: 1.1,
    kind: 'dunk',
    mechanic: 'power',
    attempts: 3,
    attrs: ['strength', 'dunk', 'vert'],
    pressure: 0.35,
    great: 2,
    ok: 1,
  },
  {
    id: 'defense',
    label: 'Defensa',
    desc: 'Cinco reacciones defensivas contra reloj: pies, manos y lectura.',
    weight: 1.0,
    kind: 'steal',
    mechanic: 'reaction',
    attempts: 5,
    attrs: ['perD', 'steal', 'defIQ'],
    pressure: 0.45,
    great: 4,
    ok: 2,
    slots: 3,
    windowMs: 1400,
  },
];

/** The three tests of a combine: two common ones and a third that depends on the position. */
export function combineTestIds(pos: Pos): string[] {
  return ['shooting', 'athletic', pos === 'PG' || pos === 'SG' ? 'handling' : pos === 'SF' || pos === 'PF' ? 'defense' : 'strength'];
}
