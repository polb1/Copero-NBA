import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createDb } from '../db';
import type { Env } from '../types';

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  
  const authConfig: any = {
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: 'user',
        session: 'session',
        account: 'account',
        verification: 'verification',
      },
    }),
    secret: env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production', // Required for signing cookies/tokens
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Disable for now until RESEND_API_KEY is configured
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: 'lax',
        httpOnly: true,
        secure: true,
        path: '/',
      },
    },
  };

  // Only add Google OAuth if credentials are provided
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    authConfig.socialProviders = {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    };
  }

  return betterAuth(authConfig);
}

export type Auth = ReturnType<typeof createAuth>;