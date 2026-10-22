import { useEffect, useState } from 'react';

/** What the device says about its pointers. Pure data, no DOM. */
export interface PointerProfile {
  fine: boolean;
  coarse: boolean;
  hover: boolean;
  touchPoints: number;
}

/** How the minigames should be tuned for that device. */
export interface PowerTuning {
  speedMul: number;
  zoneMul: number;
  minWindowMs: number;
  hard: boolean;
}

/** Effective zone, speed and crossing time of a power attempt. */
export interface PowerParams {
  zone: number;
  speed: number;
  windowMs: number;
}

const NEUTRAL: PointerProfile = { fine: false, coarse: false, hover: false, touchPoints: 0 };

const QUERY_FINE = '(any-pointer: fine)';
const QUERY_COARSE = '(any-pointer: coarse)';
const QUERY_HOVER = '(any-hover: hover)';

/** `matchMedia` behind a check: no window or no support means "no match". */
function media(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

/** Normalises the raw media-query answers into a profile. */
export function pointerProfileFrom(input: { fineMatches: boolean; coarseMatches: boolean; hoverMatches: boolean; maxTouchPoints: number }): PointerProfile {
  const touchPoints = Number.isFinite(input.maxTouchPoints) && input.maxTouchPoints >= 0 ? input.maxTouchPoints : 0;
  return {
    fine: !!input.fineMatches,
    coarse: !!input.coarseMatches,
    hover: !!input.hoverMatches,
    touchPoints,
  };
}

/** Reads the current device once. Internals of the hook: do not use it elsewhere. */
function readPointerProfile(): PointerProfile {
  if (typeof window === 'undefined') return NEUTRAL;
  return pointerProfileFrom({
    fineMatches: media(QUERY_FINE)?.matches ?? false,
    coarseMatches: media(QUERY_COARSE)?.matches ?? false,
    hoverMatches: media(QUERY_HOVER)?.matches ?? false,
    maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  });
}

/** Desktop with a fine, non-touching pointer plays harder; everything else stays as it was. */
export function powerTuning(p: PointerProfile): PowerTuning {
  const hard = p.fine && !p.coarse && p.touchPoints === 0;
  return hard
    ? { speedMul: 1.15, zoneMul: 0.85, minWindowMs: 85, hard: true }
    : { speedMul: 1, zoneMul: 1, minWindowMs: 0, hard: false };
}

/** Milliseconds the marker takes to cross a band of `zone` % at `speed` sweeps per second. */
export function powerWindowMs(zone: number, speed: number): number {
  return Number.isFinite(speed) && speed > 0 ? (zone / (speed * 100)) * 1000 : 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Zone, speed and window actually used by an attempt. Neutral tuning is the exact identity. */
export function effectivePowerParams(zone: number, speed: number, tuning: PowerTuning): PowerParams {
  if (!tuning.hard) return { zone, speed, windowMs: powerWindowMs(zone, speed) };
  const zone0 = Number.isFinite(zone) ? zone : 0;
  const speed0 = Number.isFinite(speed) ? speed : 0;
  const window0 = powerWindowMs(zone0, speed0) / 1000;
  if (!(zone0 > 0) || !(window0 > 0)) return { zone: zone0, speed: speed0, windowMs: 0 };
  const windowD = Math.max(tuning.minWindowMs / 1000, window0 * 0.72);
  const zoneEff = clamp(zone0 * tuning.zoneMul, 4, 30);
  const speedEff = zoneEff / (100 * windowD);
  return { zone: zoneEff, speed: speedEff, windowMs: windowD * 1000 };
}

/** Current pointer profile, kept in sync with the media queries and the window size. */
export function usePointerProfile(): PointerProfile {
  const [profile, setProfile] = useState<PointerProfile>(readPointerProfile);

  useEffect(() => {
    setProfile(readPointerProfile());
    if (typeof window === 'undefined') return;
    const lists = [QUERY_FINE, QUERY_COARSE, QUERY_HOVER]
      .map(media)
      .filter((m): m is MediaQueryList => m !== null);
    const update = () => setProfile(readPointerProfile());
    for (const m of lists) m.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      for (const m of lists) m.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return profile;
}
