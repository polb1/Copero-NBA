import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createDb } from '../db';
import type { Env } from '../types';
import { account, session, user, verification } from '../db/schema';

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  
  const baseURL = env.BETTER_AUTH_URL || 'https://anillero.com';
  
  const authConfig: any = {
    baseURL,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      sendResetPassword: async ({ user, url, token }: { user: { email: string; name?: string }; url: string; token: string }): Promise<void> => {
        if (!env.RESEND_API_KEY) return;
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Anillero <noreply@anillero.com>',
              to: user.email,
              subject: 'Restablece tu contraseña en Anillero',
              html: `<p>Hola ${user.name},</p><p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p><p><a href="${url}">${url}</a></p><p>Este enlace expira en 1 hora. Si no has solicitado esto, ignora este email.</p>`,
            }),
          });
          if (!res.ok) {
            const error = await res.text();
            console.error(`Resend error: ${error}`);
          }
        } catch (e) {
          console.error('Resend reset password email failed:', e);
        }
      },
    },
    emailVerification: {
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url, token }: { user: { email: string; name?: string }; url: string; token: string }): Promise<void> => {
        if (!env.RESEND_API_KEY) return;
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Anillero <noreply@anillero.com>',
              to: user.email,
              subject: 'Verifica tu email en Anillero',
              html: `<p>Hola ${user.name},</p><p>Gracias por registrarte en Anillero. Haz clic en el siguiente enlace para verificar tu email:</p><p><a href="${url}">${url}</a></p><p>Si no has creado esta cuenta, ignora este email.</p>`,
            }),
          });
          if (!res.ok) {
            const error = await res.text();
            console.error(`Resend error: ${error}`);
          }
        } catch (e) {
          console.error('Resend email failed:', e);
        }
      },
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

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    authConfig.socialProviders = {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${baseURL}/api/auth/callback/google`,
      },
    };
  }

  return betterAuth(authConfig);
}

export type Auth = ReturnType<typeof createAuth>;
