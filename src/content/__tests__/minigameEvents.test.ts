import { EVENTS, type MinigameDef } from '../events';
import { POSITIONS, type MinigameKind, type MinigameMechanic, type Pos } from '../../engine/types';

const LEGACY = ['mg-clutch', 'mg-freethrows', 'mg-threes', 'mg-drill'];
const PHASE2 = ['mg-spotlight', 'mg-dunk', 'mg-boards', 'mg-steal', 'mg-pass', 'mg-close'];

const VALID_KINDS: MinigameKind[] = [
  'clutch', 'freethrows', 'threes', 'drill',
  'spotlight', 'dunk', 'boards', 'steal', 'pass', 'close',
];

const MINIGAME_EVENTS = EVENTS.filter((e) => e.minigame);

function mgDef(id: string): MinigameDef {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev?.minigame) throw new Error(`missing minigame ${id}`);
  return ev.minigame;
}

describe('minigame events content', () => {
  test('every minigame event declares a valid kind and the three outcome tiers', () => {
    expect(MINIGAME_EVENTS.length).toBeGreaterThanOrEqual(LEGACY.length + PHASE2.length);
    for (const ev of MINIGAME_EVENTS) {
      const mg = ev.minigame!;
      expect(VALID_KINDS).toContain(mg.kind);
      expect(typeof mg.attempts).toBe('number');
      expect(mg.attempts).toBeGreaterThan(0);
      expect(Array.isArray(mg.attrs)).toBe(true);
      expect(mg.attrs.length).toBeGreaterThan(0);
      for (const tier of ['great', 'ok', 'fail'] as const) {
        const outcome = mg.outcomes[tier];
        expect(outcome).toBeDefined();
        expect(typeof outcome.text).toBe('string');
        expect(outcome.text.length).toBeGreaterThan(0);
        expect(typeof outcome.effects).toBe('object');
      }
      // The content never ships playable options: the engine builds them.
      expect(ev.options).toEqual([]);
    }
  });

  test('every position has at least two minigames that cover it', () => {
    const positions = POSITIONS as Pos[];
    for (const pos of positions) {
      const covering = MINIGAME_EVENTS.filter((e) => e.minigame!.positions?.includes(pos));
      expect(covering.length).toBeGreaterThanOrEqual(2);
    }
    // All positions are thematic in at least one event.
    for (const ev of MINIGAME_EVENTS) {
      expect(Array.isArray(ev.minigame!.positions)).toBe(true);
      expect(ev.minigame!.positions!.length).toBeGreaterThan(0);
    }
  });

  test('the four legacy challenges keep their numbers and outcomes untouched', () => {
    const expected: Record<string, { attempts: number; great: number; ok: number; pressure: number }> = {
      'mg-clutch': { attempts: 1, great: 1, ok: 1, pressure: 0.8 },
      'mg-freethrows': { attempts: 2, great: 2, ok: 1, pressure: 0.65 },
      'mg-threes': { attempts: 10, great: 7, ok: 4, pressure: 0.45 },
      'mg-drill': { attempts: 5, great: 4, ok: 2, pressure: 0.2 },
    };

    for (const id of LEGACY) {
      const mg = mgDef(id);
      expect(mg.attempts).toBe(expected[id].attempts);
      expect(mg.great).toBe(expected[id].great);
      expect(mg.ok).toBe(expected[id].ok);
      expect(mg.pressure).toBe(expected[id].pressure);
    }

    const clutch = mgDef('mg-clutch').outcomes;
    expect(clutch.great.effects).toEqual({ fame: 6, reputation: 4, trust: 6, form: 3, morale: 5, flag: 'clutch' });
    expect(clutch.ok.effects).toEqual({ fame: 6, reputation: 4, trust: 6, form: 3 });
    expect(clutch.fail.effects).toEqual({ form: -2, pressure: 5, morale: -3 });

    const ft = mgDef('mg-freethrows').outcomes;
    expect(ft.great.effects).toEqual({ fame: 4, trust: 5, form: 2, reputation: 2 });
    expect(ft.ok.effects).toEqual({ trust: 1 });
    expect(ft.fail.effects).toEqual({ form: -3, pressure: 6, trust: -3 });

    const threes = mgDef('mg-threes').outcomes;
    expect(threes.great.effects).toEqual({ fame: 10, reputation: 5, morale: 6, endorsement: 200000, trophy: 'threeContest' });
    expect(threes.ok.effects).toEqual({ fame: 4, morale: 2 });
    expect(threes.fail.effects).toEqual({ fame: 1, morale: -2, pressure: 3 });

    const drill = mgDef('mg-drill').outcomes;
    expect(drill.great.effects).toEqual({ attrs: { three: 1 }, trust: 4, chemistry: 3 });
    expect(drill.ok.effects).toEqual({ chemistry: 2 });
    expect(drill.fail.effects).toEqual({ chemistry: 1, workEthic: 3 });
  });

  test('the phase 2 challenges declare their mechanic and playable attempts', () => {
    const mechanics: Record<string, MinigameMechanic> = {
      'mg-spotlight': 'target',
      'mg-dunk': 'power',
      'mg-boards': 'reaction',
      'mg-steal': 'reaction',
      'mg-pass': 'choice',
      'mg-close': 'meter',
    };

    for (const id of PHASE2) {
      const mg = mgDef(id);
      expect(mg.mechanic).toBe(mechanics[id]);
      expect(mg.attempts).toBeGreaterThan(0);
      expect(mg.great).toBeGreaterThan(mg.ok);
      expect(mg.ok).toBeGreaterThanOrEqual(1);
      expect(mg.ok).toBeLessThanOrEqual(mg.attempts);
      expect(mg.great).toBeLessThanOrEqual(mg.attempts);
      expect(mg.pressure).toBeGreaterThan(0);
      expect(mg.pressure).toBeLessThanOrEqual(1);
    }
  });

  test('position themes exclude the centres from the guard-specific challenges', () => {
    const threes = mgDef('mg-threes').positions!;
    expect(threes).not.toContain('C');

    const spotlight = mgDef('mg-spotlight').positions!;
    expect(spotlight).toEqual(['PG', 'SG']);

    // The legacy covers every position; the dunk leaves the guards' playmaking aside.
    expect(mgDef('mg-clutch').positions).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(mgDef('mg-freethrows').positions).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(mgDef('mg-drill').positions).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(mgDef('mg-threes').positions).toEqual(['PG', 'SG', 'SF', 'PF']);
  });
});
