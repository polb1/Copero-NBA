import { EN } from '../en';
import { CA } from '../ca';
import { EVENTS } from '../../content/events';

/** Phase 3: economy, assets and ruin UI strings (Play.tsx / MoneyLine). */
const PHASE3_UI_KEYS = [
  'Gastos fijos',
  'Deuda',
  'Crédito',
  'Activos',
  'En ruina',
  'Cortado',
  'En el mercado',
  'Patrimonio neto: {x}',
  'Vendido: {x}',
  'Activos +{x}',
  'Gastos −{x}',
  'Deuda {x}',
] as const;

/** Phase 3 asset and loan events (full mode only). */
const PHASE3_EVENT_IDS = [
  'asset-mansion',
  'asset-supercar',
  'asset-jet',
  'asset-entourage',
  'asset-rentals',
  'bank-loan',
] as const;

const DICTS: [string, Record<string, string>][] = [
  ['EN', EN],
  ['CA', CA],
];

describe('phase 3 dictionaries', () => {
  test('every phase 3 UI string is translated', () => {
    for (const [name, dict] of DICTS) {
      for (const key of PHASE3_UI_KEYS) {
        expect(typeof dict[key], `${name}: missing "${key}"`).toBe('string');
        expect(dict[key].length, `${name}: empty "${key}"`).toBeGreaterThan(0);
      }
    }
  });

  test('dynamic UI patterns keep their placeholders', () => {
    const patterns = PHASE3_UI_KEYS.filter((k) => k.includes('{x}'));
    for (const [name, dict] of DICTS) {
      for (const key of patterns) {
        const out = dict[key];
        expect(out, `${name}: missing "${key}"`).toBeTruthy();
        expect(out, `${name}: "${key}" lost {x}`).toContain('{x}');
      }
    }
  });

  test('every phase 3 event title, text and option strings are translated', () => {
    for (const [name, dict] of DICTS) {
      for (const id of PHASE3_EVENT_IDS) {
        const ev = EVENTS.find((e) => e.id === id);
        expect(ev, `event "${id}" not found in EVENTS`).toBeTruthy();
        if (!ev) continue;
        expect(dict[ev.title], `${name} [${id}]: missing title "${ev.title}"`).toBeTruthy();
        expect(dict[ev.text], `${name} [${id}]: missing text "${ev.text}"`).toBeTruthy();
        expect(ev.options.length, `${name} [${id}]: expected 3 options`).toBe(3);
        ev.options.forEach((opt, i) => {
          const { label, desc } = opt;
          const text = opt.text ?? '';
          expect(dict[label], `${name} [${id}] option ${i}: missing label "${label}"`).toBeTruthy();
          expect(dict[desc], `${name} [${id}] option ${i}: missing desc "${desc}"`).toBeTruthy();
          expect(text, `${name} [${id}] option ${i}: option has no text`).toBeTruthy();
          expect(dict[text], `${name} [${id}] option ${i}: missing text "${text}"`).toBeTruthy();
        });
      }
    }
  });
});
