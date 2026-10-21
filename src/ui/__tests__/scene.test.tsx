/** @vitest-environment node */
// Unit tests for the 22 original vector scenes (step 4.1b): glyph coverage, single-tree
// render, no stock photos, no <img>, no emoji, unique ids, children passthrough.
import { renderToStaticMarkup } from 'react-dom/server';
import { Scene } from '../Scene';
import type { SceneKind } from '../art/types';
import { SCENE_GLYPH } from '../art/scenes';

// Any emoji / pictograph (incl. variation selectors and arrows) must never leak into a scene.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0E}\u{FE0F}\u{2190}-\u{21FF}]/u;

const KINDS: SceneKind[] = [
  'arena', 'training', 'locker', 'coach', 'press', 'medical', 'contract', 'money', 'sneakers',
  'phone', 'trophy', 'draft', 'travel', 'national', 'summer', 'family', 'clutch', 'contest',
  'college', 'europe', 'rest', 'rivalry',
];

function idsOf(html: string): string[] {
  return [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
}

describe('SCENE_GLYPH', () => {
  it('covers all 22 SceneKind values', () => {
    expect(KINDS).toHaveLength(22);
    for (const k of KINDS) expect(SCENE_GLYPH[k]).toBeTruthy();
    expect(Object.keys(SCENE_GLYPH).length).toBe(22);
  });
});

describe('Scene', () => {
  it('renders 22 svg illustrations in one tree, with no img, no /stock/ and no emoji', () => {
    const html = renderToStaticMarkup(
      <>{KINDS.map((k) => <Scene key={k} kind={k} />)}</>,
    );
    expect(html.match(/<svg/g)).toHaveLength(22);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('/stock/');
    expect(html).not.toMatch(EMOJI);
  });

  it('never repeats an id within the same tree', () => {
    const html = renderToStaticMarkup(
      <>{KINDS.map((k) => <Scene key={k} kind={k} />)}</>,
    );
    const ids = idsOf(html);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders each kind individually without img, /stock/ or emoji', () => {
    for (const k of KINDS) {
      const html = renderToStaticMarkup(<Scene kind={k} />);
      expect(html).toContain('<svg');
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('<img');
      expect(html).not.toContain('/stock/');
      expect(html).not.toMatch(EMOJI);
    }
  });

  it('keeps children content', () => {
    const html = renderToStaticMarkup(
      <Scene kind="arena"><h2>Prueba</h2></Scene>,
    );
    expect(html).toContain('<h2>Prueba</h2>');
    expect(html).toContain('scene-content');
  });
});
