// Genera la home del portal (dist/index.html) con datos reales en el HTML servido,
// y una landing estática del juego en /simulador-baloncesto.
// Se ejecuta después de `vite build`.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const DATA = 'public/data';
const SITE = 'https://anillero.com';

const read = (f, def) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return def; }
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : (iso || '');
};

const results = read('results.json', []);
const standings = read('standings.json', {});
const fixtures = read('fixtures.json', []);
const actualidad = read('actualidad.json', {});

const LIGAS = [
  ['NBA', 'nba'],
  ['Liga ACB', 'liga-acb'],
  ['EuroLeague', 'euroleague'],
  ['Greek Basket League', 'greek-basket-league'],
  ['Basketbol Süper Ligi', 'basketbol-super-ligi'],
];

const ultimos = [...results]
  .filter((r) => r.date && Number.isFinite(r.hs))
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 12);

const proximos = [...fixtures]
  .filter((f) => f.date)
  .sort((a, b) => (a.date > b.date ? 1 : -1))
  .slice(0, 6);

const filaResultado = (r) => `
      <li class="match">
        <span class="lg">${esc(r.league)}</span>
        <span class="teams">${esc(r.home)} <b>${r.hs}</b>–<b>${r.as}</b> ${esc(r.away)}</span>
        <span class="dt">${fecha(r.date)}</span>
      </li>`;

const tabla = (liga) => {
  const rows = (standings[liga] || []).slice(0, 6);
  if (!rows.length) return '';
  return `
      <div class="tbl">
        <h3><a href="/liga/${LIGAS.find(([n]) => n === liga)[1]}">${esc(liga)}</a></h3>
        <table>
          <thead><tr><th>#</th><th>Equipo</th><th>G</th><th>P</th><th>%</th></tr></thead>
          <tbody>
            ${rows.map((r) => `<tr><td>${r.rank}</td><td>${esc(r.team)}</td><td>${r.w}</td><td>${r.l}</td><td>${((r.w / Math.max(1, r.w + r.l)) * 100).toFixed(1)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
};

const actualizado = actualidad?.updatedAt
  ? new Date(actualidad.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  : new Date().toISOString().slice(0, 10);

const portal = `
    <div id="root">
      <div class="wrap">
        <header class="top">
          <a class="brand" href="/">ANILLERO</a>
          <nav>
            <a href="/liga/nba">NBA</a>
            <a href="/liga/liga-acb">ACB</a>
            <a href="/liga/euroleague">Euroliga</a>
            <a href="/liga/greek-basket-league">GBL</a>
            <a href="/liga/basketbol-super-ligi">BSL</a>
            <a href="/jugadores">Jugadores</a>
            <a href="/hall-of-fame">Hall of Fame</a>
            <a class="cta" href="/play">Jugar al simulador</a>
          </nav>
        </header>

        <main>
          <h1>Resultados y clasificaciones de baloncesto</h1>
          <p class="lead">NBA, Liga ACB, Euroliga, GBL y BSL: últimos resultados, próximos partidos y clasificación, con datos de fuentes públicas oficiales.</p>

          <section>
            <h2>Últimos resultados</h2>
            <ul class="matches">${ultimos.map(filaResultado).join('')}</ul>
          </section>

          <section>
            <h2>Próximos partidos</h2>
            <ul class="matches">
              ${proximos.map((f) => `<li class="match"><span class="lg">${esc(f.league)}</span><span class="teams">${esc(f.home)} – ${esc(f.away)}</span><span class="dt">${fecha(f.date)}</span></li>`).join('')}
            </ul>
          </section>

          <section>
            <h2>Clasificaciones</h2>
            <div class="tables">${LIGAS.map(([n]) => tabla(n)).join('')}</div>
          </section>

          <section class="play">
            <h2>Juega tu carrera</h2>
            <p>Simulador de carrera de baloncesto gratis, sin registro: crea tu jugador, ficha por tu club y compite por el anillo.</p>
            <a class="cta big" href="/play">Jugar al simulador ahora</a>
          </section>
        </main>

        <footer>
          <p>Datos de fuentes públicas oficiales (ESPN, EuroLeague, ACB, ESAKE y API-Basketball). Última actualización: ${esc(actualizado)}.</p>
          <p><a href="/legal/fuentes">Fuentes y licencias</a> · <a href="/legal/aviso-legal">Aviso legal</a> · <a href="/legal/privacidad">Privacidad</a></p>
        </footer>
      </div>
    </div>`;

const css = `
    <style>
      :root{color-scheme:dark}
      body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.55}
      .wrap{max-width:1080px;margin:0 auto;padding:20px}
      .top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid #1e222b;padding-bottom:14px}
      .brand{font-weight:800;letter-spacing:.14em;color:#ff6b1a;text-decoration:none;font-size:18px}
      nav{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
      nav a{color:#aeb6c2;text-decoration:none;font-size:14px}
      nav a:hover{color:#fff}
      .cta{background:#ff6b1a;color:#1b0b00!important;font-weight:700;padding:8px 14px;border-radius:8px}
      h1{font-size:30px;margin:26px 0 6px}
      h2{font-size:19px;margin:30px 0 10px;color:#f0c04d}
      .lead{color:#98a0ae;margin:0 0 8px}
      .matches{list-style:none;padding:0;margin:0}
      .match{display:grid;grid-template-columns:150px 1fr auto;gap:10px;padding:8px 0;border-bottom:1px solid #1a1e26;font-size:14px}
      .match .lg{color:#8a93a3;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
      .match .dt{color:#8a93a3;font-size:12px}
      .tables{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
      .tbl h3{margin:0 0 6px;font-size:15px}
      .tbl h3 a{color:#e6e8ec;text-decoration:none}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;color:#8a93a3;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:4px 6px}
      td{padding:5px 6px;border-top:1px solid #1a1e26}
      .play{margin:34px 0;padding:20px;border:1px solid #2a2f3a;border-radius:12px;background:#12151b}
      .cta.big{display:inline-block;margin-top:8px;padding:12px 20px;font-size:15px}
      footer{margin-top:30px;border-top:1px solid #1e222b;padding-top:14px;color:#7d8695;font-size:12px}
      footer a{color:#98a0ae}
      @media(max-width:640px){.match{grid-template-columns:1fr auto}.match .lg{display:none}}
    </style>`;

// ---------- 1. Home del portal ----------
const indexPath = path.join(OUT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/<title>[^<]*<\/title>/, '<title>Resultados y clasificaciones de baloncesto | Anillero</title>');
html = html.replace(/<meta name="description" content="[^"]*"/,
  '<meta name="description" content="Resultados, próximos partidos y clasificaciones de NBA, Liga ACB, Euroliga, GBL y BSL. Datos de fuentes públicas oficiales y simulador de carrera gratis."');
html = html.replace(/<meta property="og:title" content="[^"]*"/, '<meta property="og:title" content="Resultados y clasificaciones de baloncesto | Anillero"');
html = html.replace(/<meta property="og:description" content="[^"]*"/,
  '<meta property="og:description" content="Resultados, clasificaciones y calendario de las cinco ligas que cubrimos, más un simulador de carrera gratis."');

// sustituye el bloque #root (splash + landing) por el portal
const start = html.indexOf('<div id="root">');
// el bloque termina donde empieza el <script> inline del splash (Vite pone el módulo en <head>)
const end = html.indexOf('<script', start);
if (start === -1 || end === -1) throw new Error('gen-portal-home: no encuentro el bloque #root');
html = html.slice(0, start) + portal + '\n    ' + css + '\n    ' + html.slice(end);

fs.writeFileSync(indexPath, html);
console.log('gen-portal-home: home del portal generada');

// ---------- 2. Landing estática del juego ----------
const landing = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simulador de carrera de baloncesto gratis | Anillero</title>
<meta name="description" content="Simulador de carrera de baloncesto gratis en el navegador: crea tu jugador, ficha por tu club, entra en el draft y compite por el anillo. Sin registro." />
<link rel="canonical" href="${SITE}/simulador-baloncesto" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="Simulador de carrera de baloncesto gratis | Anillero" />
<meta property="og:description" content="Crea tu jugador, ficha por tu club y compite por el anillo. Gratis, sin registro, en el navegador." />
<meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow" />
${css}
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="brand" href="/">ANILLERO</a>
      <nav><a href="/">Resultados</a><a class="cta" href="/play">Jugar</a></nav>
    </header>
    <main>
      <h1>Simulador de carrera de baloncesto gratis</h1>
      <p class="lead">Crea tu jugador con 18 años, elige club y vive su carrera temporada a temporada: draft, contratos, lesiones, traspasos, anillos y retirada. Una carrera completa se juega en 5-10 minutos.</p>
      <h2>Qué incluye</h2>
      <ul>
        <li>Modo carrera con decisiones por temporada y simulación partido a partido.</li>
        <li>Clubes de NBA, Liga ACB y Europa, con plantillas reales.</li>
        <li>31 logros, vitrina de trofeos y comparación con tus carreras anteriores.</li>
        <li>Gratis, sin registro, sin anuncios e instalable como app.</li>
      </ul>
      <p class="play"><a class="cta big" href="/play">Jugar al simulador ahora</a></p>
      <h2>Datos reales y simulación</h2>
      <p>Las plantillas y los datos de las ligas proceden de fuentes públicas oficiales y se actualizan periódicamente. Los partidos, decisiones, draft, entrenadores y agentes son simulados. Anillero es un proyecto independiente sin afiliación con la NBA.</p>
    </main>
    <footer>
      <p><a href="/">Resultados y clasificaciones</a> · <a href="/legal/fuentes">Fuentes y licencias</a> · <a href="/legal/aviso-legal">Aviso legal</a></p>
    </footer>
  </div>
</body>
</html>`;

// sitemap: añadir la landing del juego si no está
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const url = `${SITE}/simulador-baloncesto`;
  if (!sm.includes(`<loc>${url}</loc>`)) {
    sm = sm.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log('sitemap: +simulador-baloncesto');
  }
} catch (e) { console.warn('sitemap:', e.message); }

fs.mkdirSync(path.join(OUT, 'simulador-baloncesto'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'simulador-baloncesto', 'index.html'), landing);
console.log('gen-portal-home: landing /simulador-baloncesto generada');
