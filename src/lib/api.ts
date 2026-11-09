// Cliente de la API de Anillero. Todo es opcional: si el backend no responde,
// el juego sigue funcionando con el estado local (localStorage).

const KEY = 'anillero.device.v1';

/** Identificador anónimo del dispositivo. No contiene datos personales. */
export function deviceId(): string {
  try {
    const existente = localStorage.getItem(KEY);
    if (existente) return existente;
    const nuevo = (crypto.randomUUID?.() ?? `d${Date.now()}${Math.random().toString(16).slice(2)}`).replace(/-/g, '').slice(0, 32);
    localStorage.setItem(KEY, nuevo);
    return nuevo;
  } catch {
    return 'anon';
  }
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export interface DailyResultResponse {
  ok: boolean;
  day: string;
  done: boolean;
  streak: number;
  best: number;
  completadosHoy: number;
}

export function enviarResultadoDiario(datos: {
  day: string;
  goalId: string;
  done: boolean;
  progressA: number;
  progressB: number;
  legacyScore: number;
}): Promise<DailyResultResponse | null> {
  const id = deviceId();
  // No enviar en modo privado/incógnito (deviceId fallback) (audit #17)
  if (id === 'anon') return Promise.resolve(null);
  return post<DailyResultResponse>('/api/daily/result', { deviceId: id, ...datos });
}

export interface FilaRanking {
  deviceId: string;
  legacyScore: number;
  done: number;
  goalId: string;
}

export function rankingDelDia(day: string): Promise<{ day: string; ranking: FilaRanking[] } | null> {
  return get(`/api/daily/leaderboard?day=${encodeURIComponent(day)}`);
}

export function infoDelDia(day: string): Promise<{ day: string; seed: number; jugados: number; completados: number } | null> {
  return get(`/api/daily/today?day=${encodeURIComponent(day)}`);
}

export function guardarCarrera(datos: {
  seed: number;
  legacyScore: number;
  titles: number;
  tier: string;
  payload: unknown;
}): Promise<{ ok: boolean; id: string } | null> {
  return post('/api/career', { deviceId: deviceId(), ...datos });
}
