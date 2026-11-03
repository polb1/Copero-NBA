// Páginas evergreen de anillos: campeones por temporada y títulos por franquicia.
// Datos: public/data/nba-champions.json (Wikipedia, CC BY-SA 4.0) — con atribución.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const SITE = 'https://anillero.com';
const data = JSON.parse(fs.readFileSync('public/data/nba-champions.json', 'utf8'));
const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const css = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).join('\n    ');
const scripts = (shell.match(/<script[^>]+type="module"[^>]*><\/script>/g) || []).join('\n    ');
const fonts = (shell.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join('\n    ');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const style = `<style>
  body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}
  main{max-width:980px;margin:0 auto;padding:32px 20px 64px}
  h1{font-size:32px;margin:0 0 8px}
  h2{font-size:20px;margin:28px 0 10px;color:#f0c04d}
  p.lead{color:#98a0ae;margin-top:0}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{padding:7px 8px;border-bottom:1px solid #23262e;text-align:left}
  th{color:#8a93a3;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
  tr:hover td{background:#14171d}
  .src{color:#6f7787;font-size:12px;margin-top:28px}
  .src a{color:#ff6b1a}
  .cta{display:inline-block;margin-top:24px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}
</style>`;

const pages = [];

// --- Campeones por temporada
const rowsChamp = [...data.champions].reverse().map((c) => `
      <tr><td>${c.year}</td><td><b>${esc(c.champion)}</b></td><td>${esc(c.runnerUp)}</td><td>${esc(c.result)}</td></tr>`).join('');
pages.push({
  slug: 'campeones',
  title: 'Campeones de la NBA por temporada (1947-2026) | Anillero',
  description: `Los ${data.champions.length} campeones de la NBA temporada a temporada, con subcampeón y resultado de las Finales.`,
  h1: 'Campeones de la NBA por temporada',
  lead: `Todas las Finales desde 1947 hasta hoy: quién ganó el anillo, a quién venció y por cuánto.`,
  body: `<table><thead><tr><th>Temporada</th><th>Campeón</th><th>Subcampeón</th><th>Finales</th></tr></thead><tbody>${rowsChamp}</tbody></table>`,
  ld: { '@type': 'Dataset', name: 'Campeones NBA por temporada' },
});

// --- Títulos por franquicia
const rowsFran = data.franchises.map((f) => `
      <tr><td><b>${esc(f.team)}</b></td><td>${f.titles}</td><td>${f.losses ?? '—'}</td></tr>`).join('');
pages.push({
  slug: 'franquicias',
  title: 'Equipos con más anillos de la NBA | Anillero',
  description: 'Ranking de franquicias por títulos NBA: Celtics, Lakers, Warriors, Bulls y el resto.',
  h1: 'Franquicias con más anillos',
  lead: 'Qué equipo ha ganado más campeonatos y cuántas Finales ha perdido.',
  body: `<table><thead><tr><th>Equipo</th><th>Anillos</th><th>Finales perdidas</th></tr></thead><tbody>${rowsFran}</tbody></table>`,
  ld: { '@type': 'Dataset', name: 'Títulos NBA por franquicia' },
});

for (const p of pages) {
  const url = `${SITE}/anillos/${p.slug}`;
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0c0e" />
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="es" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Anillero" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
    <meta name="twitter:card" content="summary_large_image" />
    ${fonts}
    ${css}
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: p.title,
      description: p.description,
      url,
      inLanguage: 'es',
      isPartOf: { '@type': 'WebSite', name: 'Anillero', url: SITE },
      mainEntity: { '@type': p.ld['@type'], name: p.ld.name },
    })}</script>
    ${style}
  </head>
  <body>
    <main id="root">
      <p class="lead"><a href="/" style="color:#ff6b1a;text-decoration:none">Anillero</a> · Anillos y legado</p>
      <h1>${esc(p.h1)}</h1>
      <p class="lead">${esc(p.lead)}</p>
      ${p.body}
      <a class="cta" href="/play">Juega tu carrera y gana tus anillos</a>
      <p class="src">Fuente: <a href="${data.source}" rel="nofollow noopener">Wikipedia</a> (${data.license}), actualizado el ${data.updated}. Datos históricos; no es una publicación oficial de la NBA.</p>
    </main>
    ${scripts}
  </body>
</html>`;
  const dir = path.join(OUT, 'anillos', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// sitemap
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map((p) => `${SITE}/anillos/${p.slug}`).filter((u) => !sm.includes(`<loc>${u}</loc>`));
  const add = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`).join('\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${urls.length} anillos`);
  }
} catch (e) {
  console.warn('sitemap anillos:', e.message);
}

console.log(`gen-evergreen-pages: ${pages.length} páginas`);
