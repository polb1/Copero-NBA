// Picks up new deploys in tabs that stay open for days: when the player comes back to the tab, the page
// is compared with the live one and, if the build changed, reloaded (the career is saved first).
import { store } from './store/store';

const entry = () => document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/main-"]')?.getAttribute('src') ?? null;

async function liveEntry(): Promise<string | null> {
  try {
    const res = await fetch(location.pathname, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.text()).match(/\/assets\/main-[\w-]+\.js/)?.[0] ?? null;
  } catch {
    return null; // offline: keep playing the version we have
  }
}

let lastCheck = 0;
async function check() {
  const mine = entry();
  if (!mine || Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  const live = await liveEntry();
  if (!live || live === mine) return;
  // Never in the middle of a simulation: try again on the next return to the tab.
  if (store.get().sim || store.get().busy) { lastCheck = 0; return; }
  store.flush();
  location.reload();
}

export function watchForUpdates() {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
  window.addEventListener('focus', () => void check());
}
