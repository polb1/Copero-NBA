import { EVENTS } from '../../content/events';
import type { MinigameDef } from '../../content/events';
import * as api from '../api';
import { userOf } from '../career';
import { minigameSpec } from '../events';
import { autoTier, buildSpec, buildTiers, scaleEffects, stateMod, tierDef } from '../minigames';
import type { Career, EffectBag, MinigameMechanic, MinigameTierId } from '../types';
import { baseInput } from './autopilot';

const LEGACY = ['mg-clutch', 'mg-freethrows', 'mg-threes', 'mg-drill'];

function newCareer(): Career {
  return api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), 4321);
}

function mgDef(id: string): MinigameDef {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev?.minigame) throw new Error(`missing minigame ${id}`);
  return ev.minigame;
}

function plainDef(over: Partial<MinigameDef> = {}): MinigameDef {
  return {
    kind: 'spotlight',
    attempts: 5,
    attrs: ['three', 'consistency'],
    pressure: 0.5,
    great: 4,
    ok: 2,
    outcomes: {
      great: { effects: {}, text: 'great' },
      ok: { effects: {}, text: 'ok' },
      fail: { effects: {}, text: 'fail' },
    },
    tiers: undefined,
    autoScale: undefined,
    ...over,
  };
}

describe('minigame specs and levels', () => {
  test('tier normal reproduces the legacy shot-meter numbers exactly', () => {
    const c = newCareer();
    const u = userOf(c);
    for (const id of LEGACY) {
      const d = mgDef(id);
      const legacy = minigameSpec(d, u, c);
      const spec = buildSpec(d, u, c, 'normal');
      expect(spec.kind).toBe(legacy.kind);
      expect(spec.attempts).toBe(legacy.attempts);
      expect(spec.zone).toBe(legacy.zone);
      expect(spec.speed).toBe(legacy.speed);
      expect(spec.autoProb).toBe(legacy.autoProb);
      expect(spec.great).toBe(legacy.great);
      expect(spec.ok).toBe(legacy.ok);
      expect(spec.mechanic).toBe('meter');
      expect(spec.tier).toBe('normal');
    }

    // Same parity with an extreme shooter and a bad state.
    u.attrs.three = 95;
    u.attrs.mid = 88;
    u.fatigue = 80;
    u.form = -7;
    c.morale = 30;
    c.pressure = 70;
    for (const id of LEGACY) {
      const d = mgDef(id);
      const legacy = minigameSpec(d, u, c);
      const spec = buildSpec(d, u, c, 'normal');
      expect(spec.zone).toBe(legacy.zone);
      expect(spec.speed).toBe(legacy.speed);
      expect(spec.autoProb).toBe(legacy.autoProb);
    }
  });

  test('the level widens/narrows the zone, speeds up the meter and changes the probability', () => {
    const c = newCareer();
    const u = userOf(c);
    for (const id of ['mg-drill', 'mg-clutch']) {
      const d = mgDef(id);
      const easy = buildSpec(d, u, c, 'easy');
      const normal = buildSpec(d, u, c, 'normal');
      const hard = buildSpec(d, u, c, 'hard');
      expect(easy.zone).toBeGreaterThan(normal.zone);
      expect(normal.zone).toBeGreaterThan(hard.zone);
      expect(easy.speed).toBeLessThan(normal.speed);
      expect(normal.speed).toBeLessThan(hard.speed);
      expect(easy.autoProb).toBeGreaterThan(hard.autoProb);
      expect(easy.reward!.mul).toBeLessThan(hard.reward!.mul);
      expect(easy.risk!.injury).toBeLessThan(hard.risk!.injury);
    }
  });

  test('autoTier follows pressure, fatigue and morale', () => {
    const c = newCareer();
    const u = userOf(c);

    c.pressure = 0;
    u.fatigue = 0;
    c.morale = 60;
    expect(autoTier(u, c)).toBe('easy');

    c.pressure = 40;
    u.fatigue = 20;
    c.morale = 50;
    expect(autoTier(u, c)).toBe('normal'); // 18 + 7 + 4.5 = 29.5

    c.pressure = 100;
    u.fatigue = 100;
    c.morale = 10;
    expect(autoTier(u, c)).toBe('hard');
  });

  test('buildTiers offers one auto level, the declared list, or normal only', () => {
    const c = newCareer();
    const u = userOf(c);

    const single = buildTiers(plainDef(), u, c);
    expect(single).toHaveLength(1);
    expect(single[0].id).toBe('normal');
    expect(single[0].label).toBe('Normal');
    expect(single[0].spec.tier).toBe('normal');

    const ids: MinigameTierId[] = ['easy', 'normal', 'hard'];
    const three = buildTiers(plainDef({ tiers: ids }), u, c);
    expect(three.map((t) => t.id)).toEqual(ids);
    expect(three.map((t) => t.label)).toEqual(['Suave', 'Normal', 'Exigente']);
    expect(three[0].spec.zone).toBeGreaterThan(three[2].spec.zone);

    const auto = buildTiers(plainDef({ autoScale: true }), u, c);
    expect(auto).toHaveLength(1);
    expect(auto[0].id).toBe(autoTier(u, c));
    expect(auto[0].label).toBe(tierDef(auto[0].id).label);
  });

  test('each non-meter mechanic stays inside sane ranges', () => {
    const c = newCareer();
    const u = userOf(c);

    const target = buildSpec(plainDef({ mechanic: 'target' }), u, c, 'normal');
    expect(target.mechanic).toBe('target');
    expect(target.tier).toBe('normal');
    expect(target.zone).toBeGreaterThanOrEqual(8);
    expect(target.zone).toBeLessThanOrEqual(46);
    expect(target.speed).toBeGreaterThanOrEqual(0.4);
    expect(target.speed).toBeLessThanOrEqual(1.4);
    expect(target.autoProb).toBeGreaterThanOrEqual(0.1);
    expect(target.autoProb).toBeLessThanOrEqual(0.95);
    expect(target.windowMs).toBeUndefined();
    expect(target.slots).toBeUndefined();

    const power = buildSpec(plainDef({ mechanic: 'power' }), u, c, 'normal');
    expect(power.mechanic).toBe('power');
    expect(power.zone).toBeGreaterThanOrEqual(5);
    expect(power.zone).toBeLessThanOrEqual(34);
    expect(power.speed).toBeGreaterThanOrEqual(0.4);
    expect(power.speed).toBeLessThanOrEqual(1.4);

    const reaction = buildSpec(plainDef({ mechanic: 'reaction' }), u, c, 'normal');
    expect(reaction.mechanic).toBe('reaction');
    expect(reaction.zone).toBeGreaterThanOrEqual(8);
    expect(reaction.zone).toBeLessThanOrEqual(48);
    expect(reaction.windowMs).toBeGreaterThanOrEqual(500 * 0.72);
    expect(reaction.windowMs).toBeLessThanOrEqual(2400);
    expect(reaction.autoProb).toBeGreaterThanOrEqual(0.1);
    expect(reaction.autoProb).toBeLessThanOrEqual(0.95);

    const choice = buildSpec(plainDef({ mechanic: 'choice' }), u, c, 'normal');
    expect(choice.mechanic).toBe('choice');
    expect(choice.slots).toBe(3);
    expect(choice.zone).toBeGreaterThanOrEqual(20);
    expect(choice.zone).toBeLessThanOrEqual(95);
    expect(choice.autoProb).toBeGreaterThanOrEqual(0.1);
    expect(choice.autoProb).toBeLessThanOrEqual(0.95);
    expect(buildSpec(plainDef({ mechanic: 'choice', slots: 4 }), u, c, 'hard').slots).toBe(4);

    const mechanics: MinigameMechanic[] = ['meter', 'target', 'power', 'reaction', 'choice'];
    for (const mechanic of mechanics) {
      for (const tier of ['easy', 'normal', 'hard'] as MinigameTierId[]) {
        const spec = buildSpec(plainDef({ mechanic }), u, c, tier);
        expect(Number.isFinite(spec.zone)).toBe(true);
        expect(Number.isFinite(spec.speed)).toBe(true);
        expect(spec.autoProb).toBeGreaterThanOrEqual(0.1);
        expect(spec.autoProb).toBeLessThanOrEqual(0.95);
        expect(spec.risk!.injury).toBe(tierDef(tier).injury);
        expect(spec.reward!.mul).toBe(tierDef(tier).rewardMul);
      }
    }
  });
});

describe('effect scaling by level', () => {
  test('scales stats, money, endorsement and attrs; keeps flags; never mutates', () => {
    const e: EffectBag = {
      form: 3,
      pressure: 4,
      morale: -3,
      money: 250000,
      endorsement: 200000,
      injuryRisk: 0.55,
      attrs: { vert: 1, mid: 0, three: 2 },
      flag: 'clutch',
      trophy: 'threeContest',
      news: 'algo',
      chain: { id: 'x', inDays: 3 },
    };

    const hard = scaleEffects(e, 1.6);
    expect(hard.form).toBe(5); // 4.8 → 5
    expect(hard.pressure).toBe(6); // 6.4 → 6
    expect(hard.morale).toBe(-5); // -4.8 → -5
    expect(hard.money).toBe(400000);
    expect(hard.endorsement).toBe(320000);
    expect(hard.injuryRisk).toBe(0.88);
    expect(hard.attrs).toEqual({ vert: 2, three: 3 });
    expect(hard.flag).toBe('clutch');
    expect(hard.trophy).toBe('threeContest');
    expect(hard.news).toBe('algo');
    expect(hard.chain).toEqual({ id: 'x', inDays: 3 });

    const easy = scaleEffects(e, 0.7);
    expect(easy.form).toBe(2); // 2.1 → 2
    expect(easy.injuryRisk).toBe(0.39); // 0.385 → 0.39
    expect(easy.money).toBe(175000); // 175000 exact
    expect(easy.endorsement).toBe(140000);

    // The original bag is untouched.
    expect(e.form).toBe(3);
    expect(e.pressure).toBe(4);
    expect(e.money).toBe(250000);
    expect(e.endorsement).toBe(200000);
    expect(e.injuryRisk).toBe(0.55);
    expect(e.attrs).toEqual({ vert: 1, mid: 0, three: 2 });
    expect(scaleEffects(e, 1.6)).not.toBe(e);

    // Zero deltas are dropped.
    expect(scaleEffects({ attrs: { vert: 1, mid: 1 } }, 0.4).attrs).toBeUndefined();
    const kept = scaleEffects({ attrs: { vert: 3, mid: 1 } }, 0.4).attrs!;
    expect(kept).toEqual({ vert: 1 });
  });

  test('stateMod stays within its bounds', () => {
    const c = newCareer();
    const u = userOf(c);
    c.morale = 100;
    c.pressure = 0;
    u.fatigue = 0;
    u.form = 10;
    expect(stateMod(u, c)).toBe(0.12);

    c.morale = 0;
    c.pressure = 100;
    u.fatigue = 100;
    u.form = -10;
    expect(stateMod(u, c)).toBe(-0.25);
  });
});
