// Tells Bing (and the other IndexNow engines) that the public pages changed. Run after a production build:
//   node scripts/indexnow.mjs
import { existsSync, readFileSync } from 'node:fs';
import { INDEXNOW_KEY, publicUrls, siteConfig } from './site.mjs';

const site = siteConfig();
if (!site.production) {
  console.log(`indexnow: skipped (${site.kind})`);
  process.exit(0);
}
// The built sitemap also lists the pages the post-build scripts add (leagues, teams, rings, legal).
const urls = existsSync('dist/sitemap.xml')
  ? [...readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  : publicUrls(site);
const host = new URL(site.url).host;
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${site.url}/${INDEXNOW_KEY}.txt`, urlList: urls }),
});
console.log(`indexnow: ${res.status} ${res.statusText} (${urls.length} URLs)`);
if (res.status >= 400) process.exit(1);
