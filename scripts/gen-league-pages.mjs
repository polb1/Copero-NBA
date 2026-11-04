// Genera páginas estáticas por liga en dist/liga/<slug>/index.html
// con datos reales de public/data (clasificación, resultados y próximos).
// Se ejecuta DESPUÉS de `vite build`, así que copia del index construido los
// enlaces al bundle para que la SPA hidrate encima.
import fs from 'node:fs';
import path from 'node:path';

const DATA = 'public/data';
const OUT = 'dist';
const SITE = 'https://anillero.com';

const read = (f, fb) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fb; }
};

const standings = read('standings.json', {});
const results = read('results.json', []);
const fixtures = read('fixtures.json', []);
const leagues = read('leagues.json', {});

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const css = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).join('\n    ');
const scripts = (shell.match(/<script[^>]+type="module"[^>]*><\/script>/g) || []).join('\n    ');
const fonts = (shell.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join('\n    ');

const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso || '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(m[3])} ${meses[Number(m[2]) - 1]}`;
};

// "EU" is an internal alias of EuroLeague in standings.json, not a league page.
const names = [...new Set([...Object.keys(standings), ...Object.keys(leagues)])].filter((n) => n !== 'EU');

function table(rows) {
  if (!rows?.length) return '';
  const body = rows.slice(0, 20).map((r) => `
      <tr><td>${r.rank ?? ''}</td><td>${esc(r.team)}</td><td>${r.w ?? ''}</td><td>${r.l ?? ''}</td>
      <td>${(r.w + r.l) ? ((r.w / (r.w + r.l)) * 100).toFixed(1) : '—'}</td></tr>`).join('');
  return `<table><thead><tr><th>#</th><th>Equipo</th><th>G</th><th>P</th><th>%</th></tr></thead><tbody>${body}</tbody></table>`;
}

function list(items, kind) {
  if (!items?.length) return '<p class="dim">Sin datos disponibles todavía.</p>';
  return `<ul>${items.slice(0, 12).map((g) => {
    if (kind === 'result') return `<li><span>${fmtDate(g.date)}</span> ${esc(g.home)} <b>${g.hs}-${g.as}</b> ${esc(g.away)}</li>`;
    return `<li><span>${fmtDate(g.date)}${g.time ? ' · ' + esc(g.time) : ''}</span> ${esc(g.home)} — ${esc(g.away)}</li>`;
  }).join('')}</ul>`;
}

let count = 0;
fs.rmSync(path.join(OUT, 'liga'), { recursive: true, force: true });

for (const name of names) {
  const slug = slugify(name);
  const rows = standings[name] || [];
  const res = results.filter((r) => slugify(r.league) === slug);
  const fix = fixtures.filter((f) => slugify(f.league) === slug);
  const clubs = leagues[name] || [];
  const title = `Clasificación y resultados de ${name} | Anillero`;
  const description = `Clasificación ${rows.length ? 'completa' : 'de equipos'}, últimos resultados y próximos partidos de ${name}, actualizados a diario.`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0c0e" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${SITE}/liga/${slug}" />
    <link rel="alternate" hreflang="es" href="${SITE}/liga/${slug}" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/liga/${slug}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Anillero" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${SITE}/liga/${slug}" />
    <meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
    <meta name="twitter:card" content="summary_large_image" />
    ${fonts}
    ${css}
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: `${SITE}/liga/${slug}`,
      inLanguage: 'es',
      isPartOf: { '@type': 'WebSite', name: 'Anillero', url: SITE },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
          { '@type': 'ListItem', position: 2, name, item: `${SITE}/liga/${slug}` },
        ],
      },
    })}</script>
    <style>
      body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}
      main{max-width:960px;margin:0 auto;padding:32px 20px 64px}
      h1{font-size:32px;margin:0 0 8px}
      h2{font-size:20px;margin:28px 0 10px;color:#f0c04d}
      p.lead{color:#98a0ae;margin-top:0}
      table{width:100%;border-collapse:collapse;font-size:14px}
      th,td{padding:7px 8px;border-bottom:1px solid #23262e;text-align:left}
      th{color:#8a93a3;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
      ul{list-style:none;padding:0;margin:0}
      li{padding:7px 0;border-bottom:1px solid #1c1f26;font-size:14px}
      li span{color:#8a93a3;margin-right:8px;font-size:12px}
      .cta{display:inline-block;margin-top:24px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}
      .dim{color:#8a93a3}
    </style>
  </head>
  <body>
    <main id="root">
      <p class="lead"><a href="/" style="color:#ff6b1a;text-decoration:none">Anillero</a> · Actualidad de baloncesto</p>
      <h1>${esc(name)}</h1>
      <p class="lead">${esc(description)}</p>
      <h2>Clasificación</h2>
      ${rows.length ? table(rows) : `<p class="dim">${clubs.length} equipos con plantilla disponible.</p>${clubs.length ? `<ul>${clubs.slice(0, 30).map((c) => `<li>${esc(typeof c === 'string' ? c : c.name)}</li>`).join('')}</ul>` : ''}`}
      <h2>Últimos resultados</h2>
      ${list(res, 'result')}
      <h2>Próximos partidos</h2>
      ${list(fix, 'next')}
      <a class="cta" href="/play">Jugar al simulador</a>
    </main>
    ${scripts}
  </body>
</html>`;

  const dir = path.join(OUT, 'liga', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  count += 1;
}

// Añade las URLs de liga al sitemap (si no están ya).
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const add = names
    .map((n) => `${SITE}/liga/${slugify(n)}`)
    .filter((u) => !sm.includes(`<loc>${u}</loc>`))
    .map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n  </url>`)
    .join('\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${names.length} ligas`);
  }
} catch (e) {
  console.warn('sitemap: no se pudo actualizar', e.message);
}

console.log(`gen-league-pages: ${count} ligas`);
