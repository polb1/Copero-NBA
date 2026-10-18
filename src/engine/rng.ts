// Deterministic random number generation. The engine never calls Math.random:
// every stream is derived from the career seed plus a list of keys, so the same
// seed + same state + same decisions always produce the same career.

export interface Rng {
  next(): number; // [0, 1)
  int(min: number, max: number): number; // inclusive
  range(min: number, max: number): number;
  chance(p: number): boolean;
  normal(mean?: number, sd?: number): number;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (t: T) => number): T;
  shuffle<T>(arr: T[]): T[];
  binomial(n: number, p: number): number;
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. A class (shared prototype methods) rather than an object of closures: the season sim
 * creates thousands of short-lived streams, and allocating ten functions per stream showed up in profiles.
 * The sequence is identical either way.
 */
class Mulberry32 implements Rng {
  private a: number;
  private spare: number | null = null;
  constructor(seed: number) {
    this.a = seed >>> 0;
  }
  next(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number) { return min + Math.floor(this.next() * (max - min + 1)); }
  range(min: number, max: number) { return min + this.next() * (max - min); }
  chance(p: number) { return this.next() < p; }
  normal(mean = 0, sd = 1) {
    if (this.spare !== null) {
      const v = this.spare;
      this.spare = null;
      return mean + sd * v;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    this.spare = mag * Math.sin(2 * Math.PI * v);
    return mean + sd * mag * Math.cos(2 * Math.PI * v);
  }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  binomial(n: number, p: number) {
    let k = 0;
    for (let i = 0; i < n; i++) if (this.next() < p) k++;
    return k;
  }
}

export function mulberry32(seed: number): Rng {
  return new Mulberry32(seed);
}

/** Derived stream: same seed + keys => same sequence, independent of other streams. */
export function rngFor(seed: number, ...keys: (string | number)[]): Rng {
  return mulberry32(hashString(seed + '|' + keys.join('|')));
}

export function newSeed(): number {
  // Only place where non-deterministic entropy enters: picking a seed for a new career.
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
