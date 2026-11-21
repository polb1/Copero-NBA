# Despliegue · Control Center

> Nada de esto se ha hecho en remoto. Requiere tu autorización: migraciones en D1 remoto, variables en Cloudflare y push.

## Entornos y separación de datos

| | anillero.com | pre.anillero.com | local |
|---|---|---|---|
| Worker | `copero-x-nba` (rama `main`) | `copero-nba-pre` (rama `pre`) | `wrangler dev` |
| `env` de los datos | `production` | `pre` | `local` |

El entorno sale de la variable `CC_ENV` si existe; si no, del host: `pre.` o `-pre.` → `pre`; `localhost` → `local`; el resto → `production` (`detectEnv()` en `logic.ts`).

**Recomendado:** definir `CC_ENV` explícitamente en cada Worker (`production` y `pre`), así el entorno no depende del host.

Hoy los dos Workers comparten `wrangler.jsonc`, con un único `database_id`. Si los dos usan la misma D1, los datos siguen separados porque cada fila lleva su `env` y la API siempre filtra por él (prueba T19). Si preferís bases distintas, crea otra D1 para pre y cambia su binding en el panel del Worker de pre; el código no cambia.

## Pasos para publicar

1. **Variables** en cada Worker (*Settings → Variables and Secrets*), mejor como secret:
   - `CC_ALLOWED_EMAILS` = los emails del equipo, separados por comas.
   - `CC_ENV` = `production` o `pre`.
   Ya deben existir `BETTER_AUTH_URL` y `BETTER_AUTH_SECRET`.
2. **Migraciones** en la D1 remota:
   ```
   npx wrangler d1 migrations apply anillero --remote
   ```
   Si la base remota no tiene la tabla `d1_migrations` (las primeras se aplicaron con `d1 execute`), wrangler intentará aplicar todas. Son seguras: usan `IF NOT EXISTS`. Alternativa, solo la nueva:
   ```
   npx wrangler d1 execute anillero --remote --file=migrations/0004_control_center.sql
   ```
3. **Push** a `pre`, comprobar en pre.anillero.com, y después a `main`.
4. Entrar en `/control-center`, pulsar **Importar desde auditorías** en el Dashboard (una vez por entorno; repetirla no duplica nada).

## Comprobaciones después de publicar

```
curl -sI https://anillero.com/control-center          # 302 → /auth/login
curl -s  https://anillero.com/api/cc/me               # {"error":"No autorizado"} 401
curl -s  https://anillero.com/sitemap.xml | grep -c control-center   # 0
curl -s  https://anillero.com/robots.txt  | grep -c control-center   # 0
```
Con sesión de miembro: `X-Robots-Tag: noindex, nofollow, noarchive` en `/control-center`.

`robots.txt` no menciona el panel a propósito: un `Disallow` lo anunciaría y además impediría a Google ver el `noindex`.

## Local

```
cp .dev.vars.example .dev.vars        # y pon un BETTER_AUTH_SECRET propio
npm run db:migrate:local
npm run build
npx wrangler dev --local --port 8789  # BETTER_AUTH_URL debe coincidir con el puerto
```
En Windows el build necesita `python3` en el PATH y `PYTHONUTF8=1`. El build reescribe `public/data/hall-of-fame.json` y `player-slugs.json`: si tienes cambios propios en esos archivos, guárdalos antes.

El formulario de `/auth/login` no funciona en local (falta el token de Turnstile: «Invalid input: expected string»). Para entrar en local, regístrate y verifica el email a mano:
```
npx wrangler d1 execute anillero --local --command "UPDATE user SET email_verified = 1 WHERE email = 'tu@email'"
```
y haz el login con `POST /api/auth/sign-in/email` desde la consola del navegador en `http://localhost:8789`.

## Pruebas

```
npm test                                          # T01–T06 (y el resto del proyecto)
CC_BASE=http://localhost:8789 npm run test:cc     # T07–T20, con wrangler dev en marcha
```
