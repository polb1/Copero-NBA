/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { headersFile, renderHtml, robotsTxt, siteConfig, sitemapXml } from './scripts/site.mjs';

// Production (main) vs pre-production (any other branch): real origin in the HTML, and robots.txt,
// sitemap.xml and _headers generated for that environment.
function site(): Plugin {
  const cfg = siteConfig();
  return {
    name: 'site-env',
    transformIndexHtml: (html) => renderHtml(html, cfg),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(cfg) });
      if (cfg.production) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(cfg, new Date().toISOString().slice(0, 10)) });
      const headers = headersFile(cfg);
      if (headers) this.emitFile({ type: 'asset', fileName: '_headers', source: headers });
    },
    buildStart() {
      this.info?.(`site: ${cfg.kind} → ${cfg.url}`);
    },
  };
}

// One HTML page per language (/, /en/, /ca/) so each can be indexed; en/ and ca/ are generated from
// index.html by scripts/gen-pages.mjs before the build.
export default defineConfig({
  base: '/',
  plugins: [react(), site()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        en: resolve(__dirname, 'en/index.html'),
        ca: resolve(__dirname, 'ca/index.html'),
      },
    },
  },
  test: { globals: true, environment: 'node' },
});
