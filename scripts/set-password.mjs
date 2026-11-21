// Pone (o cambia) la contraseña de una cuenta existente en la D1 remota.
// Útil cuando no funciona el correo de recuperación (falta RESEND_API_KEY).
// Uso:  node scripts/set-password.mjs email@ejemplo.com
// La contraseña se pide sin mostrarla y se guarda con el mismo hash que usa Better Auth.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[^@\s']+@[^@\s']+$/.test(email)) { console.error('Uso: node scripts/set-password.mjs email@ejemplo.com'); process.exit(1); }

function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let s = '';
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    // Carácter a carácter: en terminal llega uno por evento; por tubería, todo junto.
    const on = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') { process.stdin.setRawMode?.(false); process.stdin.pause(); process.stdin.off('data', on); process.stdout.write('\n'); resolve(s); return; }
        if (ch === '\u0003') process.exit(1);
        if (ch === '\u007f' || ch === '\b') s = s.slice(0, -1);
        else s += ch;
      }
    };
    process.stdin.on('data', on);
  });
}

const d1 = (sql) => JSON.parse(execSync(`npx wrangler d1 execute anillero --remote --json --command "${sql}"`, { encoding: 'utf8', env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? '608a6b7cd17fcc6554f85f0f15072794' } }))[0].results;

const user = d1(`SELECT id FROM user WHERE lower(email) = '${email}'`)[0];
if (!user) { console.error(`No existe ninguna cuenta con ${email}.`); process.exit(1); }

// NEW_PASSWORD permite usarlo sin terminal interactiva.
const pw = process.env.NEW_PASSWORD ?? await ask('Nueva contraseña (mín. 8 caracteres): ');
if (pw.length < 8) { console.error('Demasiado corta.'); process.exit(1); }
if (!process.env.NEW_PASSWORD && pw !== await ask('Repítela: ')) { console.error('No coinciden.'); process.exit(1); }

const hash = await hashPassword(pw); // formato salt:clave en hex, sin comillas
const now = Date.now();
const existing = d1(`SELECT id FROM account WHERE user_id = '${user.id}' AND provider_id = 'credential'`)[0];
d1(existing
  ? `UPDATE account SET password = '${hash}', updated_at = ${now} WHERE id = '${existing.id}'`
  : `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ('${randomUUID()}', '${user.id}', 'credential', '${user.id}', '${hash}', ${now}, ${now})`);
d1(`UPDATE user SET email_verified = 1 WHERE id = '${user.id}'`);
console.log(`Listo: ${email} ya puede entrar con email y contraseña (y sigue pudiendo con Google).`);
