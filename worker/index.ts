/// <reference types="@cloudflare/workers-types" />
/**
 * API de Anillero (Cloudflare Worker + D1).
 *
 * Sirve también los estáticos: si la ruta no empieza por /api ni /c, se delega
 * en el binding ASSETS, que es el build de Vite en dist/.
 */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

const hoy = () => new Date().toISOString().slice(0, 10);

/** Semilla del día: la misma para todos, calculada en servidor. */
export function seedDelDia(day: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < day.length; i += 1) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

interface ResultadoDiario {
  deviceId?: string;
  day?: string;
  goalId?: string;
  done?: boolean;
  progressA?: number;
  progressB?: number;
  legacyScore?: number;
}

async function resultadoDiario(env: Env, body: ResultadoDiario) {
  const deviceId = (body.deviceId || '').slice(0, 64);
  const day = (body.day || hoy()).slice(0, 10);
  if (!deviceId) return json({ error: 'deviceId requerido' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'day inválido' }, 400);

  const goalId = (body.goalId || '').slice(0, 40);
  const done = body.done ? 1 : 0;
  const a = Number.isFinite(body.progressA) ? Number(body.progressA) : 0;
  const b = Number.isFinite(body.progressB) ? Number(body.progressB) : 0;
  const score = Number.isFinite(body.legacyScore) ? Math.round(Number(body.legacyScore)) : 0;

  // idempotente por (día, jugador): repetir el reto no infla la racha
  const previo = await env.DB.prepare('SELECT done FROM daily_results WHERE day = ? AND player_id = ?')
    .bind(day, deviceId)
    .first<{ done: number }>();

  await env.DB.prepare(
    `INSERT INTO daily_results (day, player_id, goal_id, done, progress_a, progress_b, legacy_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day, player_id) DO UPDATE SET
       done = MAX(daily_results.done, excluded.done),
       progress_a = MAX(daily_results.progress_a, excluded.progress_a),
       progress_b = MAX(daily_results.progress_b, excluded.progress_b),
       legacy_score = MAX(daily_results.legacy_score, excluded.legacy_score)`,
  ).bind(day, deviceId, goalId, done, a, b, score, Date.now()).run();

  // racha: solo suma la primera vez que se cumple el día y venía de ayer
  const streakRow = await env.DB.prepare('SELECT streak, best, last_day FROM daily_streaks WHERE player_id = ?')
    .bind(deviceId)
    .first<{ streak: number; best: number; last_day: string }>();

  let streak = streakRow?.streak ?? 0;
  let best = streakRow?.best ?? 0;
  const lastDay = streakRow?.last_day ?? '';

  if (!previo && done) {
    const ayer = new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    streak = lastDay === ayer ? streak + 1 : 1;
    best = Math.max(best, streak);
  } else if (!previo && !done) {
    streak = 0;
  }

  await env.DB.prepare(
    `INSERT INTO daily_streaks (player_id, streak, best, last_day) VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET streak = excluded.streak, best = excluded.best, last_day = excluded.last_day`,
  ).bind(deviceId, streak, best, day).run();

  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM daily_results WHERE day = ? AND done = 1')
    .bind(day)
    .first<{ n: number }>();

  return json({ ok: true, day, done: Boolean(done), streak, best, completadosHoy: total?.n ?? 0 });
}

async function hoyInfo(env: Env, day: string) {
  const fila = await env.DB.prepare(
    'SELECT COUNT(*) AS jugados, SUM(done) AS completados FROM daily_results WHERE day = ?',
  )
    .bind(day)
    .first<{ jugados: number; completados: number | null }>();

  return json({
    day,
    seed: seedDelDia(day),
    jugados: fila?.jugados ?? 0,
    completados: fila?.completados ?? 0,
  });
}

async function ranking(env: Env, day: string) {
  const { results } = await env.DB.prepare(
    `SELECT player_id AS deviceId, legacy_score AS legacyScore, done, goal_id AS goalId
       FROM daily_results
      WHERE day = ?
      ORDER BY legacy_score DESC, created_at ASC
      LIMIT 50`,
  )
    .bind(day)
    .all();
  return json({ day, ranking: results ?? [] });
}

async function statsGlobales(env: Env) {
  const [
    totalCarreras,
    totalJugadores,
    totalResultadosDiarios,
    totalCompletados,
    totalStreaks,
    topStreak,
  ] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM careers').first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM players').first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM daily_results').first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM daily_results WHERE done = 1').first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM daily_streaks WHERE streak > 0').first<{ n: number }>(),
    env.DB.prepare('SELECT MAX(streak) AS n FROM daily_streaks').first<{ n: number }>(),
  ]);
  return json({
    totalCarreras: totalCarreras?.n ?? 0,
    totalJugadores: totalJugadores?.n ?? 0,
    totalResultadosDiarios: totalResultadosDiarios?.n ?? 0,
    totalCompletados: totalCompletados?.n ?? 0,
    jugadoresConRacha: totalStreaks?.n ?? 0,
    mejorRacha: topStreak?.n ?? 0,
  });
}

interface CuerpoCarrera {
  deviceId?: string;
  seed?: number;
  legacyScore?: number;
  titles?: number;
  tier?: string;
  payload?: unknown;
}

async function guardarCarrera(env: Env, body: CuerpoCarrera) {
  const deviceId = (body.deviceId || '').slice(0, 64);
  if (!deviceId) return json({ error: 'deviceId requerido' }, 400);

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const payload = JSON.stringify(body.payload ?? {}).slice(0, 200000);

  await env.DB.prepare(
    `INSERT INTO careers (id, player_id, seed, created_at, finished_at, legacy_score, titles, tier, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    deviceId,
    Number(body.seed ?? 0),
    Date.now(),
    Date.now(),
    Number(body.legacyScore ?? 0),
    Number(body.titles ?? 0),
    String(body.tier ?? '').slice(0, 40),
    payload,
  ).run();

  return json({ ok: true, id });
}

async function leerCarrera(env: Env, id: string) {
  const row = await env.DB.prepare('SELECT * FROM careers WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'no encontrada' }, 404);
  return json({ career: row });
}

/** Página pública de una carrera, con Open Graph para que el enlace se vea bien. */
async function paginaCarrera(env: Env, id: string) {
  const row = await env.DB.prepare('SELECT * FROM careers WHERE id = ?').bind(id).first<{
    legacy_score: number; titles: number; tier: string;
  }>();
  if (!row) return new Response('Carrera no encontrada', { status: 404 });

  const titulo = `Carrera con ${row.titles} anillo(s) · Legacy ${row.legacy_score}`;
  const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} | Anillero</title>
<meta name="description" content="${row.tier || 'Carrera'} · ${row.titles} anillos · Legacy Score ${row.legacy_score}">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="¿Puedes superarlo? Juega gratis en Anillero.">
<meta property="og:image" content="https://anillero.com/og/anillero-1200x630.png">
<meta name="twitter:card" content="summary_large_image">
<style>body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}
a{display:inline-block;margin-top:18px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}</style>
</head><body><main>
<h1>${row.tier || 'Carrera'}</h1>
<p>${row.titles} anillo(s) · Legacy Score <b>${row.legacy_score}</b></p>
<a href="/play">Juega tu propia carrera</a>
</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    }

    if (path.startsWith('/api/')) {
      try {
        if (path === '/api/health') return json({ ok: true, ts: Date.now() });

        if (path === '/api/daily/today' && request.method === 'GET') {
          return hoyInfo(env, url.searchParams.get('day') || hoy());
        }

        if (path === '/api/daily/result' && request.method === 'POST') {
          return resultadoDiario(env, (await request.json()) as ResultadoDiario);
        }

        if (path === '/api/daily/leaderboard' && request.method === 'GET') {
          return ranking(env, url.searchParams.get('day') || hoy());
        }

        if (path === '/api/stats' && request.method === 'GET') {
          return statsGlobales(env);
        }

        if (path === '/api/career' && request.method === 'POST') {
          return guardarCarrera(env, (await request.json()) as CuerpoCarrera);
        }

        const m = /^\/api\/career\/([a-z0-9]{6,32})$/i.exec(path);
        if (m && request.method === 'GET') return leerCarrera(env, m[1]);

        return json({ error: 'ruta no encontrada' }, 404);
      } catch (e) {
        return json({ error: 'error interno', detail: String(e).slice(0, 200) }, 500);
      }
    }

    const c = /^\/c\/([a-z0-9]{6,32})$/i.exec(path);
    if (c) return paginaCarrera(env, c[1]);

    return env.ASSETS.fetch(request);
  },
};
