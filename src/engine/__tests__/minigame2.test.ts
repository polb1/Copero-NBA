import { EVENTS, type EventDef, type MinigameDef } from '../../content/events';
import * as api from '../api';
import { eventContext, openEvent, userOf } from '../career';
import { instantiate } from '../events';
import { autoTier, buildSpec, buildTiers } from '../minigames';
import { rngFor } from '../rng';
import type { Career, MinigameTierId } from '../types';
import { baseInput } from './autopilot';

function inSeasonCareer(seed = 4321): Career {
  const c = api.newCareer(baseInput({ route: 'drafted', mode: 'quick' }), seed);
  api.acceptOffer(c, c.offers[0].id);
  api.startRegularSeason(c);
  c.pendingEvent = null;
  return c;
}

function mgDef(id: string): MinigameDef {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev?.minigame) throw new Error(`missing minigame ${id}`);
  return ev.minigame;
}

function autoDef(over: Partial<MinigameDef> = {}): MinigameDef {
  return {
    kind: 'spotlight',
    mechanic: 'target',
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
    autoScale: true,
    ...over,
  };
}

function defFor(id: string, minigame: MinigameDef): EventDef {
  return { id, category: 'training', title: 'Prueba', text: 'Prueba', weight: 1, when: {}, minigame, options: [] };
}

describe('minigame tiers in the engine', () => {
  test('a legacy challenge without tiers is armed normal and still starts with made/attempts', () => {
    const c = inSeasonCareer();
    openEvent(c, 'mg-clutch');
    const ev = c.pendingEvent!;
    expect(ev.minigameTiers).toBeUndefined();
    expect(ev.minigameTier).toBe('normal');
    expect(ev.minigame!.mechanic).toBe('meter');
    expect(ev.options[0].label).toBe('Simular el lanzamiento');

    api.playMinigame(c, 1);
    expect(ev.resolved!.made).toBe(1);
    expect(ev.resolved!.result.startsWith('1/1')).toBe(true);
    expect(c.flags.clutch).toBe(1);
  });

  test('failing on hard punishes more than failing on normal', () => {
    const normal = inSeasonCareer();
    const hard = inSeasonCareer();

    openEvent(normal, 'mg-clutch');
    openEvent(hard, 'mg-clutch');
    const def = mgDef('mg-clutch');
    const uHard = userOf(hard);
    hard.pendingEvent!.minigameTier = 'hard';
    hard.pendingEvent!.minigame = buildSpec(def, uHard, hard, 'hard');

    const before = (c: Career) => ({ form: userOf(c).form, pressure: c.pressure, morale: c.morale });
    const bNormal = before(normal);
    const bHard = before(hard);

    api.playMinigame(normal, 0);
    api.playMinigame(hard, 0);

    // Same seed ⇒ same roll and same starting state: only the level multiplier differs.
    const dNormal = {
      form: userOf(normal).form - bNormal.form,
      pressure: normal.pressure - bNormal.pressure,
      morale: normal.morale - bNormal.morale,
    };
    const dHard = {
      form: userOf(hard).form - bHard.form,
      pressure: hard.pressure - bHard.pressure,
      morale: hard.morale - bHard.morale,
    };

    expect(dHard.form).toBeLessThan(dNormal.form); // −3 vs −2
    expect(dHard.pressure).toBeGreaterThan(dNormal.pressure); // +8 vs +5
    expect(dHard.morale).toBeLessThan(dNormal.morale); // −5 vs −3
    expect(dNormal.morale).toBeLessThan(0);

    // The level is reported after the score; the score keeps the legacy prefix.
    expect(hard.pendingEvent!.resolved!.result.startsWith('0/1 · Exigente — ')).toBe(true);
    expect(normal.pendingEvent!.resolved!.result.startsWith('0/1 — ')).toBe(true);
    expect(hard.decisions[hard.decisions.length - 1].choice).toContain('Exigente');
    expect(normal.decisions[normal.decisions.length - 1].choice).not.toContain('Exigente');
  });

  test('selecting a tier re-arms the challenge without resolving it', () => {
    const c = inSeasonCareer();
    openEvent(c, 'mg-clutch');
    const ev = c.pendingEvent!;

    // Legacy content has no tier list yet: inject the three levels the way a tiered event will.
    const def = { ...mgDef('mg-clutch'), tiers: ['easy', 'normal', 'hard'] as MinigameTierId[], defaultTier: 'normal' as MinigameTierId };
    ev.minigameTiers = buildTiers(def, userOf(c), c);
    ev.minigameTier = 'normal';
    ev.minigame = ev.minigameTiers.find((t) => t.id === 'normal')!.spec;

    const zoneNormal = ev.minigame!.zone;
    expect(ev.minigameTiers).toHaveLength(3);

    api.selectMinigameTier(c, 'hard');
    expect(ev.minigameTier).toBe('hard');
    expect(ev.minigame!.tier).toBe('hard');
    expect(ev.minigame!.zone).toBeLessThan(zoneNormal);
    expect(ev.resolved).toBeUndefined();

    api.selectMinigameTier(c, 'easy');
    expect(ev.minigameTier).toBe('easy');
    expect(ev.minigame!.zone).toBeGreaterThan(zoneNormal);
    expect(ev.resolved).toBeUndefined();

    // Unknown level: ignored, the armed one stays.
    api.selectMinigameTier(c, 'nope' as MinigameTierId);
    expect(ev.minigameTier).toBe('easy');
    expect(ev.resolved).toBeUndefined();

    // Once resolved, the selector is inert.
    api.playMinigame(c, 1);
    const spec = ev.minigame;
    api.selectMinigameTier(c, 'hard');
    expect(ev.minigameTier).toBe('easy');
    expect(ev.minigame).toBe(spec);
  });

  test('an autoScaled challenge arms one level and hides the selector', () => {
    const c = inSeasonCareer();
    const u = userOf(c);
    c.pressure = 100;
    u.fatigue = 100;
    c.morale = 10;

    const ev = instantiate(defFor('test-auto-hard', autoDef()), eventContext(c), rngFor(c.seed, 'test-auto'));
    expect(autoTier(u, c)).toBe('hard');
    expect(ev.minigameTiers).toBeUndefined();
    expect(ev.minigameTier).toBe('hard');
    expect(ev.minigame!.tier).toBe('hard');
    expect(ev.minigame!.mechanic).toBe('target');

    c.pressure = 0;
    u.fatigue = 0;
    c.morale = 60;
    const easy = instantiate(defFor('test-auto-easy', autoDef()), eventContext(c), rngFor(c.seed, 'test-auto'));
    expect(autoTier(u, c)).toBe('easy');
    expect(easy.minigameTiers).toBeUndefined();
    expect(easy.minigameTier).toBe('easy');
    expect(easy.minigame!.tier).toBe('easy');

    // A declared list without autoScale keeps offering the selector.
    const tiered = instantiate(
      defFor('test-tiers', autoDef({ autoScale: undefined, tiers: ['easy', 'normal', 'hard'], defaultTier: 'hard' })),
      eventContext(c),
      rngFor(c.seed, 'test-tiers'),
    );
    expect(tiered.minigameTiers).toHaveLength(3);
    expect(tiered.minigameTier).toBe('hard');
    expect(tiered.minigame!.tier).toBe('hard');

    // A declared window (combine) overrides the reaction formula.
    const reaction = buildSpec(
      autoDef({ autoScale: undefined, mechanic: 'reaction', windowMs: 1400, slots: 3 }),
      u,
      c,
      'normal',
    );
    expect(reaction.windowMs).toBe(1400);
    expect(buildSpec(autoDef({ autoScale: undefined, mechanic: 'reaction', windowMs: 1400 }), u, c, 'hard').windowMs).toBe(1008);
  });
});
