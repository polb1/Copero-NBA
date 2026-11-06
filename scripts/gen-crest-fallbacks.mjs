// Genera un escudo SVG de respaldo para los equipos sin logo disponible.
// Forma de escudo, iniciales y color estable por nombre: nada queda vacío.
import fs from 'node:fs';
import path from 'node:path';

const MAP = 'src/actualidad/crestMap.json';
const DATA = 'public/data';
const OUT = 'public/crests/generated';

const read = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initials = (n) => String(n).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// paleta de clubes: colores vivos y contraste alto sobre fondo oscuro
const PALETTE = [
  ['#1d4ed8', '#3b82f6'], ['#b91c1c', '#ef4444'], ['#166534', '#22c55e'],
  ['#a16207', '#f59e0b'], ['#6d28d9', '#8b5cf6'], ['#0e7490', '#06b6d4'],
  ['#9d174d', '#ec4899'], ['#374151', '#6b7280'],
];
function colors(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function shield(name, a, b, corte) {
  const ini = initials(name) || '?';
  const corto = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 132" width="120" height="132" role="img" aria-label="${corte}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <path d="M60 4 L112 22 V70 C112 100 88 118 60 128 C32 118 8 100 8 70 V22 Z" fill="url(#g)" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
  <path d="M60 12 L104 27 V70 C104 95 84 111 60 120 C36 111 16 95 16 70 V27 Z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>
  <text x="60" y="76" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="${ini.length > 2 ? 34 : 40}" font-weight="800" fill="#fff" letter-spacing="1">${ini}</text>
</svg>`;
}

const mapa = read(MAP, {});
const standings = read(path.join(DATA, 'standings.json'), {});
const leagues = read(path.join(DATA, 'leagues.json'), {});

const equipos = new Set();
for (const rows of Object.values(standings)) for (const r of rows) equipos.add(r.team);
for (const clubs of Object.values(leagues)) for (const c of clubs) equipos.add(typeof c === 'string' ? c : c.name);

fs.mkdirSync(OUT, { recursive: true });
let creados = 0;
let existentes = 0;

const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Busca un escudo real: exacto, normalizado o por tokens compartidos. */
function real(team) {
  const directo = mapa[team];
  if (directo && !directo.includes('/generated/') && fs.existsSync(path.join('public', directo))) return directo;
  const t = norm(team);
  const igual = Object.keys(mapa).find((k) => norm(k) === t && !mapa[k].includes('/generated/') && fs.existsSync(path.join('public', mapa[k])));
  if (igual) return mapa[igual];
  const mios = t.split(' ').filter((w) => w.length >= 3);
  let mejor = null;
  let puntos = 0;
  for (const k of Object.keys(mapa)) {
    if (mapa[k].includes('/generated/')) continue;
    if (!fs.existsSync(path.join('public', mapa[k]))) continue;
    const suyos = norm(k).split(' ').filter((w) => w.length >= 3);
    const p = suyos.filter((w) => mios.includes(w)).length;
    if (p > puntos) { puntos = p; mejor = mapa[k]; }
  }
  return puntos > 0 ? mejor : null;
}

for (const team of equipos) {
  const encontrado = real(team);
  if (encontrado) {
    if (mapa[team] !== encontrado) mapa[team] = encontrado;
    existentes += 1;
    continue;
  }
  if (mapa[team] && fs.existsSync(path.join('public', mapa[team]))) { existentes += 1; continue; }
  const slug = slugify(team);
  const rel = `/crests/generated/${slug}.svg`;
  const dest = path.join('public', slug ? rel.slice(1) : '');
  if (!fs.existsSync(dest)) {
    const [a, b] = colors(team);
    fs.writeFileSync(dest, shield(team, a, b, team.replace(/"/g, '&quot;')));
    creados += 1;
  }
  mapa[team] = rel;
}

fs.writeFileSync(MAP, JSON.stringify(mapa, null, 0) + '\n');
console.log(`gen-crest-fallbacks: ${creados} escudos generados · ${existentes} con logo real · ${equipos.size} equipos`);
