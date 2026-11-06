// El reto diario debe ser el mismo para todos y la racha no debe inflarse repitiendo.
import { beforeEach, describe, expect, it } from 'vitest';
import { dailyChallengeIndex, dailyGoalLabel, dailySetup, recordDaily, seedForDay, todayKey } from '../daily';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = fakeStorage() as unknown as Storage;
});

describe('retos diarios', () => {
  it('el seed depende solo de la fecha', () => {
    expect(seedForDay('2026-11-06')).toBe(seedForDay('2026-11-06'));
    expect(seedForDay('2026-11-06')).not.toBe(seedForDay('2026-11-07'));
  });

  it('el objetivo es estable dentro del día y cambia entre días', () => {
    const a = dailyChallengeIndex('2026-11-06');
    expect(a).toBe(dailyChallengeIndex('2026-11-06'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(dailyGoalLabel('2026-11-06')).toBe(dailyGoalLabel('2026-11-06'));
    const dias = new Set(Array.from({ length: 20 }, (_, i) => dailyChallengeIndex(`2026-11-${String(i + 1).padStart(2, '0')}`)));
    expect(dias.size).toBeGreaterThan(1);
  });

  it('el escenario es determinista', () => {
    const a = dailySetup('2026-11-06');
    const b = dailySetup('2026-11-06');
    expect(a).toEqual(b);
    expect(a.nat).toBeTruthy();
    expect(a.pos).toBeTruthy();
  });

  it('repetir el reto el mismo día no infla la racha', () => {
    recordDaily(true);
    const s = recordDaily(true);
    expect(s.streak).toBe(1);
    expect(s.date).toBe(todayKey());
    expect(s.playedDays).toBe(1);
    expect(s.done).toBe(true);
  });

  it('un día fallado corta la racha al día siguiente', () => {
    recordDaily(false);
    const s = recordDaily(false);
    expect(s.streak).toBe(0);
    expect(s.done).toBe(false);
  });
});
