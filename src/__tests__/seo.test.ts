import { describe, expect, test } from 'vitest';
import { robotsFor } from '../seo';

const BASE = 'index, follow, max-image-preview:large';

describe('robotsFor', () => {
  test('game screens are noindex', () => {
    for (const p of ['/start', '/play', '/careers', '/play/']) expect(robotsFor(p, BASE)).toBe('noindex, follow');
  });
  test('public pages keep the page default', () => {
    for (const p of ['/', '/actualidad', '/liga/nba', '/playoffs-guia']) expect(robotsFor(p, BASE)).toBe(BASE);
    expect(robotsFor('/start', 'noindex, nofollow')).toBe('noindex, follow');
    expect(robotsFor('/', 'noindex, nofollow')).toBe('noindex, nofollow');
  });
});
