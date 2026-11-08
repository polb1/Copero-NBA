// Índice de jugadores: /jugadores
// Lista las plantillas por equipo (enlazando a /jugador/<slug>) y los jugadores
// con contenido propio, que son los únicos indexables.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const DATA = 'public/data';
const SITE = 'https://anillero.com';

const read = (f, fb) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fb; }
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const porEquipo = read('player-slugs.json', {});
const rostersClub = (() => {
  try { return JSON.parse(fs.readFileSync('src/data/realRosters2026.json', 'utf8')).clubs || {}; }
  catch { return {}; }
})();
const standings = read('standings.json', {});

const LIGAS = ['NBA', 'Liga ACB', 'EuroLeague', 'Greek Basket League', 'Basketbol Süper Ligi'];

const equipos = new Map();
for (const liga of LIGAS) {
  for (const r of standings[liga] || []) {
    equipos.set(r.team, { liga, rank: r.rank, w: r.w, l: r.l, jugadores: porEquipo[r.team] || [] });
  }
}
// clubes con plantilla real que no están en la clasificación de nuestras ligas
for (const [club, data] of Object.entries(rostersClub)) {
  if (equipos.has(club)) continue;
  const jugadores = (data.players || []).map((pl) => ({ name: pl.name, slug: null, indexable: false }));
  if (jugadores.length) equipos.set(club, { liga: data.league || '', rank: null, w: null, l: null, jugadores });
}

// equipos con plantilla pero sin clasificación (BSL, por ejemplo)
for (const [team, jugadores] of Object.entries(porEquipo)) {
  if (!equipos.has(team)) equipos.set(team, { liga: '', rank: null, w: null, l: null, jugadores });
}

const conPlantilla = [...equipos.entries()]
  .filter(([, v]) => v.jugadores.length)
  .sort((a, b) => (a[1].liga || 'zz').localeCompare(b[1].liga || 'zz', 'es') || a[0].localeCompare(b[0], 'es'));

const indexables = Object.values(porEquipo).flat().filter((j) => j.indexable)
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const bloqueEquipo = ([team, v]) => `
      <details class="team">
        <summary><a href="/equipo/${slug(team)}">${esc(team)}</a> <span class="meta">${v.liga ? esc(v.liga) + ' · ' : ''}${v.jugadores.length} jugadores</span></summary>
        <ul class="squad">${v.jugadores.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map((j) => `<li>${j.slug ? `<a href="/jugador/${j.slug}">${esc(j.name)}</a>` : esc(j.name)}</li>`).join('')}</ul>
      </details>`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Jugadores en activo: plantillas de las 5 ligas | Anillero</title>
<meta name="description" content="Plantillas de NBA, Liga ACB, Euroliga, GBL y BSL: consulta los jugadores de cada equipo y su perfil." />
<link rel="canonical" href="${SITE}/jugadores" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="Jugadores de baloncesto: plantillas de las 5 ligas" />
<meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow" />
<style>
  h1,h2,h3{font-family:"Source Serif 4",Georgia,serif}
body{margin:0;background:#F7F3EC;color:#2B2420;font-family:Inter,system-ui,sans-serif;line-height:1.55}
main{max-width:900px;margin:0 auto;padding:32px 20px 64px}
a{color:#B85A31;text-decoration:none}
h1{font-size:30px;margin:0 0 6px}
h2{font-size:18px;margin:26px 0 10px;color:#8C6420}
.meta{color:#6F645A;font-size:13px}
.team{border-bottom:1px solid #E5DBCB;padding:6px 0}
.team summary{cursor:pointer;font-size:15px}
.team summary .meta{margin-left:8px}
.squad{list-style:none;padding:6px 0 6px 14px;margin:0;columns:2;column-gap:24px}
.squad li{font-size:13px;padding:2px 0}
.squad a{color:#3D342D}
.cta{display:inline-block;margin-top:24px;background:#B85A31;color:#FFF8F2;font-weight:700;padding:10px 18px;border-radius:8px}
</style>
</head>
<body>
<main>
  <p class="meta"><a href="/">Anillero</a> · Jugadores</p>
  <h1>Jugadores en activo</h1>
  <p class="meta">Plantillas 2026-27 por equipo, con dorsal, posición y altura. Para las leyendas retiradas, <a href="/hall-of-fame">Hall of Fame</a>.</p>

  <h2>Plantillas por equipo (${conPlantilla.length})</h2>
  ${conPlantilla.map(bloqueEquipo).join('')}

  <a class="cta" href="/play">Jugar al simulador</a>
</main>
</body>
</html>`;

fs.mkdirSync(path.join(OUT, 'jugadores'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'jugadores', 'index.html'), html);
console.log(`gen-players-index: ${conPlantilla.length} equipos · ${indexables.length} fichas`);

// sitemap
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const url = `${SITE}/jugadores`;
  if (!sm.includes(`<loc>${url}</loc>`)) {
    sm = sm.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>\n</urlset>`);
    fs.writeFileSync(smPath, sm);
  }
} catch (e) { console.warn('sitemap jugadores:', e.message); }
