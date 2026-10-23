// Which site a build is for. Cloudflare Workers Builds sets WORKERS_CI_BRANCH: `main` is production
// (anillero.com, indexable); every other branch is pre-production and must stay out of search engines.
// SITE_URL / SITE_ENV override the detection (e.g. a manual `wrangler deploy`).
export const PROD_URL = 'https://anillero.com';
export const PRE_URL = 'https://pre.anillero.com';
export const SITE_TOKEN = '__SITE_URL__';
export const LANGS = ['es', 'en', 'ca'];

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
  const urls = LANGS.map((l) => `  <url>\n    <loc>${pageUrl(site, l)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts}\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/** Cloudflare static-assets `_headers`: noindex on every pre-production response. */
export function headersFile(site) {
  return site.production ? null : '/*\n  X-Robots-Tag: noindex, nofollow\n';
}
