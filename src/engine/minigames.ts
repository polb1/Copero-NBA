// Minigame engine: difficulty levels, spec generation and effect scaling. Pure, deterministic.
import type { ActiveEvent, Career, EffectBag, MinigameSpec, MinigameTierId, Player } from './types';
import type { MinigameDef } from '../content/events';
import type { MinigameTierDef } from '../content/minigames';
import { MINIGAME_TIER_LABEL, MINIGAME_TIERS } from '../content/minigames';
import { clamp } from './rng';

/** Level definition by id. Unknown ids fall back to 'normal' (save compatibility). */
export function tierDef(id: MinigameTierId): MinigameTierDef {
  return MINIGAME_TIERS.find((t) => t.id === id) ?? MINIGAME_TIERS.find((t) => t.id === 'normal')!;
}

/** Context modifier (-0.25..0.12): good morale/form help, pressure and fatigue hurt. */
export function stateMod(u: Player, c: Career): number {
  return clamp(
    (c.morale - 50) * 0.0016 - (c.pressure / 100) * 0.1 - (u.fatigue / 100) * 0.08 + u.form * 0.008,
    -0.25,
    0.12,
  );
}

/** Level picked from the player's state when `def.autoScale` is set. */
export function autoTier(u: Player, c: Career): MinigameTierId {
  const stress = 0.45 * c.pressure + 0.35 * u.fatigue + 0.9 * Math.max(0, 55 - c.morale) - u.form * 1.5;
  return stress < 18 ? 'easy' : stress < 35 ? 'normal' : 'hard';
}

/** Levels offered by an event: one auto-scaled, the declared list, or 'normal' only. */
export function buildTiers(def: MinigameDef, u: Player, c: Career): NonNullable<ActiveEvent['minigameTiers']> {
  if (def.autoScale) {
    const id = autoTier(u, c);
    return [{ id, label: MINIGAME_TIER_LABEL[id], desc: tierDef(id).desc, spec: buildSpec(def, u, c, id) }];
  }
  const ids = def.tiers ?? ['normal'];
  return ids.map((id) => ({
    id,
    label: MINIGAME_TIER_LABEL[id],
    desc: tierDef(id).desc,
    spec: buildSpec(def, u, c, id),
  }));
}

/** Challenge parameters for one level. With tier 'normal' the meter output is the legacy one, unchanged. */
export function buildSpec(def: MinigameDef, u: Player, c: Career, tier: MinigameTierId): MinigameSpec {
  const mechanic = def.mechanic ?? 'meter';
  const t = tierDef(tier);
  const p = def.pressure;
  const skill = def.attrs.length ? def.attrs.reduce((s, k) => s + u.attrs[k], 0) / def.attrs.length : 50;
  const m = stateMod(u, c);

  let zone = 0;
  let speed = 0;
  let autoProb = 0;
  let windowMs: number | undefined;
  let slots: number | undefined;

  if (mechanic === 'target') {
    zone = clamp((24 + (skill - 50) * 0.3 - p * 8 - m * 45) * t.zoneMul, 8, 46);
    speed = clamp(0.3 + p * 0.5 + (skill - 50) * 0.004, 0.22, 1.0) * t.speedMul;
    autoProb = clamp((zone / 100) * 1.6 + m, 0.12, 0.88) * t.probMul;
    slots = def.slots ?? 1;
  } else if (mechanic === 'power') {
    zone = clamp((14 + (skill - 50) * 0.24 - p * 5 - m * 25) * t.zoneMul, 5, 34);
    speed = clamp(0.55 + (100 - skill) * 0.004 + p * 0.25, 0.4, 1.3) * t.speedMul;
    autoProb = clamp((zone / 100) * 1.9 + m, 0.12, 0.9) * t.probMul;
  } else if (mechanic === 'reaction') {
    zone = clamp((26 + (skill - 50) * 0.36 - p * 6 - m * 40) * t.zoneMul, 8, 48);
    speed = 0;
    // A declared window (combine tests) overrides the reaction formula.
    windowMs =
      def.windowMs !== undefined
        ? clamp(def.windowMs * t.windowMul, 500, 2400)
        : clamp(1500 - (skill - 50) * 9 - p * 260 - m * 700, 500, 2400) * t.windowMul;
    autoProb = clamp((zone / 100) * 1.1 + m, 0.1, 0.8) * t.probMul;
  } else if (mechanic === 'choice') {
    zone = clamp((58 + (skill - 50) * 0.45 - p * 10 - m * 50) * t.zoneMul, 20, 95);
    speed = 0;
    slots = def.slots ?? 3;
    autoProb = clamp((zone / 100) * 0.95 + m, 0.12, 0.92) * t.probMul;
  } else if (mechanic === 'drag') {
    zone = clamp((30 + (skill - 50) * 0.4 - p * 10 - m * 45) * t.zoneMul, 10, 55);
    speed = 0;
    autoProb = clamp((zone / 100) * 1.5 + m, 0.12, 0.9) * t.probMul;
  } else {
    // Legacy shot meter: identical to events.ts minigameSpec() before the level multipliers.
    const nerves = p * (1 - (c.morale - 50) / 200) * (1 + c.pressure / 200);
    zone = clamp(7 + (skill - 50) * 0.32 - nerves * 6 + u.form * 0.25, 5, 26);
    speed = clamp(0.55 + p * 0.5, 0.5, 1.1);
    autoProb = clamp(0.2 + zone * 0.026, 0.2, 0.88);
  }

  zone = mechanic === 'meter' ? clamp(zone * t.zoneMul, 4, 30) : zone;
  speed = clamp(speed * t.speedMul, 0.4, 1.4);
  autoProb = clamp(autoProb * t.probMul, 0.1, 0.95);

  const spec: MinigameSpec = {
    kind: def.kind,
    attempts: def.attempts,
    zone: Math.round(zone * 10) / 10,
    speed: Math.round(speed * 100) / 100,
    autoProb,
    great: def.great,
    ok: def.ok,
    mechanic,
    tier,
    risk: { injury: t.injury },
    reward: { mul: t.rewardMul },
  };
  if (slots !== undefined) spec.slots = slots;
  if (windowMs !== undefined) spec.windowMs = windowMs;
  return spec;
}

/** Integer-ish career/player fields scaled by the level multiplier. */
const SCALED_KEYS = [
  'trust', 'morale', 'chemistry', 'reputation', 'fame', 'pressure',
  'loyalty', 'workEthic', 'fatigue', 'form', 'pot', 'ovr',
] as const;

/** Fields copied verbatim: they are flags, narrative hooks or discrete choices. */
const PASSTHROUGH_KEYS = [
  'flag', 'unflag', 'chain', 'injure', 'heal', 'playThrough',
  'gleague', 'recall', 'tradeRequest', 'agent', 'trophy', 'news',
  'buyAsset', 'sellAsset', 'borrow', 'allIn', 'bankrupt',
] as const;

/** New EffectBag with every numeric effect multiplied by `mul`. The original bag is never mutated. */
export function scaleEffects(e: EffectBag, mul: number): EffectBag {
  const out: Record<string, unknown> = {};

  for (const k of SCALED_KEYS) {
    const v = e[k];
    if (v !== undefined) out[k] = Math.round(v * mul);
  }

  if (e.money !== undefined) out.money = Math.round((e.money * mul) / 1000) * 1000;
  if (e.endorsement !== undefined) out.endorsement = Math.round((e.endorsement * mul) / 10000) * 10000;
  if (e.injuryRisk !== undefined) out.injuryRisk = Math.round(e.injuryRisk * mul * 100) / 100;

  if (e.attrs) {
    const attrs: Record<string, number> = {};
    for (const [k, v] of Object.entries(e.attrs)) {
      const d = Math.round((v ?? 0) * mul);
      if (d !== 0) attrs[k] = d;
    }
    if (Object.keys(attrs).length) out.attrs = attrs;
  }

  for (const k of PASSTHROUGH_KEYS) {
    const v = e[k];
    if (v !== undefined) out[k] = v;
  }

  return out as EffectBag;
}
