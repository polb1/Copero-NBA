/** @vitest-environment node */
import {
  effectivePowerParams,
  pointerProfileFrom,
  powerTuning,
  powerWindowMs,
  type PointerProfile,
} from '../pointer';

const profile = (input: { fineMatches: boolean; coarseMatches: boolean; hoverMatches: boolean; maxTouchPoints: number }) =>
  pointerProfileFrom(input);

const desktopFine = profile({ fineMatches: true, coarseMatches: false, hoverMatches: true, maxTouchPoints: 0 });
const coarseTouch = profile({ fineMatches: false, coarseMatches: true, hoverMatches: false, maxTouchPoints: 5 });
const noFine = profile({ fineMatches: false, coarseMatches: false, hoverMatches: false, maxTouchPoints: 0 });
const hybrid = profile({ fineMatches: true, coarseMatches: true, hoverMatches: true, maxTouchPoints: 2 });

const NEUTRAL_TUNING = { speedMul: 1, zoneMul: 1, minWindowMs: 0, hard: false };
const HARD_TUNING = { speedMul: 1.15, zoneMul: 0.85, minWindowMs: 85, hard: true };

describe('pointerProfileFrom', () => {
  test('desktop with a fine pointer', () => {
    expect(desktopFine).toEqual({ fine: true, coarse: false, hover: true, touchPoints: 0 });
  });

  test('coarse touch device', () => {
    expect(coarseTouch).toEqual({ fine: false, coarse: true, hover: false, touchPoints: 5 });
  });

  test('no fine pointer at all', () => {
    expect(noFine).toEqual({ fine: false, coarse: false, hover: false, touchPoints: 0 });
  });

  test('touch points are normalised to a finite number >= 0', () => {
    expect(profile({ fineMatches: false, coarseMatches: true, hoverMatches: false, maxTouchPoints: -2 }).touchPoints).toBe(0);
    expect(profile({ fineMatches: false, coarseMatches: true, hoverMatches: false, maxTouchPoints: NaN }).touchPoints).toBe(0);
    expect(profile({ fineMatches: false, coarseMatches: true, hoverMatches: false, maxTouchPoints: Infinity }).touchPoints).toBe(0);
  });
});

describe('powerTuning', () => {
  test('hard only on a fine desktop pointer with no touch points', () => {
    expect(powerTuning(desktopFine)).toEqual(HARD_TUNING);
    expect(powerTuning(desktopFine).hard).toBe(true);
  });

  test('neutral on coarse, touch, hybrid and unknown devices', () => {
    for (const p of [coarseTouch, noFine, hybrid]) {
      expect(powerTuning(p)).toEqual(NEUTRAL_TUNING);
      expect(powerTuning(p).hard).toBe(false);
    }
  });

  test('neutral when a fine desktop reports touch points', () => {
    const fineTouch = profile({ fineMatches: true, coarseMatches: false, hoverMatches: true, maxTouchPoints: 1 });
    expect(powerTuning(fineTouch)).toEqual(NEUTRAL_TUNING);
  });
});

describe('powerWindowMs', () => {
  test('crossing time of the band', () => {
    expect(powerWindowMs(10, 0.72)).toBeCloseTo(138.88888888888889, 10);
    expect(powerWindowMs(10, 0.72)).toBeCloseTo((10 / (0.72 * 100)) * 1000, 10);
  });

  test('zero or invalid speed means no window', () => {
    expect(powerWindowMs(10, 0)).toBe(0);
    expect(powerWindowMs(10, -0.5)).toBe(0);
    expect(powerWindowMs(10, NaN)).toBe(0);
    expect(powerWindowMs(10, Infinity)).toBe(0);
  });
});

describe('effectivePowerParams', () => {
  test('neutral tuning is the exact identity', () => {
    expect(effectivePowerParams(10, 0.72, NEUTRAL_TUNING)).toEqual({
      zone: 10,
      speed: 0.72,
      windowMs: (10 / (0.72 * 100)) * 1000,
    });
    expect(effectivePowerParams(12.5, 0.8, NEUTRAL_TUNING)).toEqual({
      zone: 12.5,
      speed: 0.8,
      windowMs: (12.5 / (0.8 * 100)) * 1000,
    });
  });

  test('hard tuning narrows the band, never below the minimum window and never above 30 %', () => {
    const zones: number[] = [];
    for (let zone = 5; zone <= 30; zone += 1) zones.push(zone);
    const speeds: number[] = [];
    for (let s = 40; s <= 140; s += 5) speeds.push(s / 100);

    for (const zone of zones) {
      for (const speed of speeds) {
        const out = effectivePowerParams(zone, speed, HARD_TUNING);
        const window0 = powerWindowMs(zone, speed) / 1000;
        expect(out.windowMs, `zone ${zone} speed ${speed}: window`).toBeGreaterThanOrEqual(85);
        expect(out.zone, `zone ${zone} speed ${speed}: zone`).toBeLessThanOrEqual(30);
        expect(out.speed, `zone ${zone} speed ${speed}: speed`).toBeGreaterThan(0);
        expect(Number.isFinite(out.zone), `zone ${zone} speed ${speed}: zone finite`).toBe(true);
        expect(Number.isFinite(out.speed), `zone ${zone} speed ${speed}: speed finite`).toBe(true);
        expect(Number.isFinite(out.windowMs), `zone ${zone} speed ${speed}: window finite`).toBe(true);
        if (window0 >= 0.085) {
          expect(out.windowMs, `zone ${zone} speed ${speed}: shrinks`).toBeLessThanOrEqual(window0 * 1000 + 1e-9);
        }
      }
    }
  });

  test('hard tuning falls back to a safe identity when there is no valid base', () => {
    expect(effectivePowerParams(0, 0.72, HARD_TUNING)).toEqual({ zone: 0, speed: 0.72, windowMs: 0 });
    expect(effectivePowerParams(10, 0, HARD_TUNING)).toEqual({ zone: 10, speed: 0, windowMs: 0 });
    const nope = effectivePowerParams(NaN, NaN, HARD_TUNING);
    expect(nope).toEqual({ zone: 0, speed: 0, windowMs: 0 });
    expect(Number.isFinite(nope.zone) && Number.isFinite(nope.speed) && Number.isFinite(nope.windowMs)).toBe(true);
  });

  test('does not mutate its inputs and returns finite numbers', () => {
    const inputs: { zone: number; speed: number }[] = [
      { zone: 5, speed: 0.4 },
      { zone: 10, speed: 0.72 },
      { zone: 22, speed: 1.1 },
      { zone: 30, speed: 1.4 },
    ];
    const tuningList: PointerProfile[] = [desktopFine, coarseTouch, hybrid, noFine];

    for (const tuning of tuningList) {
      for (const input of inputs) {
        const before = { ...input };
        const out = effectivePowerParams(input.zone, input.speed, powerTuning(tuning));
        expect(input).toEqual(before);
        expect(Number.isFinite(out.zone)).toBe(true);
        expect(Number.isFinite(out.speed)).toBe(true);
        expect(Number.isFinite(out.windowMs)).toBe(true);
      }
    }
  });
});
