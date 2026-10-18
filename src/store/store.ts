import { useSyncExternalStore } from 'react';
import type { Career } from '../engine/types';
import { SAVE_VERSION, userOf } from '../engine/career';
import { fullName } from '../engine/players';
import { teamName } from '../engine/league';
import { seasonLabel } from '../engine/schedule';
import { averages } from '../engine/stats';
import { challengeDone, challengeOf } from '../engine/challenges';

// ---------- Persistence ----------
const KEY_INDEX = 'nbalegacy:slots';
const KEY_SAVE = (id: string) => `nbalegacy:save:${id}`;
const KEY_ACH = 'nbalegacy:achievements';
const KEY_HISTORY = 'nbalegacy:history';
const KEY_SETTINGS = 'nbalegacy:settings';
const KEY_LAST = 'nbalegacy:last';

export interface SlotMeta {
  id: string;
  name: string;
  detail: string;
  mode: Career['mode'];
  phase: Career['phase'];
  updatedAt: number;
  dailyKey?: string;
}

export interface Settings {
  motion: 'system' | 'reduce' | 'full';
  textScale: number;
  contrast: 'normal' | 'high';
  autoPause: boolean;
  confirmSim: boolean;
}

const DEFAULT_SETTINGS: Settings = { motion: 'system', textScale: 1, contrast: 'normal', autoPause: true, confirmSim: false };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function listSlots(): SlotMeta[] {
  return read<SlotMeta[]>(KEY_INDEX, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

function metaFor(c: Career): SlotMeta {
  const u = userOf(c);
  return {
    id: c.id,
    name: fullName(u),
    detail: `${u.pos} · ${u.age} años · OVR ${u.ovr} · ${teamName(c.league, u.teamId)} · ${seasonLabel(c.league.season)}`,
    mode: c.mode,
    phase: c.phase,
    updatedAt: c.updatedAt,
    dailyKey: c.dailyKey,
  };
}

export function saveCareer(c: Career): boolean {
  c.updatedAt = Date.now();
  // One career at a time: starting a new one replaces the previous save (finished ones live on in the history).
  for (const s of listSlots()) if (s.id !== c.id) deleteSlot(s.id);
  const ok = write(KEY_SAVE(c.id), c);
  write(KEY_INDEX, [metaFor(c)]);
  if (c.retirement) recordHistory(c);
  write(KEY_LAST, c.id);
  mergeAchievements(c.achievements);
  return ok;
}

export function loadCareer(id: string): Career | null {
  const c = read<Career | null>(KEY_SAVE(id), null);
  if (!c || c.version !== SAVE_VERSION) return c ? migrate(c) : null;
  return c;
}

function migrate(c: Career): Career | null {
  // Version 1 is the first public schema. Future migrations go here.
  return c.version === SAVE_VERSION ? c : null;
}

export function deleteSlot(id: string) {
  try {
    localStorage.removeItem(KEY_SAVE(id));
  } catch {
    /* ignore */
  }
  write(KEY_INDEX, listSlots().filter((s) => s.id !== id));
}

export function lastSlotId(): string | null {
  return read<string | null>(KEY_LAST, null);
}

/** Downloads the career as JSON (used by the crash screen to rescue a save). */
export function exportCareer(c: Career) {
  const blob = new Blob([JSON.stringify(c)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nba-legacy-${fullName(userOf(c)).replace(/s+/g, '-').toLowerCase()}-${seasonLabel(c.league.season)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Old builds kept many saves: move the finished ones into the history and keep only the last career. */
export function consolidateSaves() {
  const last = lastSlotId();
  const known = new Set(careerHistory().map((h) => h.id));
  for (const s of listSlots()) {
    if (s.phase === 'retired' && !known.has(s.id)) {
      const c = loadCareer(s.id);
      if (c?.retirement) recordHistory(c);
    }
    if (s.id !== last) deleteSlot(s.id);
  }
}

// ---------- Finished careers (kept small so they can pile up) ----------
export interface CareerRecord {
  id: string;
  name: string;
  nat: string;
  pos: string;
  from: number;
  to: number;
  age: number;
  seasons: number;
  teams: string[];
  gp: number;
  ppg: number;
  rpg: number;
  apg: number;
  pts: number;
  titles: number;
  mvp: number;
  allStar: number;
  peakOvr: number;
  legacyScore: number;
  tier: string;
  hof: number;
  endedAt: number;
  /** Older records have no challenge. */
  challenge?: string;
  challengeDone?: boolean;
}

export function careerHistory(): CareerRecord[] {
  return read<CareerRecord[]>(KEY_HISTORY, []);
}

function recordHistory(c: Career) {
  const u = userOf(c);
  const r = c.retirement!;
  const a = averages(r.totals);
  const pro = c.seasons.filter((s) => s.stats.gp > 0);
  const rec: CareerRecord = {
    id: c.id,
    name: fullName(u),
    nat: u.nat,
    pos: u.pos,
    from: c.seasons[0]?.season ?? r.season,
    to: c.seasons[c.seasons.length - 1]?.season ?? r.season,
    age: r.age,
    seasons: new Set(pro.map((s) => s.season)).size,
    teams: [...new Set(pro.map((s) => s.teamName))],
    gp: r.totals.gp,
    ppg: a.ppg,
    rpg: a.rpg,
    apg: a.apg,
    pts: r.totals.pts,
    titles: r.titles,
    mvp: r.awards.mvp ?? 0,
    allStar: r.awards.allStar ?? 0,
    peakOvr: r.peakOvr,
    legacyScore: r.legacyScore,
    tier: r.tier,
    hof: r.hofProbability,
    challenge: challengeOf(c).label,
    challengeDone: challengeDone(c),
    endedAt: careerHistory().find((h) => h.id === c.id)?.endedAt ?? Date.now(),
  };
  write(KEY_HISTORY, [...careerHistory().filter((h) => h.id !== c.id), rec]);
}

export function clearHistory() {
  write(KEY_HISTORY, []);
}

export function globalAchievements(): string[] {
  return read<string[]>(KEY_ACH, []);
}
function mergeAchievements(ids: string[]) {
  const cur = new Set(globalAchievements());
  let changed = false;
  for (const id of ids) if (!cur.has(id)) { cur.add(id); changed = true; }
  if (changed) write(KEY_ACH, [...cur]);
}


export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS, {}) };
}
export function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(s.textScale));
  root.dataset.contrast = s.contrast;
  if (s.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = s.motion;
}

export function resetAllData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('nbalegacy:')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// ---------- Global store ----------
// structuredClone is missing on older phones (iOS < 15.4); careers are plain JSON, so this fallback is exact.
const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

interface State {
  career: Career | null;
  busy: string | null;
  /** Live simulation in progress (non-blocking): label shown in the career screen. */
  sim: string | null;
  toasts: { id: number; text: string }[];
  settings: Settings;
  saveError: boolean;
}

let state: State = { career: null, busy: null, sim: null, toasts: [], settings: getSettings(), saveError: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

let pendingSave: Career | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  if (!pendingSave) return;
  const ok = saveCareer(pendingSave);
  pendingSave = null;
  if (ok === state.saveError) set({ saveError: !ok });
}
function scheduleSave(c: Career) {
  pendingSave = c;
  if (!saveTimer) saveTimer = setTimeout(flushSave, 60);
}
// Never lose the last action when the tab is closed or the app goes to the background.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushSave());
}

export const store = {
  get: () => state,
  /** Writes any pending save now (before reading the saved history). */
  flush: flushSave,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setCareer(c: Career | null, persist = true) {
    set({ career: c });
    // Save right after the screen updates: serialising the ~600 KB career costs a phone tens of ms per tap.
    if (c && persist) scheduleSave(c);
    else pendingSave = null;
  },
  /** Applies an engine action to a clone of the career, then saves. */
  act(fn: (c: Career) => void) {
    if (!state.career) return;
    const c = clone(state.career);
    fn(c);
    store.setCareer(c);
  },
  /** Same as act, but shows a loading overlay and yields to the browser first (long simulations). */
  actAsync(label: string, fn: (c: Career) => void): Promise<void> {
    set({ busy: label });
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          store.act(fn);
        } finally {
          set({ busy: null });
          resolve();
        }
      }, 30);
    });
  },
  /**
   * Applies `fn` (optional) and then keeps calling `step` (one slice of simulation) until it returns
   * true, publishing the intermediate state so the screen can animate. Saves once at the end.
   */
  async actLive(label: string, step: (c: Career) => boolean, fn?: (c: Career) => void) {
    if (!state.career || state.sim) return;
    // One deep copy up front; each slice then mutates it and publishes a shallow copy so React re-renders.
    // (Deep-copying the ~600 KB league every slice made phones stutter.)
    const c = clone(state.career);
    fn?.(c);
    set({ sim: label, career: { ...c } });
    const frame = () => new Promise((r) => setTimeout(r, 30));
    try {
      for (let i = 0; i < 400; i++) {
        await frame();
        const done = step(c);
        set({ career: { ...c } });
        if (done) break;
      }
    } finally {
      store.setCareer(c);
      set({ sim: null });
    }
  },
  toast(text: string) {
    const id = Date.now() + Math.random();
    set({ toasts: [...state.toasts, { id, text }] });
    setTimeout(() => set({ toasts: state.toasts.filter((t) => t.id !== id) }), 3800);
  },
  setSettings(s: Settings) {
    write(KEY_SETTINGS, s);
    applySettings(s);
    set({ settings: s });
  },
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()));
}

export function useCareer(): Career | null {
  return useStore((s) => s.career);
}
