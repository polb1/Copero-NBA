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
const initials = (t) => String(t).split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : (iso || '');
};

// "EU" es un alias interno de EuroLeague en standings.json: sin él, los clubes quedan en su liga nacional.
delete standings.EU;

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

const crestMap = (() => {
  try { return JSON.parse(fs.readFileSync('src/actualidad/crestMap.json', 'utf8')); } catch { return {}; }
})();
const gblRosters = read('gbl-rosters.json', {});
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
const ALIAS_ROSTER = {
  'Barça Basket': 'FC Barcelona',
  'Kosner Baskonia': 'Baskonia',
};

const rosterFor = (team) => {
  const alias = ALIAS_ROSTER[team];
  if (alias && rosters[alias]) return rosters[alias];
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
  if (mejorPuntos > 0) return rosters[mejor];
  // respaldo: plantillas de la liga griega (esake.gr)
  const exactoGbl = gblRosters[team] || Object.entries(gblRosters).find(([k]) => normName(k) === t)?.[1];
  if (exactoGbl) return { players: exactoGbl, coach: '' };
  let mejorG = null;
  let puntosG = 0;
  for (const [k, v] of Object.entries(gblRosters)) {
    const p = normName(k).split(' ').filter((w) => w.length > 3 && mios.includes(w)).length;
    if (p > puntosG) { puntosG = p; mejorG = v; }
  }
  return puntosG > 0 ? { players: mejorG, coach: '' } : null;
};
const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const css = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).join('\n    ');
// Standalone page: only the analytics beacon, never the app (React would mount over #root and show its 404).
const scripts = (shell.match(/<script[^>]+cloudflareinsights[^>]*><\/script>/g) || []).join('\n    ');
const fonts = (shell.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join('\n    ');

let count = 0;
const urls = [];

for (const [team, liga] of [...teamLeague.entries()].sort()) {
  const res = byTeam(results, team);
  const fix = byTeam(fixtures, team);
  const row = (standings[liga] || []).find((r) => r.team === team);
  // Sin datos no hay página, salvo si sale en una clasificación (la tabla del hub enlaza a todos).
  if (!res.length && !fix.length && !row) continue;
  const slug = slugify(team);
  const form = res.slice(-5).map((g) => {
    const won = (g.home === team ? g.hs > g.as : g.as > g.hs);
    return `<span class="${won ? 'w' : 'l'}">${won ? 'V' : 'D'}</span>`;
  }).join('');

  const title = `${team}: resultados, clasificación y próximos partidos | Anillero`;
  const description = `${team} (${liga}): ${row ? `posición ${row.rank} con ${row.w}-${row.l}` : 'plantilla y calendario'}, últimos resultados y próximos partidos actualizados periódicamente.`;

  // escudo: alias exacto -> nombre normalizado -> tokens compartidos -> slug -> generado
  const buscarEscudo = (nombre) => {
    const directo = crestMap[nombre];
    if (directo && fs.existsSync(path.join('public', directo))) return directo;
    const t = normName(nombre);
    const igual = Object.keys(crestMap).find((k) => normName(k) === t);
    if (igual && fs.existsSync(path.join('public', crestMap[igual]))) return crestMap[igual];
    const mios = t.split(' ').filter((w) => w.length >= 3);
    let mejor = null;
    let puntos = 0;
    for (const k of Object.keys(crestMap)) {
      const suyos = normName(k).split(' ').filter((w) => w.length >= 3);
      const p = suyos.filter((w) => mios.includes(w)).length;
      if (p > puntos && fs.existsSync(path.join('public', crestMap[k]))) { puntos = p; mejor = crestMap[k]; }
    }
    return puntos > 0 ? mejor : null;
  };
  const porSlug = `/crests/${slug}.png`;
  const crest = buscarEscudo(team) || (fs.existsSync(path.join('public', porSlug)) ? porSlug : null);
  const pct = row && row.w + row.l ? ((row.w / (row.w + row.l)) * 100).toFixed(1) : null;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${SITE}/equipo/${slug}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="${esc(team)} · ${esc(liga)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team,
    sport: 'Basketball',
    memberOf: { '@type': 'SportsOrganization', name: liga },
  })}</script>
<style>
  :root{color-scheme:dark;--bg:#0b0c0e;--card:#12151b;--line:#232733;--muted:#8a93a3;--gold:#f0c04d;--orange:#ff6b1a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:#e6e8ec;font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.55}
  a{color:var(--orange);text-decoration:none}
  .wrap{max-width:980px;margin:0 auto;padding:24px 20px 72px}
  .crumbs{font-size:13px;color:var(--muted);margin:0 0 16px}
  .hero{display:flex;align-items:center;gap:20px;padding:22px;border:1px solid var(--line);border-radius:16px;
        background:radial-gradient(120% 120% at 0% 0%,rgba(255,107,26,.14),transparent 55%),linear-gradient(180deg,#151a23,#0e1117)}
  .crest{width:84px;height:84px;border-radius:16px;background:#0b0c0e;border:1px solid var(--line);object-fit:contain;padding:8px;flex:0 0 auto}
  .crest-fallback{width:84px;height:84px;border-radius:16px;display:grid;place-items:center;background:#1a1f29;border:1px solid var(--line);font-weight:800;font-size:26px;color:var(--orange);flex:0 0 auto}
  h1{font-size:34px;margin:0 0 2px;letter-spacing:-.02em;line-height:1.1}
  .chip{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);border:1px solid rgba(240,192,77,.35);border-radius:999px;padding:2px 9px;margin-top:6px}
  .chips{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;min-width:110px}
  .kpi b{display:block;font-size:22px;font-variant-numeric:tabular-nums}
  .kpi span{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  h2{font-size:18px;margin:34px 0 12px;color:var(--gold);display:flex;align-items:center;gap:8px}
  .coach{color:var(--muted);font-size:13px;margin:-6px 0 12px}
  .squad{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:0;margin:0;list-style:none}
  .player{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;transition:border-color .15s,transform .15s}
  .player:hover{border-color:rgba(255,107,26,.55);transform:translateY(-1px)}
  .player .n{font-size:17px;font-weight:800;color:var(--orange);min-width:34px;text-align:center;font-variant-numeric:tabular-nums}
  .player .nm{display:block;font-weight:600;font-size:14px;color:#e6e8ec;line-height:1.25}
  .player .pos{display:block;font-size:12px;color:var(--muted);margin-top:2px}
  .list{list-style:none;padding:0;margin:0}
  .list li{display:grid;grid-template-columns:70px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #1a1e26;font-size:14px}
  .list .d{color:var(--muted);font-size:12px}
  .list .sc{font-weight:700;font-variant-numeric:tabular-nums}
  .w{color:#4edea3;font-weight:700}.l{color:#ff6b6b;font-weight:700}
  .cta{display:inline-block;margin-top:30px;background:var(--orange);color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px}
  .foot{margin-top:36px;border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:12px}
  @media(max-width:560px){.hero{flex-direction:column;align-items:flex-start}h1{font-size:27px}}
</style>
</head>
<body>
<div class="wrap">
  <p class="crumbs"><a href="/">Anillero</a> · <a href="/liga/${slugify(liga)}">${esc(liga)}</a> · ${esc(team)}</p>

  <header class="hero">
    ${crest ? `<img class="crest" src="${crest}" alt="Escudo de ${esc(team)}" loading="lazy" />` : `<div class="crest-fallback">${esc(initials(team))}</div>`}
    <div>
      <h1>${esc(team)}</h1>
      <span class="chip">${esc(liga)}</span>
    </div>
  </header>

  <div class="chips">
    ${row ? `<div class="kpi"><b>${row.rank}º</b><span>Posición</span></div>
    <div class="kpi"><b>${row.w}-${row.l}</b><span>Ganados-Perdidos</span></div>
    <div class="kpi"><b>${pct}%</b><span>Victorias</span></div>` : ''}
    ${form ? `<div class="kpi"><b>${form}</b><span>Últimos 5</span></div>` : ''}
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
      nat: pl.nat || '',
      height: pl.heightCm || null,
    }));
    for (const [name, slug] of conPagina) {
      if (!lista.some((x) => x.name === name)) lista.push({ name, slug, pos: '', number: null, nat: '', height: null });
    }
    if (!lista.length) return '<p class="coach">Todavía no tenemos la plantilla de este club. Puedes ver el resto de jugadores en <a href="/jugadores">Jugadores</a>.</p>';
    lista.sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999));
    const coach = ros && ros.coach ? `<p class="coach">Entrenador: <b>${esc(ros.coach)}</b></p>` : '';
    return coach + `<ul class="squad">${lista.map((j) => `
      <li class="player">
        <span class="n">${esc(j.number !== null && j.number !== '' ? j.number : '–')}</span>
        <span>
          ${j.slug ? `<a class="nm" href="/jugador/${j.slug}">${esc(j.name)}</a>` : `<span class="nm">${esc(j.name)}</span>`}
          <span class="pos">${esc(j.pos)}${j.height ? ' · ' + j.height + ' cm' : ''}${j.nat ? ' · ' + esc(j.nat) : ''}</span>
        </span>
      </li>`).join('')}</ul>`;
  })()}

  <h2>Últimos resultados</h2>
  ${res.length ? `<ul class="list">${res.slice(-10).reverse().map((g) => {
    const gano = g.home === team ? g.hs > g.as : g.as > g.hs;
    return `<li><span class="d">${fmtDate(g.date)}</span><span>${esc(g.home)} <b class="sc">${g.hs}-${g.as}</b> ${esc(g.away)}</span><span class="${gano ? 'w' : 'l'}">${gano ? 'V' : 'D'}</span></li>`;
  }).join('')}</ul>` : '<p class="coach">Sin resultados registrados.</p>'}

  <h2>Próximos partidos</h2>
  ${fix.length ? `<ul class="list">${fix.slice(0, 10).map((g) => `<li><span class="d">${fmtDate(g.date)}${g.time ? ' · ' + esc(g.time) : ''}</span><span>${esc(g.home)} — ${esc(g.away)}</span><span class="d">${esc(g.league || '')}</span></li>`).join('')}</ul>` : '<p class="coach">Sin partidos programados.</p>'}

  <a class="cta" href="/play">Jugar al simulador con ${esc(team)}</a>

  <p class="foot"><a href="/jugadores">Todos los jugadores</a> · <a href="/liga/${slugify(liga)}">Clasificación de ${esc(liga)}</a> · <a href="/">Resultados</a></p>
</div>
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
