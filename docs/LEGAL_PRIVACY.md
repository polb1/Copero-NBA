# Política de Privacidad · Anillero

**Última actualización:** 8 de noviembre de 2026

## 1. Responsable
Anillero ("nosotros", "nuestro") — proyecto independiente sin afiliación con la NBA. Contacto: ver aviso legal.

## 2. Qué datos recogemos y por qué

| Dato | Origen | Finalidad | Base legal |
|------|--------|-----------|------------|
| **deviceId** (UUID v4 anónimo) | Generado en tu navegador (localStorage) | Identificar tu partida para guardar progreso, rachas diarias, ranking y carreras terminadas | Interés legítimo (funcionamiento del juego) |
| **resultados del reto diario** | Enviados por el cliente a `/api/daily/result` | Ranking diario, cálculo de racha, estadísticas globales anónimas | Interés legítimo |
| **carreras guardadas** | Enviadas por el cliente a `/api/career` | Página compartible `/c/<id>`, Open Graph, historial personal | Interés legítimo / consentimiento (al guardar) |
| **nickname (opcional)** | Introducido por ti al crear carrera | Se muestra en tu tarjeta de carrera y ranking | Consentimiento |
| **país (opcional)** | Seleccionado al crear jugador | Solo para simulación (bandera, nombre de club) | Consentimiento |

**No recogemos**: nombre real, email, IP (Cloudflare la ve pero no la almacenamos en D1), datos de pago, contactos, ubicación precisa, identificadores publicitarios.

## 3. Cómo se almacenan
- Base de datos **Cloudflare D1 (SQLite gestionado)** en nuestra cuenta.
- `deviceId` = clave primaria anónima. No hay tabla de "usuarios" con datos personales.
- Retención: resultados diarios 2 años; carreras guardadas indefinidamente mientras exista el proyecto (puedes pedir borrado).

## 4. Compartir datos
- **No vendemos ni alquilamos** datos a terceros.
- **No usamos redes publicitarias** (ni Google AdSense en builds de portal, ni trackers de terceros).
- **Cloudflare** procesa tráfico como CDN/WAF y provee Web Analytics (beacon sin cookies, sin IP almacenada). Ver su política: https://www.cloudflare.com/privacypolicy/
- Si compartes tu carrera (`/c/<id>`), la página es pública: cualquiera con el enlace ve tu nickname, anillos, legacy score y logros.

## 5. Tus derechos (RGPD / CCPA)
- **Acceso / portabilidad**: escríbenos y te damos un JSON con tus filas (deviceId, resultados, carreras).
- **Rectificación**: cambia tu nickname en la siguiente carrera.
- **Supresión**: podemos borrar tu `deviceId` y datos asociados (pierdes racha, ranking e historial).
- **Oposición / limitación**: juega en modo incógnito (localStorage no persiste) o no envíes resultados.
- Ejercicio: contacto en aviso legal. Respuesta ≤ 30 días.

## 6. Transferencias internacionales
Cloudflare D1 aloja datos en EE. UU. (cláusulas contractuales tipo + marco UE-EE. UU. DPF). No hay más transferencias.

## 7. Menores
El juego no está dirigido a menores de 13 años. No recogemos datos de menores a sabiendas. Si detectamos uno, borramos sus datos.

## 8. Cambios
Publicaremos versión nueva aquí con fecha. Cambios materiales: aviso en la web 14 días antes.

---

# Privacy Policy · Anillero

**Last updated:** November 8, 2026

## 1. Controller
Anillero ("we", "our") — independent project, not affiliated with the NBA. Contact: see Legal Notice.

## 2. What data we collect and why

| Data | Source | Purpose | Legal basis |
|------|--------|---------|-------------|
| **deviceId** (UUID v4, anonymous) | Generated in your browser (localStorage) | Identify your session to save progress, daily streaks, leaderboard, finished careers | Legitimate interest (game functionality) |
| **daily challenge results** | Sent by client to `/api/daily/result` | Daily leaderboard, streak calculation, anonymous global stats | Legitimate interest |
| **saved careers** | Sent by client to `/api/career` | Shareable page `/c/<id>`, Open Graph, personal history | Legitimate interest / consent (on save) |
| **nickname (optional)** | Entered by you when creating career | Shown on your career card and leaderboard | Consent |
| **country (optional)** | Selected when creating player | Simulation only (flag, club name) | Consent |

**We do NOT collect**: real name, email, IP (Cloudflare sees it but we don't store it in D1), payment data, contacts, precise location, advertising IDs.

## 3. Storage
- **Cloudflare D1 (managed SQLite)** in our account.
- `deviceId` = anonymous primary key. No "users" table with personal data.
- Retention: daily results 2 years; saved careers indefinitely while project exists (deletion on request).

## 4. Sharing
- **We do not sell or rent** data to third parties.
- **No ad networks** (no Google AdSense on portal builds, no third-party trackers).
- **Cloudflare** processes traffic as CDN/WAF and provides Web Analytics (cookie-less beacon, no stored IP). Their policy: https://www.cloudflare.com/privacypolicy/
- If you share a career (`/c/<id>`), the page is public: anyone with the link sees your nickname, rings, legacy score, achievements.

## 5. Your rights (GDPR / CCPA)
- **Access / portability**: email us, we'll send a JSON with your rows (deviceId, results, careers).
- **Rectification**: change nickname on next career.
- **Erasure**: we can delete your `deviceId` and associated data (you lose streak, leaderboard, history).
- **Objection / restriction**: play in incognito (localStorage doesn't persist) or don't submit results.
- Exercise: contact in Legal Notice. Response ≤ 30 days.

## 6. International transfers
Cloudflare D1 hosts data in the US (SCCs + EU-US DPF). No further transfers.

## 7. Children
Not directed to children under 13. We don't knowingly collect children's data. If detected, we delete it.

## 8. Changes
New version published here with date. Material changes: 14-day notice on the site.