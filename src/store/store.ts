import { useSyncExternalStore } from 'react';
import type { Career } from '../engine/types';
import { SAVE_VERSION, userOf } from '../engine/career';
import { fullName } from '../engine/players';
import { teamName } from '../engine/league';
import { seasonLabel } from '../engine/schedule';

// ---------- Persistence ----------
const KEY_INDEX = 'nbalegacy:slots';
const KEY_SAVE = (id: string) => `nbalegacy:save:${id}`;
const KEY_ACH = 'nbalegacy:achievements';
const KEY_DAILY = 'nbalegacy:daily';
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
  const ok = write(KEY_SAVE(c.id), c);
  const idx = listSlots().filter((s) => s.id !== c.id);
  idx.push(metaFor(c));
  write(KEY_INDEX, idx);
  write(KEY_LAST, c.id);
  mergeAchievements(c.achievements);
  if (c.mode === 'daily' && c.dailyKey && c.retirement) recordDaily(c.dailyKey, c.retirement.legacyScore, fullName(userOf(c)));
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

export function exportCareer(c: Career) {
  const blob = new Blob([JSON.stringify(c)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nba-legacy-${fullName(userOf(c)).replace(/\s+/g, '-').toLowerCase()}-${seasonLabel(c.league.season)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function importCareer(text: string): Career {
  const c = JSON.parse(text) as Career;
  if (!c || typeof c !== 'object' || !c.league || !c.userId || c.version !== SAVE_VERSION) throw new Error('Archivo de partida no válido o de otra versión.');
  return c;
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

export interface DailyRecord { key: string; best: number; name: string; at: number }
export function dailyRecords(): Record<string, DailyRecord> {
  return read<Record<string, DailyRecord>>(KEY_DAILY, {});
}
function recordDaily(key: string, score: number, name: string) {
  const all = dailyRecords();
  if (!all[key] || all[key].best < score) {
    all[key] = { key, best: score, name, at: Date.now() };
    write(KEY_DAILY, all);
  }
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
interface State {
  career: Career | null;
  busy: string | null;
  toasts: { id: number; text: string }[];
  settings: Settings;
  saveError: boolean;
}

let state: State = { career: null, busy: null, toasts: [], settings: getSettings(), saveError: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

export const store = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setCareer(c: Career | null, persist = true) {
    if (c && persist) {
      const ok = saveCareer(c);
      set({ career: c, saveError: !ok });
    } else set({ career: c });
  },
  /** Applies an engine action to a clone of the career, then saves. */
  act(fn: (c: Career) => void) {
    if (!state.career) return;
    const c = structuredClone(state.career);
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
