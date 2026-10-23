# 11 · Mejoras rápidas

## En un día

1. **Dominio canónico en el build.** Cambiar `SITE` en `scripts/gen-pages.mjs` por `process.env.SITE_URL ?? 'https://anillero.com'` y generar desde él `sitemap.xml` y `robots.txt`, eliminando los fijos de `public/`. Arregla el canonical, hreflang, OG y JSON-LD de golpe.
2. **Proteger pre.anillero.com.** Cloudflare Zero Trust → Access → aplicación para `pre.anillero.com` con login por email (gratis hasta 50 usuarios). Además, una regla con `X-Robots-Tag: noindex`.
3. **Activar Cloudflare Web Analytics** solo en anillero.com.
4. **«Always Use HTTPS» + HSTS** en la zona `anillero.com`, y DNS de `www` con redirección 301 a la raíz.
5. **Corregir `exportCareer`** (`/\s+/g`) en `src/store/store.ts`.
6. **GitHub:** descripción, homepage `https://anillero.com` y topics.

## En una semana

1. Redirecciones 301 de `nba.polb.dev` y `pre-nba.polb.dev` a `anillero.com`, conservando la ruta, y desactivar las URLs `*.workers.dev` (Settings → Domains).
2. Search Console de dominio para `anillero.com`, envío del sitemap y «Cambio de dirección» desde nba.polb.dev.
3. CI (`typecheck`, `test`, `build`) en GitHub Actions y protección de `main`. Publicar en producción solo desde `main`.
4. Línea de propuesta de valor en la pantalla de creación y aviso de nombre solo al intentar empezar.
5. Imagen OG de 1200×630.
6. Páginas `/privacidad` y `/aviso-legal`, que pueden ser estáticas en `public/`.
7. Eventos básicos con Umami: `career_start`, `first_decision`, `career_retire` y `card_share`.

## En un mes

1. URL y CTA en la tarjeta PNG, y reto con semilla compartible.
2. Arreglo del CLS de `.country-grid` y división del bundle (`nbaRoster2026.json` y el motor bajo demanda).
3. Migración real de partidas e importación del JSON.
4. Dos o tres guías en español (draft de la NBA, Europa o NCAA, posiciones).
5. Fichas en itch.io, AlternativeTo y Product Hunt.
6. Revisar con datos (4 semanas de línea base) y decidir entre onboarding, reto diario o contenido.
