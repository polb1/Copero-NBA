import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { createDb } from './db';
import * as schema from './db/schema';
import { eq } from 'drizzle-orm';
import type { Env } from './types';
import type { ContextVariableMap } from 'hono';

// Extend Hono's Context to include auth and db
declare module 'hono' {
  interface ContextVariableMap {
    auth: ReturnType<typeof createAuth>;
    db: ReturnType<typeof createDb>;
    user: { id: string; email: string; emailVerified: boolean } | null;
    session: { id: string; userId: string; expiresAt: number } | null;
  }
}

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: ContextVariableMap }>();

  // CORS for API routes
  app.use('/api/*', cors({
    origin: ['https://anillero.com', 'https://pre.anillero.com', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Auth instance cache (singleton per worker instance)
  let authInstance: ReturnType<typeof createAuth> | null = null;

  function getAuth(env: Env) {
    if (!authInstance) {
      authInstance = createAuth(env);
    }
    return authInstance;
  }

  // Inject auth and db into context
  app.use('/api/*', async (c, next) => {
    const auth = getAuth(c.env);
    const db = createDb(c.env.DB);
    c.set('auth', auth);
    c.set('db', db);

    // Try to get session from cookie
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        c.set('user', session.user);
        c.set('session', {
          id: session.session.id,
          userId: session.session.userId,
          expiresAt: session.session.expiresAt.getTime(),
        });
      }
    } catch (error) {
      console.error('Session error:', error);
    }

    await next();
  });

  // Health check
  app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

  // Mount Better Auth routes
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
    const auth = c.get('auth');
    try {
      const response = await auth.handler(c.req.raw);
      return response;
    } catch (error) {
      console.error('Auth handler error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
      return c.json({ error: 'Auth handler error', detail: String(error), stack: error instanceof Error ? error.stack : undefined }, 500);
    }
  });

  // Protected routes middleware
  const requireAuth = async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'No autorizado' }, 401);
    }
    await next();
  };

  // Current user info
  app.get('/api/me', requireAuth, async (c) => {
    const user = c.get('user')!;
    return c.json({ user });
  });

  // Claim guest data
  app.post('/api/me/claim-guest', requireAuth, async (c) => {
    const db = c.get('db');
    const user = c.get('user')!;
    
    const body = await c.req.json();
    const { guestId } = body;
    
    if (!guestId) {
      return c.json({ error: 'guestId requerido' }, 400);
    }

    const guest = await db.query.guest.findFirst({
      where: (g, { eq }) => eq(g.id, guestId),
    });

    if (!guest) {
      return c.json({ error: 'Datos de invitado no encontrados' }, 404);
    }

    if (guest.claimedBy) {
      return c.json({ error: 'Datos ya reclamados' }, 400);
    }

    // TODO: Migrate careers, streaks, etc. to user
    // This should be done in a transaction
    
    // Mark guest as claimed
    await db.update(schema.guest)
      .set({ claimedBy: user.id, claimedAt: new Date() })
      .where(eq(schema.guest.id, guestId));

    return c.json({ ok: true, migrated: true });
  });

  // Existing API routes (placeholders - to be migrated from worker/index.ts)
  app.get('/api/daily/today', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  app.post('/api/daily/result', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  app.get('/api/daily/leaderboard', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  app.get('/api/stats', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  app.post('/api/career', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  app.get('/api/career/:id', async (c) => {
    return c.json({ ok: true, message: 'Migrating...' });
  });

  // Career share page /c/:id
  app.get('/c/:id', async (c) => {
    return c.text('Migrating...', 200);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;