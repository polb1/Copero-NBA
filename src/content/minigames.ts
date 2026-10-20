// Minigame content tables: difficulty levels and UI hints. Pure data.
import type { MinigameKind, MinigameTierId } from '../engine/types';

export interface MinigameTierDef {
  id: MinigameTierId;
  label: string;
  /** Short risk/reward sentence. */
  desc: string;
  /** Green zone width multiplier. */
  zoneMul: number;
  /** Marker speed multiplier. */
  speedMul: number;
  /** Fine multiplier for the simulated probability. */
  probMul: number;
  /** Multiplier for the good effects. */
  rewardMul: number;
  /** Multiplier for the bad effects. */
  riskMul: number;
  /** Chance (0..1) of a light injury when failing. */
  injury: number;
  /** Reaction window multiplier. */
  windowMul: number;
}

export const MINIGAME_TIERS: MinigameTierDef[] = [
  { id: 'easy', label: 'Suave', desc: 'Zona amplia, menos castigo. Recompensa menor.',
    zoneMul: 1.35, speedMul: 0.82, probMul: 1.08, rewardMul: 0.70, riskMul: 0.60, injury: 0, windowMul: 1.35 },
  { id: 'normal', label: 'Normal', desc: 'El equilibrio de siempre.',
    zoneMul: 1, speedMul: 1, probMul: 1, rewardMul: 1, riskMul: 1, injury: 0.06, windowMul: 1 },
  { id: 'hard', label: 'Exigente', desc: 'Zona mínima y más castigo. Si fallas, duele.',
    zoneMul: 0.72, speedMul: 1.25, probMul: 0.9, rewardMul: 1.5, riskMul: 1.6, injury: 0.18, windowMul: 0.72 },
];

export const MINIGAME_TIER_LABEL: Record<MinigameTierId, string> = {
  easy: 'Suave',
  normal: 'Normal',
  hard: 'Exigente',
};

/** Shown when a challenge carries a kind without hint (older saves, future kinds). */
export const MINIGAME_HINT_FALLBACK = 'Dale al ritmo y no te precipites.';

/** UI hints per kind. The 4 legacy texts are verbatim copies of the old ShotMeter dictionary keys. */
export const MINIGAME_HINTS: Record<MinigameKind, string> = {
  clutch: 'Un solo tiro. Suelta cuando el marcador esté en la zona verde.',
  freethrows: 'Dos tiros libres. Cada fallo cuenta.',
  threes: 'Diez balones. Necesitas 7 para ganar el concurso.',
  drill: 'Cinco tiros desde la esquina.',
  spotlight: 'Cinco dianas. Toca cuando la línea cruce el centro.',
  dunk: 'Tres mates. Mantén pulsado y suelta dentro de la franja.',
  boards: 'Cinco rebotes. Toca el cuadrante correcto y rápido.',
  steal: 'Cuatro robos. Toca la dirección correcta a tiempo.',
  pass: 'Tres pases. Elige al compañero con el carril libre.',
  close: 'Tres finalizaciones. Timing y control.',
};

/** Safe reader: unknown kinds fall back instead of rendering `undefined`. */
export function minigameHint(kind: MinigameKind | string): string {
  return (MINIGAME_HINTS as Record<string, string>)[kind] ?? MINIGAME_HINT_FALLBACK;
}
