/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  KV: KVNamespace;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  /** Emails con acceso al Control Center, separados por comas. */
  CC_ALLOWED_EMAILS?: string;
  /** Entorno de los datos del Control Center: production | pre | local (si falta, se deduce del host). */
  CC_ENV?: string;
}