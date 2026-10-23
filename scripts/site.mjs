// Which site a build is for. Cloudflare Workers Builds sets WORKERS_CI_BRANCH: `main` is production
// (anillero.com, indexable); every other branch is pre-production and must stay out of search engines.
// SITE_URL / SITE_ENV override the detection (e.g. a manual `wrangler deploy`).
export const PROD_URL = 'https://anillero.com';
export const PRE_URL = 'https://pre.anillero.com';
export const SITE_TOKEN = '__SITE_URL__';
export const LANGS = ['es', 'en', 'ca'];
// IndexNow (Bing, Yandex…): public by design, served as /<key>.txt to prove we own the site.
export const INDEXNOW_KEY = '320dd01b51d83aa0c00fc827baf16335';
// Editorial pages besides the three game landings, with their translations.
export const GUIDES = [{ es: '/mejores-simuladores-baloncesto/', en: '/en/best-basketball-simulators/' }];

export function siteConfig(env = process.env) {
  const branch = env.WORKERS_CI_BRANCH;
  const kind = env.SITE_ENV || (!branch || branch === 'main' ? 'production' : 'pre');
  const production = kind === 'production';
  const url = (env.SITE_URL || (production ? PROD_URL : PRE_URL)).replace(/\/+$/, '');
  return { url, production, kind };
}

const pageUrl = (site, lang) => `${site.url}/${lang === 'es' ? '' : `${lang}/`}`;

/** Puts the real origin into the HTML and keeps pre-production pages out of the index. */
export function renderHtml(html, site) {
  let out = html.split(SITE_TOKEN).join(site.url);
  if (!site.production) {
    out = out.replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, nofollow" />');
  }
  return out;
}

export function robotsTxt(site) {
  // Pre-production stays crawlable on purpose: a Disallow would hide the noindex header from Google.
  return site.production ? `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n` : 'User-agent: *\nAllow: /\n';
}

export function sitemapXml(site, lastmod) {
  const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(site, l)}" />`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(site, 'es')}" />`)
    .join('\n');
  const urls = LANGS.map((l) => `  <url>\n    <loc>${pageUrl(site, l)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts}\n  </url>`);
  for (const g of GUIDES) {
    const galts = Object.entries(g).map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site.url}${p}" />`).join('\n');
    for (const p of Object.values(g)) urls.push(`  <url>\n    <loc>${site.url}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n${galts}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Every public URL, for IndexNow submissions. */
export function publicUrls(site) {
  return [...LANGS.map((l) => pageUrl(site, l)), ...GUIDES.flatMap((g) => Object.values(g).map((p) => site.url + p))];
}

/** /llms.txt: a plain summary for AI assistants and their crawlers (llmstxt.org format). */
export function llmsTxt(site) {
  const u = site.url;
  return `# NBA Legacy

> Free basketball career simulator that runs in the browser (phone and desktop), at ${u}/. Create a player at 18, choose country and position, and live a whole career to retirement: youth club, NBA draft, contracts, injuries, trades, awards and legacy. No sign-up, no download. Available in Spanish, English and Catalan.

Key facts:
- Genre: single-player basketball career simulator (you play one player, not a GM). Free to play.
- Real 2026-27 NBA rosters, plus real clubs in Europe and around the world (Liga ACB, EuroLeague, Italy, Greece, Turkey, France, Germany and more). You can stay in Europe or jump to the NBA.
- Decisions with consequences (agent, club, draft, press, training, money) and clutch-shot mini-games.
- Three paces: Express, Normal and Long; a full career takes about 5-10 minutes in the quick mode.
- Installable as an app (PWA) and works offline; progress is saved in the browser.
- Independent project, not affiliated with or endorsed by the NBA.

## Play
- [Play in Spanish](${u}/): main page
- [Play in English](${u}/en/)
- [Play in Catalan](${u}/ca/)

## Guides
- [Best free basketball simulator games (2026)](${u}/en/best-basketball-simulators/): comparison with Basketball GM, HoopDreams, DRAFTBOUND, My NBA Career Simulator and NBA 2K MyCareer
- [Mejores simuladores de baloncesto gratis (2026)](${u}/mejores-simuladores-baloncesto/): the same comparison in Spanish
`;
}

/** Cloudflare static-assets `_headers`: noindex on every pre-production response. */
export function headersFile(site) {
  return site.production ? null : '/*\n  X-Robots-Tag: noindex, nofollow\n';
}
