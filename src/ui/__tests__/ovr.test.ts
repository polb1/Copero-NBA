import { describe, expect, test } from 'vitest';
import { DIAMOND_OVR, GOLD_OVR, ovrClass, ovrTier, ovrTone } from '../simple';

describe('OVR tiers', () => {
  test('thresholds', () => {
    expect(GOLD_OVR).toBe(80);
    expect(DIAMOND_OVR).toBe(90);
    expect(ovrTier(89)).toBe('gold');
    expect(ovrTier(90)).toBe('diamond');
    expect(ovrTier(80)).toBe('gold');
    expect(ovrTier(79)).toBe('silver');
    expect(ovrTier(70)).toBe('silver');
    expect(ovrTier(69)).toBe('orange');
    expect(ovrTier(60)).toBe('orange');
    expect(ovrTier(59)).toBe('bronze');
  });
  test('classes and tones', () => {
    expect(ovrClass(89)).toBe('gold');
    expect(ovrClass(90)).toBe('diamond');
    expect(ovrClass(79)).toBe('');
    expect(ovrTone(90)).toContain('#7dd3fc');
    expect(ovrTone(90)).not.toBe(ovrTone(89));
  });
});
