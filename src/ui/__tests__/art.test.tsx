/** @vitest-environment node */
// Unit tests for the SVG art base (step 4.1a): icons, awards, trophy case, achievements.
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, ICON_NAMES } from '../icons';
import { AwardArt, TrophyCase, AWARD_KINDS } from '../art/awards';
import { ACH_ART, AchievementArt } from '../art/achievements';
import { SCENE_GLYPH } from '../art/scenes';
import { ASSET_GLYPH } from '../art/assets';
import { AWARD_LABEL } from '../../engine/awards';
import { ACHIEVEMENTS } from '../../engine/achievements';

// Any emoji / pictograph (incl. variation selectors) must never leak into the SVG art.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0E}\u{FE0F}\u{2190}-\u{21FF}]/u;

function idsOf(html: string): string[] {
  return [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
}

describe('Icon a11y', () => {
  it('renders role="img" + <title> when title is given', () => {
    const html = renderToStaticMarkup(<Icon name="trophy" title="Trofeo" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('<title>Trofeo</title>');
    expect(html).not.toContain('aria-hidden');
  });

  it('renders aria-hidden="true" without title', () => {
    const html = renderToStaticMarkup(<Icon name="ball" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<title>');
  });

  it('falls back to ball for unknown names and keeps the stroke style', () => {
    const html = renderToStaticMarkup(<Icon name="no-such-icon" />);
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('fill="none"');
    const ball = renderToStaticMarkup(<Icon name="ball" />);
    expect(html).toBe(ball);
  });
});

describe('ICON_NAMES', () => {
  it('every glyph referenced by the art maps is a known icon', () => {
    const maps: Array<Record<string, string | undefined>> = [
      SCENE_GLYPH as unknown as Record<string, string | undefined>,
      ACH_ART as unknown as Record<string, string | undefined>,
      ASSET_GLYPH as unknown as Record<string, string | undefined>,
    ];
    for (const map of maps) {
      for (const name of Object.values(map)) {
        expect(ICON_NAMES, `icon "${name}" not in ICON_NAMES`).toContain(name);
      }
    }
  });

  it('has no duplicates and includes the core icons', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    for (const core of ['ball', 'trophy', 'star', 'lock', 'coin']) {
      expect(ICON_NAMES).toContain(core);
    }
  });
});

describe('AwardArt', () => {
  it('renders all 16 kinds without throwing, without emoji and without duplicate ids', () => {
    const html = renderToStaticMarkup(
      <>{AWARD_KINDS.map((k) => <AwardArt key={k} kind={k} />)}</>,
    );
    expect(AWARD_KINDS).toHaveLength(16);
    expect(html).not.toMatch(EMOJI);
    const ids = idsOf(html);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of AWARD_KINDS) {
      const single = renderToStaticMarkup(<AwardArt kind={k} />);
      expect(single).toContain('viewBox="0 0 32 32"');
      expect(single).not.toMatch(EMOJI);
    }
  });

  it('uses role="img" + <title> only when title is given', () => {
    expect(renderToStaticMarkup(<AwardArt kind="mvp" title="MVP" />)).toContain('<title>MVP</title>');
    expect(renderToStaticMarkup(<AwardArt kind="mvp" title="MVP" />)).toContain('role="img"');
    const bare = renderToStaticMarkup(<AwardArt kind="mvp" />);
    expect(bare).toContain('aria-hidden="true"');
    expect(bare).not.toContain('<title>');
  });

  it('unknown kind falls back to a generic cup and never throws', () => {
    const html = renderToStaticMarkup(<AwardArt kind="ptsLeader" />);
    expect(html).toContain('<svg');
    expect(html).not.toMatch(EMOJI);
  });

  it('renders every AWARD_LABEL key (incl. leaders) without throwing', () => {
    for (const k of Object.keys(AWARD_LABEL)) {
      const html = renderToStaticMarkup(<AwardArt kind={k} title={AWARD_LABEL[k]} />);
      expect(html).toContain('<svg');
      expect(html).not.toMatch(EMOJI);
    }
  });
});

describe('TrophyCase', () => {
  it('renders 10 awards as 8 + "+2" without throwing', () => {
    const awards = [...AWARD_KINDS.slice(0, 9), 'champion']; // 10 entries
    const html = renderToStaticMarkup(<TrophyCase awards={awards} size={24} />);
    expect(html).toContain('trophy-case');
    expect(html).toContain('trophy-case-shelf');
    expect(html).toContain('trophy-more');
    expect(html).toContain('+2');
    expect(html).not.toMatch(EMOJI);
    const ids = idsOf(html);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes labels through as accessible titles only', () => {
    const html = renderToStaticMarkup(<TrophyCase awards={['mvp']} size={24} labels={{ mvp: 'MVP de la temporada' }} />);
    expect(html).toContain('<title>MVP de la temporada</title>');
  });
});

describe('AchievementArt', () => {
  it('ACH_ART covers every achievement id', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(31);
    for (const a of ACHIEVEMENTS) expect(ACH_ART[a.id]).toBeTruthy();
  });

  it('renders every achievement without emoji', () => {
    const html = renderToStaticMarkup(
      <>{ACHIEVEMENTS.map((a) => <AchievementArt key={a.id} id={a.id} />)}</>,
    );
    expect(html).not.toMatch(EMOJI);
    expect(html).toContain('ach-glyph');
    expect(html).toContain('aria-hidden="true"');
  });

  it('locked renders the lock glyph and the locked class', () => {
    const html = renderToStaticMarkup(<AchievementArt id="mvp" locked />);
    expect(html).toContain('locked');
    expect(html).toContain('aria-hidden="true"');
    // Path data of the `lock` icon (shackle arc).
    expect(html).toContain('M8 11V7a4 4');
    const unlocked = renderToStaticMarkup(<AchievementArt id="mvp" />);
    expect(unlocked).not.toContain('M8 11V7a4 4');
  });

  it('unknown achievement id falls back to star without throwing', () => {
    const html = renderToStaticMarkup(<AchievementArt id="nope" />);
    expect(html).toContain('<svg');
    expect(html).not.toMatch(EMOJI);
  });
});
