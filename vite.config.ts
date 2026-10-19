/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One HTML page per language (/, /en/, /ca/) so each can be indexed; en/ and ca/ are generated from
// index.html by scripts/gen-pages.mjs before the build.
export default defineConfig({
  base: '/',
  plugins: [react()],
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
