import { describe, expect, test } from 'vitest';
import { headersFile, llmsTxt, publicUrls, renderHtml, robotsTxt, siteConfig, sitemapXml } from './site.mjs';

describe('siteConfig', () => {
  test('main and local builds are production on anillero.com', () => {
    expect(siteConfig({ WORKERS_CI_BRANCH: 'main' })).toEqual({ url: 'https://anillero.com', production: true, kind: 'production' });
    expect(siteConfig({})).toMatchObject({ url: 'https://anillero.com', production: true });
  });
  test('any other branch is pre-production', () => {
    expect(siteConfig({ WORKERS_CI_BRANCH: 'pre' })).toEqual({ url: 'https://pre.anillero.com', production: false, kind: 'pre' });
    expect(siteConfig({ WORKERS_CI_BRANCH: 'dario' }).production).toBe(false);
  });
  test('explicit variables win, without a trailing slash', () => {
    expect(siteConfig({ WORKERS_CI_BRANCH: 'pre', SITE_ENV: 'production', SITE_URL: 'https://x.dev/' })).toMatchObject({ url: 'https://x.dev', production: true });
  });
});

describe('outputs', () => {
  const prod = siteConfig({ WORKERS_CI_BRANCH: 'main' });
  const pre = siteConfig({ WORKERS_CI_BRANCH: 'pre' });
  const html = '<link rel="canonical" href="__SITE_URL__/" /><meta name="robots" content="index, follow, max-image-preview:large" /><meta property="og:image" content="__SITE_URL__/icons/icon-512.png" />';

  test('html gets the real origin; pre is noindex', () => {
    const p = renderHtml(html, prod);
    expect(p).not.toContain('__SITE_URL__');
    expect(p).toContain('href="https://anillero.com/"');
    expect(p).toContain('index, follow');
    expect(renderHtml(html, pre)).toContain('content="noindex, nofollow"');
  });
  test('robots, sitemap and headers per environment', () => {
    expect(robotsTxt(prod)).toContain('Sitemap: https://anillero.com/sitemap.xml');
    expect(robotsTxt(pre)).not.toContain('Sitemap');
    const map = sitemapXml(prod, '2026-10-23');
    expect(map.match(/<loc>/g)).toHaveLength(5);
    expect(map).toContain('<loc>https://anillero.com/mejores-simuladores-baloncesto/</loc>');
    expect(map).toContain('<loc>https://anillero.com/en/</loc>');
    expect(map).not.toContain('polb.dev');
    expect(headersFile(prod)).toBeNull();
    expect(headersFile(pre)).toContain('X-Robots-Tag: noindex');
  });
  test('llms.txt and IndexNow list only production URLs', () => {
    expect(llmsTxt(prod)).toContain('https://anillero.com/en/best-basketball-simulators/');
    expect(llmsTxt(prod)).not.toContain('polb.dev');
    expect(publicUrls(prod)).toEqual([
      'https://anillero.com/', 'https://anillero.com/en/', 'https://anillero.com/ca/',
      'https://anillero.com/mejores-simuladores-baloncesto/', 'https://anillero.com/en/best-basketball-simulators/',
    ]);
  });
});
