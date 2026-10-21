/** @vitest-environment node */
// The career card must be savable on a phone: share sheet, new tab or a plain download.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../card', () => ({ drawCard: vi.fn(() => 'data:image/png;base64,' + btoa('hola')) }));

import { drawCard } from '../card';
import { dataUrlToBlob, downloadPNG, savePNG } from '../download';
import type { Career } from '../../engine/types';

const PNG = 'data:image/png;base64,' + btoa('hola');

let clicked: { href: string; download: string }[] = [];
let opened: string[] = [];

beforeEach(() => {
  clicked = [];
  opened = [];
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      href: '', download: '', rel: '', style: {},
      click: vi.fn(function (this: { href: string; download: string }) { clicked.push({ href: this.href, download: this.download }); }),
      remove: vi.fn(),
    })),
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal('window', { open: vi.fn((url: string) => { opened.push(url); return {}; }) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dataUrlToBlob', () => {
  it('turns a PNG data URL into a blob of the same bytes', async () => {
    const blob = dataUrlToBlob(PNG);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(4);
    expect(await blob.text()).toBe('hola');
  });
});

describe('savePNG', () => {
  it('downloads with an anchor on desktop', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120', platform: 'MacIntel' });
    const out = await savePNG(PNG, 'card.png');
    expect(out).toEqual({ ok: true, method: 'download' });
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('card.png');
    expect(clicked[0].href).toBe('blob:mock');
  });

  it('uses the share sheet when the platform can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', share, canShare: () => true });
    vi.stubGlobal('File', class { constructor(public parts: unknown[], public name: string, public opts: unknown) {} });
    const out = await savePNG(PNG, 'card.png');
    expect(out.method).toBe('share');
    expect(share).toHaveBeenCalledTimes(1);
    expect((share.mock.calls[0][0] as ShareData).files?.[0].name).toBe('card.png');
  });

  it('opens the image in a new tab on iOS when sharing is not available', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' });
    const out = await savePNG(PNG, 'card.png');
    expect(out.method).toBe('open');
    expect(opened).toEqual(['blob:mock']);
    expect(out.hint).toContain('pulsado');
  });

  it('does not fail when the user cancels the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }));
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', share, canShare: () => true });
    vi.stubGlobal('File', class { constructor(public parts: unknown[], public name: string, public opts: unknown) {} });
    const out = await savePNG(PNG, 'card.png');
    expect(out).toEqual({ ok: false, method: 'cancelled' });
  });
});

describe('downloadPNG', () => {
  it('renders the career card and saves it with the given name', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Chrome', platform: 'Linux' });
    const out = await downloadPNG({} as Career, 'nba-legacy-abc.png');
    expect(out.method).toBe('download');
    expect(clicked[0].download).toBe('nba-legacy-abc.png');
  });

  it('reports a failure instead of throwing', async () => {
    vi.mocked(drawCard).mockImplementationOnce(() => { throw new Error('boom'); });
    const out = await downloadPNG({} as Career, 'x.png');
    expect(out.ok).toBe(false);
    expect(out.method).toBe('error');
  });
});
