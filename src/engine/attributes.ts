import type { Archetype, AttrKey, Attrs, Pos, TrainingFocus } from './types';
import { clamp } from './rng';

export const ATTR_META: { key: AttrKey; label: string; short: string; group: string }[] = [
  { key: 'three', label: 'Tiro de tres', short: '3PT', group: 'Tiro' },
  { key: 'mid', label: 'Media distancia', short: 'MID', group: 'Tiro' },
  { key: 'ft', label: 'Tiros libres', short: 'FT', group: 'Tiro' },
  { key: 'close', label: 'Finalización cerca del aro', short: 'CLS', group: 'Interior' },
  { key: 'layup', label: 'Bandejas', short: 'LAY', group: 'Interior' },
  { key: 'dunk', label: 'Mate', short: 'DNK', group: 'Interior' },
  { key: 'handle', label: 'Manejo de balón', short: 'HDL', group: 'Creación' },
  { key: 'pass', label: 'Pase', short: 'PAS', group: 'Creación' },
  { key: 'vision', label: 'Visión de juego', short: 'VIS', group: 'Creación' },
  { key: 'speed', label: 'Velocidad', short: 'SPD', group: 'Físico' },
  { key: 'accel', label: 'Aceleración', short: 'ACC', group: 'Físico' },
  { key: 'strength', label: 'Fuerza', short: 'STR', group: 'Físico' },
  { key: 'vert', label: 'Salto', short: 'VRT', group: 'Físico' },
  { key: 'stamina', label: 'Resistencia', short: 'STA', group: 'Físico' },
  { key: 'perD', label: 'Defensa perimetral', short: 'PDF', group: 'Defensa' },
  { key: 'intD', label: 'Defensa interior', short: 'IDF', group: 'Defensa' },
  { key: 'steal', label: 'Robo', short: 'STL', group: 'Defensa' },
  { key: 'block', label: 'Tapón', short: 'BLK', group: 'Defensa' },
  { key: 'oreb', label: 'Rebote ofensivo', short: 'ORB', group: 'Rebote' },
  { key: 'dreb', label: 'Rebote defensivo', short: 'DRB', group: 'Rebote' },
  { key: 'offIQ', label: 'IQ ofensivo', short: 'OIQ', group: 'Mental' },
  { key: 'defIQ', label: 'IQ defensivo', short: 'DIQ', group: 'Mental' },
  { key: 'consistency', label: 'Consistencia', short: 'CON', group: 'Mental' },
];
export const ATTR_KEYS = ATTR_META.map((a) => a.key);
export const attrLabel = (k: AttrKey) => ATTR_META.find((a) => a.key === k)!.label;

type W = Partial<Record<AttrKey, number>>;
const OVR_WEIGHTS: Record<Pos, W> = {
  PG: { three: 9, mid: 5, ft: 3, close: 3, layup: 6, dunk: 1, handle: 11, pass: 11, vision: 10, speed: 7, accel: 6, strength: 1, vert: 2, stamina: 3, perD: 7, intD: 1, steal: 4, block: 1, oreb: 1, dreb: 2, offIQ: 9, defIQ: 4, consistency: 4 },
  SG: { three: 12, mid: 8, ft: 3, close: 4, layup: 7, dunk: 3, handle: 8, pass: 5, vision: 4, speed: 6, accel: 6, strength: 2, vert: 3, stamina: 3, perD: 8, intD: 1, steal: 4, block: 1, oreb: 1, dreb: 2, offIQ: 8, defIQ: 4, consistency: 4 },
  SF: { three: 9, mid: 7, ft: 2, close: 6, layup: 7, dunk: 5, handle: 5, pass: 4, vision: 3, speed: 5, accel: 5, strength: 4, vert: 4, stamina: 3, perD: 8, intD: 4, steal: 4, block: 2, oreb: 2, dreb: 4, offIQ: 7, defIQ: 6, consistency: 4 },
  PF: { three: 5, mid: 5, ft: 2, close: 9, layup: 5, dunk: 6, handle: 2, pass: 3, vision: 2, speed: 3, accel: 3, strength: 7, vert: 5, stamina: 3, perD: 4, intD: 9, steal: 2, block: 5, oreb: 6, dreb: 8, offIQ: 6, defIQ: 7, consistency: 4 },
  C: { three: 2, mid: 3, ft: 1, close: 12, layup: 3, dunk: 7, handle: 1, pass: 3, vision: 2, speed: 2, accel: 2, strength: 9, vert: 5, stamina: 3, perD: 2, intD: 12, steal: 1, block: 9, oreb: 8, dreb: 10, offIQ: 5, defIQ: 8, consistency: 4 },
};

/** OVR: 70% position-weighted mean + 30% mean of the five best weighted skills (rewards specialists). */
export function computeOvr(a: Attrs, pos: Pos): number {
  const w = OVR_WEIGHTS[pos];
  let sum = 0;
  let wsum = 0;
  const top: number[] = [];
  for (const k of ATTR_KEYS) {
    const wk = w[k] ?? 0;
    sum += a[k] * wk;
    wsum += wk;
    if (wk >= 5) top.push(a[k]);
  }
  top.sort((x, y) => y - x);
  const best = top.slice(0, 5).reduce((s, v) => s + v, 0) / Math.min(5, top.length);
  const raw = 0.7 * (sum / wsum) + 0.3 * best;
  // Stretch so the elite tail reaches the high 90s.
  const stretched = raw < 60 ? raw : 60 + (raw - 60) * 1.18;
  return Math.round(clamp(stretched, 25, 99));
}

export interface ArchetypeDef {
  id: Archetype;
  label: string;
  desc: string;
  positions: Pos[];
  bias: W; // added to base attributes at generation
  growth: TrainingFocus[]; // training areas with +15% efficiency
  /** Simulation tendencies: share of shots from three, shot volume, playmaking, rebounding. */
  sim: { threeRate: number; usage: number; creation: number; boards: number; ftRate: number };
}

export const ARCHETYPES: ArchetypeDef[] = [
  { id: 'playmaker', label: 'Playmaker', desc: 'Organiza, ve líneas de pase y dirige el ritmo.', positions: ['PG', 'SG'],
    bias: { pass: 12, vision: 12, handle: 10, offIQ: 6, strength: -6, block: -6, intD: -4 }, growth: ['playmaking', 'shooting'],
    sim: { threeRate: 0.4, usage: 1.0, creation: 1.5, boards: 0.8, ftRate: 0.9 } },
  { id: 'sharpshooter', label: 'Sharpshooter', desc: 'Amenaza letal desde el perímetro.', positions: ['PG', 'SG', 'SF'],
    bias: { three: 15, mid: 10, ft: 10, consistency: 4, dunk: -6, strength: -6, intD: -4 }, growth: ['shooting'],
    sim: { threeRate: 0.62, usage: 0.95, creation: 0.8, boards: 0.8, ftRate: 0.7 } },
  { id: 'slasher', label: 'Slasher', desc: 'Ataca el aro con velocidad y explosividad.', positions: ['PG', 'SG', 'SF'],
    bias: { layup: 12, dunk: 12, accel: 10, speed: 8, vert: 8, three: -8 }, growth: ['finishing', 'athleticism'],
    sim: { threeRate: 0.22, usage: 1.1, creation: 1.0, boards: 1.0, ftRate: 1.5 } },
  { id: 'twoWay', label: 'Two-Way Wing', desc: 'Anota y defiende al mejor rival.', positions: ['SG', 'SF', 'PF'],
    bias: { perD: 10, defIQ: 6, steal: 6, mid: 6, layup: 5, three: 4 }, growth: ['defense', 'shooting'],
    sim: { threeRate: 0.38, usage: 1.0, creation: 1.0, boards: 1.0, ftRate: 1.0 } },
  { id: 'threeAndD', label: '3&D', desc: 'Triples en las esquinas y defensa incansable.', positions: ['SG', 'SF', 'PF'],
    bias: { three: 10, perD: 12, steal: 6, defIQ: 6, handle: -8, pass: -6, vision: -6 }, growth: ['defense', 'shooting'],
    sim: { threeRate: 0.65, usage: 0.7, creation: 0.6, boards: 0.9, ftRate: 0.5 } },
  { id: 'stretchBig', label: 'Stretch Big', desc: 'Interior que abre la pista con su tiro.', positions: ['PF', 'C'],
    bias: { three: 14, mid: 8, ft: 6, dunk: -4, block: -4, speed: -4 }, growth: ['shooting', 'rebounding'],
    sim: { threeRate: 0.5, usage: 0.9, creation: 0.7, boards: 1.15, ftRate: 0.7 } },
  { id: 'rimProtector', label: 'Rim Protector', desc: 'Domina la pintura en defensa y el rebote.', positions: ['PF', 'C'],
    bias: { block: 14, intD: 12, dreb: 10, vert: 6, strength: 6, three: -12, handle: -8, pass: -4 }, growth: ['defense', 'rebounding'],
    sim: { threeRate: 0.03, usage: 0.65, creation: 0.6, boards: 1.45, ftRate: 1.1 } },
  { id: 'postScorer', label: 'Post Scorer', desc: 'Juego de espaldas, contacto y toque.', positions: ['PF', 'C'],
    bias: { close: 14, strength: 10, offIQ: 6, oreb: 6, three: -10, speed: -6 }, growth: ['finishing', 'rebounding'],
    sim: { threeRate: 0.08, usage: 1.1, creation: 0.9, boards: 1.3, ftRate: 1.4 } },
  { id: 'allAround', label: 'All-Around Star', desc: 'Sin debilidades claras: hace un poco de todo.', positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    bias: { offIQ: 5, defIQ: 5, pass: 4, three: 3, close: 3, dreb: 3 }, growth: ['balanced'],
    sim: { threeRate: 0.36, usage: 1.05, creation: 1.15, boards: 1.1, ftRate: 1.1 } },
];
// Map lookup: the game sim asks for archetypes several times per player per game.
const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((x) => [x.id, x]));
export const archetypeDef = (a: Archetype) => ARCHETYPE_BY_ID.get(a)!;

export const POS_LABEL: Record<Pos, string> = {
  PG: 'Base', SG: 'Escolta', SF: 'Alero', PF: 'Ala-pívot', C: 'Pívot',
};

const POS_BASE: Record<Pos, W> = {
  PG: { three: 4, handle: 10, pass: 10, vision: 9, speed: 9, accel: 9, strength: -10, vert: 0, intD: -12, block: -14, oreb: -14, dreb: -10, steal: 4, perD: 4 },
  SG: { three: 7, mid: 5, handle: 4, speed: 6, accel: 6, strength: -6, intD: -9, block: -10, oreb: -10, dreb: -7, perD: 4 },
  SF: { strength: 0, perD: 3, intD: -3, block: -4, oreb: -4, dreb: -1 },
  PF: { three: -5, handle: -7, pass: -5, vision: -5, speed: -5, accel: -5, strength: 8, intD: 7, block: 5, oreb: 7, dreb: 8, close: 4, perD: -4 },
  C: { three: -12, mid: -6, ft: -8, handle: -13, pass: -6, vision: -7, speed: -10, accel: -10, strength: 12, intD: 12, block: 12, oreb: 12, dreb: 13, close: 8, dunk: 5, perD: -9, steal: -5 },
};

/** Builds attributes centered around a target level for a position and archetype. */
export function buildAttrs(level: number, pos: Pos, arch: Archetype, noise: () => number): Attrs {
  const a = {} as Attrs;
  const pb = POS_BASE[pos];
  const ab = archetypeDef(arch).bias;
  for (const k of ATTR_KEYS) {
    a[k] = Math.round(clamp(level + (pb[k] ?? 0) + (ab[k] ?? 0) + noise(), 20, 99));
  }
  return a;
}

/** Specialization label shown in the profile, derived from position + archetype + attributes. */
export function specialization(pos: Pos, arch: Archetype, a: Attrs): string {
  if (arch === 'playmaker') return 'Base organizador';
  if (arch === 'sharpshooter') return a.three >= 80 ? 'Especialista en triples' : 'Escolta tirador';
  if (arch === 'slasher') return pos === 'PG' ? 'Base anotador' : 'Alero anotador';
  if (arch === 'twoWay') return 'Alero two-way';
  if (arch === 'threeAndD') return 'Especialista defensivo';
  if (arch === 'stretchBig') return 'Ala-pívot versátil';
  if (arch === 'rimProtector') return 'Interior defensivo';
  if (arch === 'postScorer') return 'Pívot dominante';
  return pos === 'PG' || pos === 'SG' ? 'Generador total' : 'Jugador total';
}

export const TRAINING_AREAS: Record<TrainingFocus, { label: string; attrs: AttrKey[]; desc: string }> = {
  shooting: { label: 'Tiro', attrs: ['three', 'mid', 'ft'], desc: 'Mecánica, repeticiones y lectura de bloqueos.' },
  finishing: { label: 'Finalización', attrs: ['close', 'layup', 'dunk'], desc: 'Contacto, footwork y toque cerca del aro.' },
  playmaking: { label: 'Creación', attrs: ['handle', 'pass', 'vision', 'offIQ'], desc: 'Bote, pick and roll y toma de decisiones.' },
  defense: { label: 'Defensa', attrs: ['perD', 'intD', 'steal', 'block', 'defIQ'], desc: 'Desplazamientos, ayudas y vídeo del rival.' },
  athleticism: { label: 'Preparación física', attrs: ['speed', 'accel', 'vert', 'stamina'], desc: 'Explosividad y resistencia.' },
  rebounding: { label: 'Rebote y fuerza', attrs: ['strength', 'oreb', 'dreb'], desc: 'Gimnasio, posición y bloqueo de rebote.' },
  balanced: { label: 'Equilibrado', attrs: ATTR_KEYS.filter((k) => k !== 'consistency'), desc: 'Un poco de todo; mejoras pequeñas y repartidas.' },
  rest: { label: 'Descanso', attrs: [], desc: 'Reduce fatiga y riesgo de lesión. Sin mejoras técnicas.' },
};

/** Derived composite ratings used by the game simulation. */
export function composites(a: Attrs) {
  return {
    three: a.three,
    inside: (a.close * 1.2 + a.layup + a.dunk * 0.8 + a.strength * 0.3 + a.vert * 0.3) / 3.6,
    mid: a.mid,
    ft: a.ft,
    creation: (a.handle + a.speed * 0.5 + a.accel * 0.5 + a.offIQ) / 3,
    playmaking: (a.pass * 1.2 + a.vision + a.offIQ * 0.6) / 2.8,
    defense: (a.perD + a.intD + a.defIQ + a.steal * 0.5 + a.block * 0.5) / 4,
    perimeterD: (a.perD * 1.4 + a.steal * 0.6 + a.defIQ) / 3,
    interiorD: (a.intD * 1.3 + a.block * 0.9 + a.defIQ * 0.8) / 3,
    rebound: (a.oreb + a.dreb * 1.2 + a.vert * 0.4 + a.strength * 0.4) / 3,
    steal: a.steal,
    block: a.block,
    ballSecurity: (a.handle + a.offIQ + a.consistency) / 3,
    stamina: a.stamina,
  };
}
