// Tells Bing (and the other IndexNow engines) that the public pages changed. Run after a production deploy:
//   node scripts/indexnow.mjs
import { INDEXNOW_KEY, publicUrls, siteConfig } from './site.mjs';

const site = siteConfig();
if (!site.production) {
  console.log(`indexnow: skipped (${site.kind})`);
  process.exit(0);
}
const host = new URL(site.url).host;
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${site.url}/${INDEXNOW_KEY}.txt`, urlList: publicUrls(site) }),
});
console.log(`indexnow: ${res.status} ${res.statusText} (${publicUrls(site).length} URLs)`);
if (res.status >= 400) process.exit(1);
