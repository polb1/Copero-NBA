// Hall of Fame: /hall-of-fame (índice por generación) y /hall-of-fame/<década>
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const DATA = 'public/data';
const SITE = 'https://anillero.com';

const read = (f, fb) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fb; }
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const dslug = (d) => d.replace(/\s+/g, '-').toLowerCase();

const hof = read('hall-of-fame.json', []).filter((p) => p.draft);

const grupos = new Map();
for (const p of hof) {
  const d = `${Math.floor(p.draft / 10) * 10}s`;
  if (!grupos.has(d)) grupos.set(d, []);
  grupos.get(d).push(p);
}
const orden = [...grupos.keys()].sort((a, b) => parseInt(b) - parseInt(a));
// dentro de cada generación, primero los mejores puestos del draft
for (const lista of grupos.values()) lista.sort((a, b) => (a.pick || 999) - (b.pick || 999) || a.name.localeCompare(b.name, 'es'));

const CSS = `
  :root{--bg:var(--a-bg);--card:var(--a-card);--line:var(--a-line);--muted:var(--a-muted);--gold:var(--a-gold);--orange:var(--a-accent)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--a-ink);font-family:Inter,system-ui,sans-serif;line-height:1.55}
  a{text-decoration:none;color:inherit}
  .wrap{max-width:1180px;margin:0 auto;padding:24px 20px 80px}
  .crumbs{font-size:13px;color:var(--muted)}
  .hero{margin:14px 0 8px;padding:32px 26px;border:1px solid var(--line);border-radius:18px;
        background:radial-gradient(90% 140% at 10% 0%,rgba(140,100,32,.16),transparent 60%),linear-gradient(180deg,var(--a-card),var(--a-bg))}
  .kicker{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
  h1{font-size:clamp(28px,5vw,44px);margin:8px 0 6px;letter-spacing:-.02em;line-height:1.05}
  .lead{color:var(--a-ink3);max-width:660px;margin:0}
  .nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 6px}
  .nav a{font-size:12px;color:var(--a-ink2);border:1px solid var(--line);border-radius:999px;padding:5px 12px;background:var(--a-card)}
  .nav a:hover{border-color:var(--gold);color:var(--gold)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-top:16px}
  .card{position:relative;display:flex;flex-direction:column;gap:2px;background:var(--card);border:1px solid var(--line);
        border-radius:14px;padding:14px 14px 12px;transition:transform .15s,border-color .15s,background .15s}
  .card:hover{transform:translateY(-2px);border-color:rgba(140,100,32,.6);background:var(--a-card)}
  .ini{position:absolute;top:10px;right:12px;font-size:11px;font-weight:800;color:var(--a-line3)}
  .nm{font-weight:700;font-size:15px;line-height:1.25;padding-right:32px}
  .pos{font-size:12px;color:var(--muted)}
  .team{font-size:12px;color:var(--a-muted);margin-top:4px}
  .draft{font-size:11px;color:var(--gold);margin-top:6px}
  .decs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-top:26px}
  .dec{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;transition:transform .15s,border-color .15s}
  .dec:hover{transform:translateY(-2px);border-color:rgba(140,100,32,.6)}
  .dec b{font-size:26px;color:var(--gold);display:block}
  .dec span{color:var(--muted);font-size:13px}
  .dec em{display:block;margin-top:10px;color:var(--a-ink2);font-size:12px;font-style:normal}
  footer{margin-top:44px;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:12px}
  footer a{color:var(--orange)}
`;

const shell = (title, desc, canonical, kicker, h1, lead, navHTML, body) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow" />
<script>try{var t=localStorage.getItem("anillero-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<style>
  :root{--a-bg:#F7F3EC;--a-card:#FFFDF8;--a-card2:#F3ECE1;--a-line:#E5DBCB;--a-line2:#D8CBB6;--a-line3:#C9B9A2;--a-ink:#2B2420;--a-ink2:#3D342D;--a-ink3:#4A4038;--a-ink4:#5C5148;--a-muted:#6F645A;--a-muted2:#7C7064;--a-gold:#8C6420;--a-accent:#B85A31;--a-on-accent:#FFF8F2;--a-win:#3F7D5A;--a-loss:#B3261E;--a-note-bg:#FBF1DE;--a-note-line:#E2C48B;--a-note-ink:#6B4A12}
  :root[data-theme="dark"]{--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}}
</style>
<style>
  h1,h2,h3{font-family:"Source Serif 4",Georgia,serif}${CSS}</style>
</head>
<body>
<div class="wrap">
  <p class="crumbs"><a href="/">Anillero</a> · <a href="/hall-of-fame">Hall of Fame</a>${kicker ? ` · ${esc(kicker)}` : ''}</p>
  <header class="hero">
    <span class="kicker">${esc(kicker || 'Leyendas')}</span>
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>
  </header>
  <nav class="nav">${navHTML}</nav>
  ${body}
  <footer><a href="/">Resultados</a> · <a href="/jugadores">Jugadores en activo</a> · <a href="/play">Jugar al simulador</a></footer>
</div>
</body>
</html>`;

const tarjeta = (p) => `
      <a class="card" href="/jugador/${p.slug}">
        <span class="ini">${esc(initials(p.name))}</span>
        <span class="nm">${esc(p.name)}</span>
        <span class="pos">${esc(p.pos || '—')}${p.height ? ' · ' + esc(p.height) : ''}</span>
        <span class="team">${esc(p.team)}</span>
        <span class="draft">Draft ${p.draft}</span>
      </a>`;

const nav = orden.map((d) => `<a href="/hall-of-fame/${dslug(d)}">${d}</a>`).join('') + '<a href="/jugadores">En activo</a>';
const decCards = orden.map((d) => `
      <a class="dec" href="/hall-of-fame/${dslug(d)}">
        <b>${d}</b>
        <span>${grupos.get(d).length} jugadores</span>
        <em>${grupos.get(d).slice(0, 4).map((x) => esc(x.name)).join(' · ')}…</em>
      </a>`).join('');

const index = shell(
  'Hall of Fame del baloncesto: leyendas por generación | Anillero',
  `Las leyendas del baloncesto por generación: ${hof.length} jugadores retirados con ficha de posición, draft, altura y último equipo.`,
  `${SITE}/hall-of-fame`,
  'Leyendas',
  'Hall of Fame',
  `${hof.length} jugadores retirados que ya son historia del baloncesto, ordenados por la generación de su draft.`,
  nav,
  `<div class="decs">${decCards}</div>`,
);

fs.mkdirSync(path.join(OUT, 'hall-of-fame'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'hall-of-fame', 'index.html'), index);

for (const d of orden) {
  const lista = grupos.get(d);
  const pg = shell(
    `Hall of Fame · ${d} | Anillero`,
    `${lista.length} jugadores draftados en los ${d}: fichas con posición, altura, universidad y último equipo.`,
    `${SITE}/hall-of-fame/${dslug(d)}`,
    d,
    `Hall of Fame · ${d}`,
    `${lista.length} jugadores draftados en los ${d}. Entra en cualquiera para ver su ficha completa.`,
    nav,
    `<div class="grid">${lista.map(tarjeta).join('')}</div>`,
  );
  fs.mkdirSync(path.join(OUT, 'hall-of-fame', dslug(d)), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'hall-of-fame', dslug(d), 'index.html'), pg);
}

console.log(`gen-hall-of-fame: ${hof.length} jugadores en ${orden.length} generaciones`);

try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const urls = [`${SITE}/hall-of-fame`, ...orden.map((d) => `${SITE}/hall-of-fame/${dslug(d)}`)];
  const add = urls.filter((u) => !sm.includes(`<loc>${u}</loc>`))
    .map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`)
    .join('\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${urls.length} hall of fame`);
  }
} catch (e) { console.warn('sitemap hof:', e.message); }
