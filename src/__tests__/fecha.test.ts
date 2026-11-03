import { describe, expect, test } from 'vitest';
import { fechaCorta } from '../actualidad/data';

describe('fechaCorta', () => {
  test('formats ISO dates and leaves anything else untouched', () => {
    expect(fechaCorta('2026-11-03')).toBe('3 nov');
    expect(fechaCorta('2026-10-30T20:00:00Z')).toBe('30 oct');
    expect(fechaCorta('')).toBe('');
    expect(fechaCorta('Hoy')).toBe('Hoy');
  });
});
