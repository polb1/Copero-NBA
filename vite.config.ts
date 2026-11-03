/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { APP_ROUTES, INDEXNOW_KEY, headersFile, llmsTxt, redirectsFile, renderHtml, robotsTxt, routeHtml, siteConfig, sitemapXml } from './scripts/site.mjs';
import { slugify } from './src/actualidad/leagues';

/** Leagues with a page in the hub: the names in the data files, as URL slugs. */
function leagueSlugs(): string[] {
  const names = new Set<string>();
  for (const f of ['leagues', 'standings']) {
    try {
      for (const k of Object.keys(JSON.parse(readFileSync(resolve(__dirname, `public/data/${f}.json`), 'utf8')))) names.add(slugify(k));
    } catch { /* data file missing: no league pages */ }
  }
  names.delete('eu'); // clave interna de standings.json: alias de EuroLeague, no una página
  return [...names];
}

// Production (main) vs pre-production (any other branch): real origin in the HTML, and robots.txt,
// sitemap.xml and _headers generated for that environment.
function site(): Plugin {
  const cfg = siteConfig();
  return {
    name: 'site-env',
    // The dev server is not production: no beacon, so local visits never reach the stats.
    transformIndexHtml: (html, ctx) => renderHtml(html, ctx.server ? { ...cfg, production: false } : cfg),
    generateBundle: { order: 'post', handler(_, bundle) {
      // Cloudflare answers 404 for any path without a file, so every real route of the app gets its own copy of the shell.
      const shell = bundle['index.html'];
      if (shell && shell.type === 'asset') {
        const routes = [...APP_ROUTES, ...leagueSlugs().map((s) => `liga/${s}`)];
        for (const r of routes) this.emitFile({ type: 'asset', fileName: `${r}/index.html`, source: routeHtml(String(shell.source), cfg, r) });
      }
      this.emitFile({ type: 'asset', fileName: '_redirects', source: redirectsFile() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(cfg) });
      if (cfg.production) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(cfg, new Date().toISOString().slice(0, 10), leagueSlugs().map((s) => `liga/${s}`)) });
        this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt(cfg) });
        this.emitFile({ type: 'asset', fileName: `${INDEXNOW_KEY}.txt`, source: INDEXNOW_KEY });
      }
      const headers = headersFile(cfg);
      if (headers) this.emitFile({ type: 'asset', fileName: '_headers', source: headers });
    } },
    buildStart() {
      this.info?.(`site: ${cfg.kind} → ${cfg.url}`);
    },
  };
}

// One HTML page per language (/, /en/, /ca) so each can be indexed; en/ and ca/ are generated from
// index.html by scripts/gen-pages.mjs before the build.
export default defineConfig({
  base: '/',
  plugins: [react(), site()],
  esbuild: { legalComments: 'none' },
  build: {
    minify: 'terser',
    terserOptions: { format: { comments: false } },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        en: resolve(__dirname, 'en/index.html'),
        ca: resolve(__dirname, 'ca/index.html'),
        guideEs: resolve(__dirname, 'mejores-simuladores-baloncesto/index.html'),
        guideEn: resolve(__dirname, 'en/best-basketball-simulators/index.html'),
      },
    },
  },
  test: { globals: true, environment: 'node' },
});
