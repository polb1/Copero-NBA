import { describe, expect, test } from 'vitest';
import { ownCanonical, robotsFor, titleFor } from '../seo';

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

describe('titleFor / ownCanonical', () => {
  test('account screens get their own title and canonical, not the home page ones', () => {
    expect(titleFor('/auth/login', 'Portada')).toBe('Iniciar sesión | Anillero');
    expect(titleFor('/perfil', 'Portada')).toBe('Mi perfil | Anillero');
    expect(titleFor('/partido/a--b--2026-11-01', 'Portada')).toBe('Partido | Anillero');
    for (const p of ['/auth/login', '/perfil', '/partido/x', '/noticias']) expect(ownCanonical(p)).toBe(true);
  });
  test('static pages keep the title and canonical of their HTML', () => {
    expect(titleFor('/', 'Portada')).toBe('Portada');
    for (const p of ['/', '/en', '/jugador/x']) expect(ownCanonical(p)).toBe(false);
  });
});
