// Quita el enlace a /equipo/<slug> cuando esa página no existe (clubes sin ficha: universidades, ligas no cubiertas).
// Va después de todos los generadores, porque cada uno enlaza equipos por su cuenta.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const existe = new Set(fs.readdirSync(path.join(OUT, 'equipo'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name));
const re = /<a([^>]*?)href="\/equipo\/([^"#?]+)"([^>]*)>([\s\S]*?)<\/a>/g;
let paginas = 0, enlaces = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'assets') walk(f); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = fs.readFileSync(f, 'utf8');
    let n = 0;
    const out = html.replace(re, (m, a, slug, b, txt) => (existe.has(slug) ? m : (n++, `<span${a.replace(/\s*class="[^"]*"/, '')}>${txt}</span>`)));
    if (n) { fs.writeFileSync(f, out); paginas++; enlaces += n; }
  }
};
walk(OUT);
console.log(`fix-team-links: ${enlaces} enlaces a equipos sin página quitados en ${paginas} páginas`);
