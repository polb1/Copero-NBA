// Jersey colours taken from the country's flag: the most common colour is the shirt, the next distinct
// one the trim, and the lettering uses whichever flag colour (or white/black) reads best on the shirt.
import { useEffect, useState } from 'react';
import { ISO2 } from '../content/names';

export interface KitColors { color: string; trim: string; text: string }
const FALLBACK: KitColors = { color: '#c2410c', trim: '#1e293b', text: '#fde047' };
const cache = new Map<string, KitColors>();

type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

function paletteOf(img: HTMLImageElement): KitColors {
  const w = img.naturalWidth || 80, h = img.naturalHeight || 53;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return FALLBACK;
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h).data;
  // Count colours in coarse buckets, averaging the real colours inside each bucket.
  const buckets = new Map<number, { n: number; sum: RGB }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++; b.sum[0] += data[i]; b.sum[1] += data[i + 1]; b.sum[2] += data[i + 2];
    buckets.set(key, b);
  }
  const colors = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as RGB);
  const distinct: RGB[] = [];
  for (const c of colors) if (distinct.every((d) => dist(c, d) > 90)) distinct.push(c);
  if (!distinct.length) return FALLBACK;
  const main = distinct[0];
  const trim = distinct[1] ?? (lum(main) > 0.5 ? [17, 17, 17] as RGB : [255, 255, 255] as RGB);
  const text = [distinct[1], distinct[2], [255, 255, 255] as RGB, [17, 17, 17] as RGB].find((c) => c && contrast(c, main) >= 2.6) ?? [255, 255, 255];
  return { color: hex(main), trim: hex(trim), text: hex(text) };
}

/** Kit colours for a country code; the default orange kit until the flag has loaded. */
export function useKitColors(code: string): KitColors {
  const iso = ISO2[code];
  const [kit, setKit] = useState<KitColors>(() => (iso && cache.get(iso)) || FALLBACK);
  useEffect(() => {
    if (!iso) { setKit(FALLBACK); return; }
    const hit = cache.get(iso);
    if (hit) { setKit(hit); return; }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      let k = FALLBACK;
      try { k = paletteOf(img); } catch { /* unreadable image: keep the default kit */ }
      cache.set(iso, k);
      if (alive) setKit(k);
    };
    img.src = `/flags/${iso}.png`;
    return () => { alive = false; };
  }, [iso]);
  return kit;
}
