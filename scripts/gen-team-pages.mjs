// Genera páginas estáticas por equipo en dist/equipo/<slug>/index.html
// con datos reales: liga, posición, balance, últimos resultados y próximos partidos.
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

const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : (iso || '');
};

// índice equipo -> liga
const teamLeague = new Map();
fs.rmSync(path.join(OUT, 'equipo'), { recursive: true, force: true });

for (const [liga, rows] of Object.entries(standings)) {
  for (const r of rows || []) if (r.team) teamLeague.set(r.team, liga);
}
for (const [liga, clubs] of Object.entries(leagues)) {
  for (const c of clubs || []) {
    const name = typeof c === 'string' ? c : c?.name;
    if (name && !teamLeague.has(name)) teamLeague.set(name, liga);
  }
}
for (const r of results) {
  if (r.home && !teamLeague.has(r.home)) teamLeague.set(r.home, r.league);
  if (r.away && !teamLeague.has(r.away)) teamLeague.set(r.away, r.league);
}
for (const f of fixtures) {
  if (f.home && !teamLeague.has(f.home)) teamLeague.set(f.home, f.league);
  if (f.away && !teamLeague.has(f.away)) teamLeague.set(f.away, f.league);
}

const byTeam = (list, name) => list.filter((g) => g.home === name || g.away === name);

const porEquipo = read('player-slugs.json', {});

// Plantillas reales (ACB, Euroliga, GBL, BSL...) desde los datos del juego
const rosters = (() => {
  try {
    const j = JSON.parse(fs.readFileSync('src/data/realRosters2026.json', 'utf8'));
    return j.clubs || {};
  } catch { return {}; }
})();
const STOP = new Set(['basket','basketball','club','baloncesto','sad','s','a','d','the','bc','b c','j k','jk','sk','basketbol','istanbul','athens','piraeus','madrid']);
const normName = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (t) => normName(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
const rosterFor = (team) => {
  const t = normName(team);
  if (rosters[team]) return rosters[team];
  const exacto = Object.keys(rosters).find((k) => normName(k) === t);
  if (exacto) return rosters[exacto];
  // por tokens: gana el club que más palabras comparte (evita depender del patrocinador)
  const mios = tokens(team);
  let mejor = null;
  let mejorPuntos = 0;
  for (const k of Object.keys(rosters)) {
    const suyos = tokens(k);
    const puntos = suyos.filter((w) => mios.includes(w)).length;
    if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = k; }
  }
  return mejorPuntos > 0 ? rosters[mejor] : null;
};
const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const css = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).join('\n    ');
const scripts = (shell.match(/<script[^>]+type="module"[^>]*><\/script>/g) || []).join('\n    ');
const fonts = (shell.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join('\n    ');

let count = 0;
const urls = [];

for (const [team, liga] of [...teamLeague.entries()].sort()) {
  const res = byTeam(results, team);
  const fix = byTeam(fixtures, team);
  if (!res.length && !fix.length) continue; // sin datos: no generamos página vacía

  const row = (standings[liga] || []).find((r) => r.team === team);
  const slug = slugify(team);
  const form = res.slice(-5).map((g) => {
    const won = (g.home === team ? g.hs > g.as : g.as > g.hs);
    return `<span class="${won ? 'w' : 'l'}">${won ? 'V' : 'D'}</span>`;
  }).join('');

  const title = `${team}: resultados, clasificación y próximos partidos | Anillero`;
  const description = `${team} (${liga}): ${row ? `posición ${row.rank} con ${row.w}-${row.l}` : 'plantilla y calendario'}, últimos resultados y próximos partidos actualizados periódicamente.`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0c0e" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${SITE}/equipo/${slug}" />
    <link rel="alternate" hreflang="es" href="${SITE}/equipo/${slug}" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/equipo/${slug}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Anillero" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${SITE}/equipo/${slug}" />
    <meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
    <meta name="twitter:card" content="summary_large_image" />
    ${fonts}
    ${css}
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: team,
      sport: 'Basketball',
      url: `${SITE}/equipo/${slug}`,
      memberOf: { '@type': 'SportsOrganization', name: liga },
    })}</script>
    <style>
      body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}
      main{max-width:900px;margin:0 auto;padding:32px 20px 64px}
      h1{font-size:32px;margin:0 0 6px}
      h2{font-size:19px;margin:26px 0 10px;color:#f0c04d}
      .meta{color:#98a0ae;margin:0 0 18px}
      .stats{display:flex;gap:18px;flex-wrap:wrap;margin:18px 0}
      .stat{background:#14171d;border:1px solid #232733;border-radius:10px;padding:12px 16px;min-width:110px}
      .stat b{display:block;font-size:22px}
      .stat span{color:#8a93a3;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
      ul{list-style:none;padding:0;margin:0}
      li{padding:8px 0;border-bottom:1px solid #1c1f26;font-size:14px}
      li span.d{color:#8a93a3;margin-right:8px;font-size:12px}
      .w,.l{display:inline-block;width:20px;text-align:center;border-radius:4px;font-size:11px;font-weight:700;margin-right:3px}
      .w{background:#123a2c;color:#4edea3}
      .l{background:#3a1620;color:#ff8f9a}
      .cta{display:inline-block;margin-top:26px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}
    </style>
  </head>
  <body>
    <main id="root">
      <p class="meta"><a href="/" style="color:#ff6b1a;text-decoration:none">Anillero</a> · <a href="/liga/${slugify(liga)}" style="color:#98a0ae;text-decoration:none">${esc(liga)}</a></p>
      <h1>${esc(team)}</h1>
      <p class="meta">${esc(description)}</p>
      <div class="stats">
        ${row ? `<div class="stat"><b>${row.rank}º</b><span>Posición</span></div>
        <div class="stat"><b>${row.w}-${row.l}</b><span>Balance</span></div>
        <div class="stat"><b>${(row.w + row.l) ? ((row.w / (row.w + row.l)) * 100).toFixed(1) + '%' : '—'}</b><span>Victorias</span></div>` : ''}
        ${form ? `<div class="stat"><b>${form}</b><span>Última racha</span></div>` : ''}
      </div>
      <h2>Plantilla</h2>
      ${(() => {
        const conPagina = new Map((porEquipo[team] || []).map((j) => [j.name, j.slug]));
        const ros = rosterFor(team);
        const lista = (ros && ros.players ? ros.players : []).map((pl) => ({
          name: pl.name,
          slug: conPagina.get(pl.name) || null,
          pos: pl.pos || '',
          number: pl.number ?? null,
        }));
        // los que tienen ficha propia y no estaban en el roster (NBA desde balldontlie)
        for (const [name, slug] of conPagina) {
          if (!lista.some((x) => x.name === name)) lista.push({ name, slug, pos: '', number: null });
        }
        if (!lista.length) return '<p class="meta">Sin plantilla disponible todavía.</p>';
        lista.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        const entrenador = ros && ros.coach ? `<p class="meta">Entrenador: ${esc(ros.coach)}</p>` : '';
        return `${entrenador}<ul class="squad">${lista.map((j) => `<li>${j.number !== null && j.number !== '' ? `<span class="num">${esc(j.number)}</span> ` : ''}${j.slug ? `<a href="/jugador/${j.slug}">${esc(j.name)}</a>` : esc(j.name)}${j.pos ? ` <span class="meta">${esc(j.pos)}</span>` : ''}</li>`).join('')}</ul>`;
      })()}
      <h2>Últimos resultados</h2>
      ${res.length ? `<ul>${res.slice(-10).reverse().map((g) => `<li><span class="d">${fmtDate(g.date)}</span>${esc(g.home)} <b>${g.hs}-${g.as}</b> ${esc(g.away)}</li>`).join('')}</ul>` : '<p class="meta">Sin resultados registrados.</p>'}
      <h2>Próximos partidos</h2>
      ${fix.length ? `<ul>${fix.slice(0, 10).map((g) => `<li><span class="d">${fmtDate(g.date)}${g.time ? ' · ' + esc(g.time) : ''}</span>${esc(g.home)} — ${esc(g.away)}</li>`).join('')}</ul>` : '<p class="meta">Sin partidos programados.</p>'}
      <a class="cta" href="/play">Jugar al simulador</a>
    </main>
  </body>
</html>`;

  const dir = path.join(OUT, 'equipo', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  urls.push(`${SITE}/equipo/${slug}`);
  count += 1;
}

// sitemap
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const add = urls.filter((u) => !sm.includes(`<loc>${u}</loc>`))
    .map((u) => `  <url>\\n    <loc>${u}</loc>\\n    <lastmod>${today}</lastmod>\\n    <changefreq>daily</changefreq>\\n  </url>`)
    .join('\\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${urls.length} equipos`);
  }
} catch (e) {
  console.warn('sitemap equipos:', e.message);
}

console.log(`gen-team-pages: ${count} equipos`);
