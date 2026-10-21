import { describe, expect, it } from 'vitest';
import { championOf } from '../league';
import type { League } from '../types';

const league = (champions: League['champions']) => ({ champions } as unknown as League);

describe('championOf', () => {
  it('returns null when there are no champions', () => {
    expect(championOf(league([]))).toBeNull();
  });

  it('returns the highest season even when the array is not sorted', () => {
    const c = league([
      { season: 2026, team: 'BOS', runnerUp: 'LAL' },
      { season: 2028, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c)?.team).toBe('DEN');
    expect(championOf(c)?.season).toBe(2028);
  });

  it('returns the last entry when two seasons tie', () => {
    const c = league([
      { season: 2027, team: 'BOS', runnerUp: 'LAL' },
      { season: 2027, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c)?.team).toBe('DEN');
  });

  it('returns null when champions is missing from an old save', () => {
    expect(championOf({} as League)).toBeNull();
  });

  it('returns the champion of a given season from an unsorted list', () => {
    const c = league([
      { season: 2026, team: 'BOS', runnerUp: 'LAL' },
      { season: 2028, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c, 2026)?.team).toBe('BOS');
  });

  it('returns null when the requested season has no champion', () => {
    const c = league([
      { season: 2026, team: 'BOS', runnerUp: 'LAL' },
      { season: 2028, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c, 2027)).toBeNull();
  });

  it('returns the last entry when two entries of the requested season tie', () => {
    const c = league([
      { season: 2027, team: 'BOS', runnerUp: 'LAL' },
      { season: 2027, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c, 2027)?.team).toBe('DEN');
  });

  it('still returns the highest season when no season is requested', () => {
    const c = league([
      { season: 2026, team: 'BOS', runnerUp: 'LAL' },
      { season: 2028, team: 'DEN', runnerUp: 'MIA' },
    ]);
    expect(championOf(c)?.team).toBe('DEN');
  });
});
