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
const intros = read('league-intros.json', {});
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
  const description = `Clasificación ${rows.length ? 'completa' : 'de equipos'}, últimos resultados y próximos partidos de ${name}, actualizados periódicamente.`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F7F3EC" />
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
    <script>try{var t=localStorage.getItem("anillero-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<style>
  :root{--a-bg:#F7F3EC;--a-card:#FFFDF8;--a-card2:#F3ECE1;--a-line:#E5DBCB;--a-line2:#D8CBB6;--a-line3:#C9B9A2;--a-ink:#2B2420;--a-ink2:#3D342D;--a-ink3:#4A4038;--a-ink4:#5C5148;--a-muted:#6F645A;--a-muted2:#7C7064;--a-gold:#8C6420;--a-accent:#B85A31;--a-on-accent:#FFF8F2;--a-win:#3F7D5A;--a-loss:#8A7E72;--a-note-bg:#FBF1DE;--a-note-line:#E2C48B;--a-note-ink:#6B4A12}
  :root[data-theme="dark"]{--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#A08C74;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#A08C74;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}}
</style>
<style>
  h1,h2,h3{font-family:"Source Serif 4",Georgia,serif}
      body{margin:0;background:var(--a-bg);color:var(--a-ink);font-family:Inter,system-ui,sans-serif;line-height:1.55}
      main{max-width:960px;margin:0 auto;padding:32px 20px 64px}
      h1{font-size:32px;margin:0 0 8px}
      h2{font-size:20px;margin:28px 0 10px;color:var(--a-gold)}
      p.lead{color:var(--a-muted);margin-top:0}
      table{width:100%;border-collapse:collapse;font-size:14px}
      th,td{padding:7px 8px;border-bottom:1px solid var(--a-line);text-align:left}
      th{color:var(--a-muted);font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
      ul{list-style:none;padding:0;margin:0}
      li{padding:7px 0;border-bottom:1px solid var(--a-line);font-size:14px}
      li span{color:var(--a-muted);margin-right:8px;font-size:12px}
      .cta{display:inline-block;margin-top:24px;background:var(--a-accent);color:var(--a-on-accent);font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}
      .dim{color:var(--a-muted)}
    </style>
  </head>
  <body>
    <main id="root">
      <p class="lead"><a href="/" style="color:var(--a-accent);text-decoration:none">Anillero</a> · Actualidad de baloncesto</p>
      <h1>${esc(name)}</h1>
      ${intros[name] ? `<p class="lead">${esc(intros[name])}</p>` : ''}
      <p class="lead">${esc(description)}</p>
      <h2>Clasificación</h2>
      ${rows.length ? table(rows) : `<p class="dim">${clubs.length} equipos con plantilla disponible.</p>${clubs.length ? `<ul>${clubs.slice(0, 30).map((c) => `<li>${esc(typeof c === 'string' ? c : c.name)}</li>`).join('')}</ul>` : ''}`}
      <h2>Últimos resultados</h2>
      ${list(res, 'result')}
      <h2>Próximos partidos</h2>
      ${list(fix, 'next')}
      <a class="cta" href="/play">Jugar al simulador</a>
    </main>
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
