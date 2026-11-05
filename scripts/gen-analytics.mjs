// Inyecta Cloudflare Web Analytics (sin cookies) en todas las páginas generadas.
// Token: variable de entorno CLOUDFLARE_ANALYTICS_TOKEN, o public/data/analytics.json
//   { "token": "..." }  (el token del beacon, no la API key)
// Sin token no inyecta nada y avisa: no se rompe el build.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const DATA = 'public/data';

function token() {
  if (process.env.CLOUDFLARE_ANALYTICS_TOKEN) return process.env.CLOUDFLARE_ANALYTICS_TOKEN.trim();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(DATA, 'analytics.json'), 'utf8'));
    return (j.token || '').trim();
  } catch { return ''; }
}

const t = token();
if (!t) {
  console.log('gen-analytics: sin token (define CLOUDFLARE_ANALYTICS_TOKEN o public/data/analytics.json)');
  process.exit(0);
}

const snippet = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${t}"}'></script>`;

let tocadas = 0;
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8');
      if (html.includes('cloudflareinsights.com/beacon')) continue;
      if (!html.includes('</head>')) continue;
      fs.writeFileSync(p, html.replace('</head>', `  ${snippet}\n</head>`));
      tocadas += 1;
    }
  }
}

walkDir(OUT);
console.log(`gen-analytics: ${tocadas} páginas con beacon de Cloudflare`);
