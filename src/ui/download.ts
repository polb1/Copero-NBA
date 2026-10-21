// Saving the career card everywhere: a real download on desktop, the share sheet on phones
// (or a new tab on iOS, where the "download" attribute is ignored).
import type { Career } from '../engine/types';
import { drawCard } from './card';

export type SaveMethod = 'download' | 'share' | 'open' | 'cancelled' | 'error';

export interface SaveOutcome {
  ok: boolean;
  method: SaveMethod;
  /** What to tell the user when the browser could not save the file on its own. */
  hint?: string;
}

/** data:image/png;base64,… → Blob. Synchronous on purpose: the click gesture must stay alive. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const head = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const body = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:([^;,]+)/.exec(head)?.[1] ?? 'image/png';
  if (!/;base64/i.test(head)) return new Blob([decodeURIComponent(body)], { type: mime });
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** iOS Safari ignores the "download" attribute: the image is opened in a tab instead. */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return iOS || iPadOS;
}

/** Saves a PNG data URL with whatever the platform offers. */
export async function savePNG(dataUrl: string, filename: string): Promise<SaveOutcome> {
  let blob: Blob;
  try {
    blob = dataUrlToBlob(dataUrl);
  } catch {
    return { ok: false, method: 'error', hint: 'No se pudo generar la imagen.' };
  }

  // 1) Legacy Edge / IE.
  const legacy = (navigator as unknown as { msSaveOrOpenBlob?: (b: Blob, n: string) => boolean }).msSaveOrOpenBlob;
  if (typeof legacy === 'function') {
    try {
      legacy.call(navigator, blob, filename);
      return { ok: true, method: 'download' };
    } catch { /* try the next one */ }
  }

  // 2) The share sheet (iOS / Android): the user saves it to Files or Photos.
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'image/png' }) : null;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && file && (typeof nav.canShare !== 'function' || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({ files: [file], title: filename });
      return { ok: true, method: 'share' };
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return { ok: false, method: 'cancelled' };
      /* the platform refused the files: fall through */
    }
  }

  // 3) A blob URL: iOS opens it in a new tab (long-press to save), the rest downloads it.
  if (typeof URL.createObjectURL !== 'function') {
    const w = typeof window !== 'undefined' ? window.open(dataUrl, '_blank') : null;
    return w ? { ok: true, method: 'open', hint: 'Mantén pulsado para guardar la imagen.' } : { ok: false, method: 'error' };
  }
  const url = URL.createObjectURL(blob);
  if (isIOS()) {
    const w = typeof window !== 'undefined' ? window.open(url, '_blank') : null;
    if (!w) return { ok: false, method: 'error', hint: 'Permite las ventanas emergentes para guardar la imagen.' };
    return { ok: true, method: 'open', hint: 'Mantén pulsado para guardar la imagen.' };
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { ok: true, method: 'download' };
}

/** Draws the career card and saves it as a PNG. */
export async function downloadPNG(c: Career, filename: string): Promise<SaveOutcome> {
  let dataUrl: string;
  try {
    dataUrl = drawCard(c);
  } catch {
    return { ok: false, method: 'error', hint: 'No se pudo generar la imagen.' };
  }
  return savePNG(dataUrl, filename);
}
