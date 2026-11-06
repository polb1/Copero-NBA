// Sitemap determinista: se reconstruye al final del build recorriendo dist/.
// Incluye solo páginas con <meta name="robots"> que permita indexar.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const SITE = 'https://anillero.com';

const urls = [];
let excluidas = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (e.name !== 'index.html') continue;

    const rel = path.relative(OUT, path.dirname(p)).replace(/\\/g, '/');
    if (rel.startsWith('404')) continue;

    const html = fs.readFileSync(p, 'utf8');
    const robots = /<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html);
    const content = robots ? robots[1].toLowerCase() : '';
    if (content.includes('noindex')) { excluidas += 1; continue; }

    const url = rel === '' || rel === '.' ? `${SITE}/` : `${SITE}/${rel}`;
    urls.push(url);
  }
}

walk(OUT);
urls.sort();

const today = new Date().toISOString().slice(0, 10);
const body = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

fs.writeFileSync(path.join(OUT, 'sitemap.xml'), xml);
console.log(`gen-sitemap: ${urls.length} URLs (${excluidas} noindex excluidas)`);
