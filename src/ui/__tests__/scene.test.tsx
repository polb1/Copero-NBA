/** @vitest-environment node */
import { renderToStaticMarkup } from 'react-dom/server';
import { Scene, STOCK_PHOTOS, photoFor } from '../Scene';
import type { SceneKind } from '../art/types';
import { SCENE_GLYPH } from '../art/scenes';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0E}\u{FE0F}\u{2190}-\u{21FF}]/u;

const KINDS: SceneKind[] = [
  'arena', 'training', 'locker', 'coach', 'press', 'medical', 'contract', 'money', 'sneakers',
  'phone', 'trophy', 'draft', 'travel', 'national', 'summer', 'family', 'clutch', 'contest',
  'college', 'europe', 'rest', 'rivalry',
];

describe('SCENE_GLYPH', () => {
  it('covers all 22 SceneKind values', () => {
    expect(KINDS).toHaveLength(22);
    for (const k of KINDS) expect(SCENE_GLYPH[k]).toBeTruthy();
    expect(Object.keys(SCENE_GLYPH).length).toBe(22);
  });
});

describe('Scene photos', () => {
  it('has at least four real photos for every scene kind', () => {
    for (const k of KINDS) {
      expect(STOCK_PHOTOS[k].length).toBeGreaterThanOrEqual(4);
      for (const src of STOCK_PHOTOS[k]) expect(src).toMatch(/^\/stock\/.+\.jpg$/);
    }
  });

  it('picks a stable photo per kind and variant, and varies across variants', () => {
    expect(photoFor('arena', 'decision-a')).toBe(photoFor('arena', 'decision-a'));
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(photoFor('arena', `decision-${i}`));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('renders the real photo as an img, not the fallback svg', () => {
    const html = renderToStaticMarkup(<Scene kind="arena" variant="test" />);
    expect(html).toContain('<img');
    expect(html).toContain('src="/stock/');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('<svg');
    expect(html).not.toMatch(EMOJI);
  });

  it('falls back to the vector illustration when a kind has no photo', () => {
    const saved = STOCK_PHOTOS.arena;
    STOCK_PHOTOS.arena = [];
    try {
      const html = renderToStaticMarkup(<Scene kind="arena" />);
      expect(html).toContain('<svg');
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('<img');
      expect(html).not.toMatch(EMOJI);
    } finally {
      STOCK_PHOTOS.arena = saved;
    }
  });

  it('keeps children content over the photo', () => {
    const html = renderToStaticMarkup(<Scene kind="arena"><h2>Prueba</h2></Scene>);
    expect(html).toContain('<h2>Prueba</h2>');
    expect(html).toContain('scene-content');
  });
});
