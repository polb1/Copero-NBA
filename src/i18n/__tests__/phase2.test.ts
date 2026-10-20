import { EN } from '../en';
import { CA } from '../ca';
import { MINIGAME_HINTS, MINIGAME_HINT_FALLBACK, MINIGAME_TIERS } from '../../content/minigames';
import { COMBINE_TESTS } from '../../content/combine';

/** Hints of the phase 2 minigames (the 4 legacy ones were translated with the old shot meter). */
const PHASE2_KINDS = ['spotlight', 'dunk', 'boards', 'steal', 'pass', 'close'] as const;

const DICTS: [string, Record<string, string>][] = [
  ['EN', EN],
  ['CA', CA],
];

describe('phase 2 dictionaries', () => {
  test('every phase 2 minigame hint is translated', () => {
    for (const [name, dict] of DICTS) {
      for (const kind of PHASE2_KINDS) {
        const hint = MINIGAME_HINTS[kind];
        expect(hint, `${name}: hint of ${kind}`).toBeTruthy();
        expect(hint, `${name}: ${kind} hint must be named in Spanish`).not.toMatch(/\blane\b/);
        expect(dict[hint], `${name}: missing hint "${hint}"`).toBeTruthy();
      }
      expect(dict[MINIGAME_HINT_FALLBACK], `${name}: missing hint fallback`).toBeTruthy();
    }
  });

  test('tier labels and descriptions are translated', () => {
    for (const [name, dict] of DICTS) {
      for (const tier of MINIGAME_TIERS) {
        expect(dict[tier.label], `${name}: missing tier label "${tier.label}"`).toBeTruthy();
        expect(dict[tier.desc], `${name}: missing tier desc "${tier.desc}"`).toBeTruthy();
      }
    }
  });

  test('every combine test label and description is translated', () => {
    expect(COMBINE_TESTS.length).toBe(5);
    for (const [name, dict] of DICTS) {
      for (const test of COMBINE_TESTS) {
        expect(dict[test.label], `${name}: missing combine label "${test.label}"`).toBeTruthy();
        expect(dict[test.desc], `${name}: missing combine desc "${test.desc}"`).toBeTruthy();
      }
    }
  });

  test('a sample of the new UI strings is translated', () => {
    const sample = [
      // TargetGame
      'Lanzar a la diana. Tiro {n1} de {n2}',
      '¡DIANA!',
      'Clic, toque, Espacio o Enter para lanzar',
      // PowerGame
      'Mantén pulsado. Intento {n1} de {n2}',
      '¡Suelta!',
      'Mantén pulsado y suelta dentro de la franja',
      // ReactionGame
      'Celda {n1}. Intento {n2} de {n3}',
      '¡AHORA!',
      'Prepárate…',
      'Toca la celda o pulsa 1-{n}',
      // ChoiceGame
      'Carril {n1}. Intento {n2} de {n3}',
      '¡CORRECTO!',
      'Memoriza el carril abierto',
      // EventInline
      'Dificultad',
      'Recompensa ×{n}',
      'Riesgo de lesión {n}%',
      // Play (combine)
      'Draft Combine',
      'Demostrar todo',
      'No acudir',
      'Prueba {n1}/{n2}',
      'Dificultad: {x}',
      'El resultado mueve tu proyección en el draft.',
    ];
    for (const [name, dict] of DICTS) {
      for (const key of sample) {
        expect(typeof dict[key], `${name}: missing "${key}"`).toBe('string');
        expect(dict[key].length, `${name}: empty "${key}"`).toBeGreaterThan(0);
      }
    }
  });

  test('dynamic patterns keep their placeholders', () => {
    const patterns = [
      'Lanzar a la diana. Tiro {n1} de {n2}',
      'Mantén pulsado. Intento {n1} de {n2}',
      'Celda {n1}. Intento {n2} de {n3}',
      'Carril {n1}. Intento {n2} de {n3}',
      'Toca la celda o pulsa 1-{n}',
      'Recompensa ×{n}',
      'Riesgo de lesión {n}%',
      'Prueba {n1}/{n2}',
      'Dificultad: {x}',
      'Combine {x}',
      'Bonus {x}',
    ];
    for (const [name, dict] of DICTS) {
      for (const key of patterns) {
        const slots = key.match(/\{[a-zA-Z0-9_]+\}/g) ?? [];
        const out = dict[key];
        expect(out, `${name}: missing "${key}"`).toBeTruthy();
        for (const slot of slots) expect(out, `${name}: "${key}" lost ${slot}`).toContain(slot);
      }
    }
  });
});
