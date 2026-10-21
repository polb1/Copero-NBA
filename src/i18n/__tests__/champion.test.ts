import { EN } from '../en';
import { CA } from '../ca';

/** Champion / national team UI strings used by the champion and profile screens. */
const CHAMPION_UI_KEYS = [
  'medalla',
  'medallas',
  'Campeón NBA',
  'Selección',
  '{a} convocatoria',
  '{a} convocatorias',
] as const;

const DICTS: [string, Record<string, string>][] = [
  ['EN', EN],
  ['CA', CA],
];

describe('champion dictionaries', () => {
  test('every champion UI string is translated', () => {
    for (const [name, dict] of DICTS) {
      for (const key of CHAMPION_UI_KEYS) {
        expect(typeof dict[key], `${name}: missing "${key}"`).toBe('string');
        expect(dict[key].length, `${name}: empty "${key}"`).toBeGreaterThan(0);
      }
    }
  });

  test('dynamic champion patterns keep their placeholders', () => {
    const patterns = CHAMPION_UI_KEYS.filter((k) => k.includes('{a}'));
    for (const [name, dict] of DICTS) {
      for (const key of patterns) {
        const out = dict[key];
        expect(out, `${name}: missing "${key}"`).toBeTruthy();
        expect(out, `${name}: "${key}" lost {a}`).toContain('{a}');
      }
    }
  });
});
