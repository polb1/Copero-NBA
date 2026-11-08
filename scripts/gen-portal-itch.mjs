// Build ITCH.IO: dist/ comprimido .zip + metadata + sin analytics
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIST = 'dist';
const OUT = 'dist-itch';

console.log('📦 Building base...');
execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.cpSync(DIST, OUT, { recursive: true });

// Elimina analytics de Cloudflare del play/index.html
const playHtml = path.join(OUT, 'play', 'index.html');
let html = fs.readFileSync(playHtml, 'utf8');
html = html.replace(/<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*><\/script>/, '');
html = html.replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3428519882418322"[^>]*><\/script>/, '');
fs.writeFileSync(playHtml, html);

// Crea butler.toml (metadatos para itch.io via butler)
const butlerToml = `[package]
name = "anillero"
title = "Anillero · Modo Carrera"
version = "1.0.0"
author = "Anillero"
description = "Simulador de carrera de baloncesto gratis en el navegador. Crea tu jugador, entra en el draft de la NBA y gana anillos. Sin registro, en el móvil."
license = "Proprietary"
homepage = "https://anillero.com"

[build]
# Web build - se sirve tal cual
target = "html"
entry = "play/index.html"

[platforms]
html = true

[metadata]
# Tags para descubribilidad en itch.io
tags = ["simulation", "sports", "basketball", "career", "management", "free-to-play", "browser", "mobile-friendly"]

# Categoría
category = "simulation"

# Clasificación por edad
content_rating = "everyone"

# Controles
controls = "mouse, keyboard, touch"
`;

fs.writeFileSync(path.join(OUT, 'butler.toml'), butlerToml);

// README para itch.io
const readmeItch = `# Anillero · Modo Carrera

Simulador de carrera de baloncesto gratis en el navegador.

## Cómo jugar
1. Abre \`play/index.html\` en tu navegador
2. Crea tu jugador (nombre, país, posición, estilo)
3. Elige tu primer club y vive tu carrera: draft NBA, contratos, lesiones, anillos
4. Una carrera completa dura 5-10 minutos

## Características
- Liga NBA completa simulada (30 equipos, 82 partidos, playoffs, premios)
- Carrera en Europa: ACB, EuroLeague, Italia, Grecia, Turquía, Francia, Alemania...
- 31 logros, vitrina de trofeos, comparación de carreras
- Gratis, sin registro, sin anuncios, instalable como app (PWA)
- Funciona offline (Service Worker)

## Créditos
Datos de plantillas 2026-27 de fuentes públicas (ESPN, EuroLeague, ACB, ESAKE, API-Basketball).
Simulación, decisiones, draft, entrenadores y agentes son ficticios.
Proyecto independiente sin afiliación con la NBA.

## Soporte
\`https://anillero.com\` | \`https://github.com/tu-usuario/copero-NBA\`
`;

fs.writeFileSync(path.join(OUT, 'README_ITCH.md'), readmeItch);

console.log('✅ itch.io build en dist-itch/ (con butler.toml y README_ITCH.md)');

// ZIP para subida manual o via butler
execSync(`cd ${OUT} && zip -r ../itch-build.zip . -x "*.DS_Store"`, { stdio: 'inherit' });
console.log('📦 itch-build.zip listo');
// Para subir con butler: butler push dist-itch/ tu-usuario/anillero:html