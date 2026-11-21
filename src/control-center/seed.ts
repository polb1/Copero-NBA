// Importación inicial del Control Center: tareas, incidencias e hitos sacados de las auditorías.
// Reglas: nada se importa como «done»; lo que un commit dice haber arreglado entra en «review»
// (pendiente de verificar en producción). Responsable: solo sugerencia, nunca asignado.
// Revisado el 2026-11-21 contra el código de main (00ff3b4).

export type SeedTask = {
  ref: string; title: string; description: string; status: 'backlog' | 'todo' | 'review';
  priority: 'P0' | 'P1' | 'P2' | 'P3'; category: string; milestone?: string; weight: number;
  evidence: string; done_criteria: string; source: string; suggested?: string;
};
export type SeedIncident = {
  ref: string; title: string; description: string; severity: 'critica' | 'alta' | 'media' | 'baja';
  category: string; evidence: string; source: string;
};

const ROADMAP = 'docs/audit/08-prioritized-roadmap.md';
const WEB = 'auditoria-web-2026-11-20.md';
const LH = 'docs/auditoria-lighthouse-anillero-ejecucion.md';
const ENVS = 'docs/audit/12-domain-migration-and-environments.md';

export const SEED_MILESTONES = [
  { ref: 'ms-dominio', title: 'Dominio único y entornos separados', description: 'anillero.com como único host indexable; pre.anillero.com protegido y fuera de Google.', due_date: null },
  { ref: 'ms-medicion', title: 'Medición', description: 'Analítica, Search Console y embudo para decidir con datos.', due_date: null },
  { ref: 'ms-rendimiento', title: 'Rendimiento y Core Web Vitals', description: 'LCP < 2,5 s y CLS < 0,1 en campo en las plantillas principales.', due_date: null },
  { ref: 'ms-contenido', title: 'Contenido e indexación', description: 'Fichas y equipos con contenido suficiente y datos correctos.', due_date: null },
  { ref: 'ms-crecimiento', title: 'Distribución y crecimiento', description: 'Tarjeta compartible, retos y presencia en directorios.', due_date: null },
  { ref: 'ms-calidad', title: 'Calidad y seguridad', description: 'CI, dependencias, cabeceras y partidas sin pérdidas.', due_date: null },
] as const;

export const SEED_TASKS: SeedTask[] = [
  {
    ref: 'G1', title: 'SITE_URL por entorno en el build (canonical, hreflang, OG, sitemap, robots)', status: 'review', priority: 'P0', category: 'SEO', milestone: 'ms-dominio', weight: 5,
    description: 'El canonical apuntaba a nba.polb.dev. Hoy scripts/site.mjs deduce el entorno de WORKERS_CI_BRANCH / SITE_URL; falta comprobarlo en producción.',
    evidence: `${ROADMAP} (G1, prioridad 25). ${ENVS} §2: scripts/gen-pages.mjs:5 (SITE) fijo. En main existe scripts/site.mjs con siteConfig().`,
    done_criteria: '`curl -s https://anillero.com/ | grep canonical` devuelve https://anillero.com/. Sitemap y robots de producción solo con anillero.com. Search Console elige anillero.com como canónica.',
    source: ROADMAP,
  },
  {
    ref: 'G2', title: 'Cloudflare Web Analytics solo en producción', status: 'review', priority: 'P1', category: 'Marketing', milestone: 'ms-medicion', weight: 4,
    description: 'El beacon se inyecta solo si el entorno es producción (scripts/site.mjs). Falta ver datos en el panel.',
    evidence: `${ROADMAP} (G2). scripts/site.mjs:24-25 inyecta el beacon de Cloudflare solo en producción.`,
    done_criteria: 'El panel de Cloudflare Web Analytics muestra visitas de anillero.com y ninguna de pre.anillero.com.',
    source: ROADMAP,
  },
  {
    ref: 'G3', title: 'Search Console de dominio anillero.com y envío del sitemap', status: 'backlog', priority: 'P1', category: 'SEO', milestone: 'ms-medicion', weight: 4,
    description: 'Sin datos orgánicos. Incluye el «Cambio de dirección» desde nba.polb.dev.',
    evidence: `${ROADMAP} (G3, depende de G1). docs/audit/11-quick-wins.md «En una semana» punto 2.`,
    done_criteria: 'Propiedad de dominio verificada, sitemap enviado sin errores y cambio de dirección solicitado.',
    source: ROADMAP,
  },
  {
    ref: 'G4', title: '301 de nba.polb.dev, pre-nba.polb.dev y *.workers.dev a anillero.com', status: 'backlog', priority: 'P0', category: 'Seguridad/infra', milestone: 'ms-dominio', weight: 5,
    description: 'Seis hosts sirven el mismo contenido. Se hace en el panel de Cloudflare (cuenta personal para polb.dev).',
    evidence: `${ROADMAP} (G4). ${ENVS} §1: tabla de hosts con nba.polb.dev, pre-nba.polb.dev y copero-nba-pre.anillero-project.workers.dev respondiendo 200.`,
    done_criteria: '`curl -I` de cada host antiguo devuelve 301 a https://anillero.com conservando la ruta; las URLs workers.dev desactivadas.',
    source: ROADMAP,
  },
  {
    ref: 'G5', title: 'Proteger pre.anillero.com con Cloudflare Access y noindex', status: 'backlog', priority: 'P0', category: 'Seguridad/infra', milestone: 'ms-dominio', weight: 4,
    description: 'Pre es pública. El build de pre ya emite _headers con X-Robots-Tag; Access se configura en Zero Trust.',
    evidence: `${ROADMAP} (G5). ${ENVS} §1: pre.anillero.com «index, follow». scripts/site.mjs:138 genera _headers con noindex en pre.`,
    done_criteria: '`curl -I https://pre.anillero.com/` devuelve 302 a Access o `X-Robots-Tag: noindex`. pre no aparece en `site:pre.anillero.com`.',
    source: ROADMAP,
  },
  {
    ref: 'G6', title: '«Always Use HTTPS», HSTS y www → raíz', status: 'backlog', priority: 'P1', category: 'Seguridad/infra', milestone: 'ms-dominio', weight: 2,
    description: 'http://anillero.com responde 200 y www no resuelve. HSTS ya está en public/_headers; falta el panel.',
    evidence: `${ROADMAP} (G6). ${WEB} E7 (curl http://anillero.com/ → 200) y M13 (www no resuelve). ${LH}: «Cloudflare: activar Always Use HTTPS (lo haces tú)».`,
    done_criteria: '`curl -I http://anillero.com/` → 301 a https. `curl -I https://www.anillero.com/` → 301 a https://anillero.com/.',
    source: ROADMAP,
  },
  {
    ref: 'G7', title: 'URL y CTA en la tarjeta PNG compartida', status: 'backlog', priority: 'P2', category: 'Marketing', milestone: 'ms-crecimiento', weight: 4,
    description: 'Las tarjetas que se comparten no traen visitas porque no llevan la dirección.',
    evidence: `${ROADMAP} (G7, prioridad 12).`,
    done_criteria: 'La tarjeta generada muestra anillero.com y un CTA; las visitas con utm_source=card aparecen en la analítica.',
    source: ROADMAP,
  },
  {
    ref: 'G8', title: 'CI en GitHub Actions (typecheck, test, build) y main protegida', status: 'backlog', priority: 'P1', category: 'Desarrollo', milestone: 'ms-calidad', weight: 3,
    description: 'Hoy se publica en producción sin pasar tests. No existe .github/workflows.',
    evidence: `${ROADMAP} (G8). Comprobado el 2026-11-21: el repo no tiene .github/workflows.`,
    done_criteria: 'Workflow que ejecuta npm run typecheck, npm test y npm run build en cada PR; main exige el check en verde.',
    source: ROADMAP,
  },
  {
    ref: 'G9', title: 'Eventos de embudo (career_start, first_decision, career_retire, card_share)', status: 'backlog', priority: 'P2', category: 'Marketing', milestone: 'ms-medicion', weight: 4,
    description: 'La activación es desconocida.',
    evidence: `${ROADMAP} (G9, depende de G2). docs/audit/07-analytics-plan.md.`,
    done_criteria: 'Los cuatro eventos llegan a la herramienta elegida y se ve el embudo completo de una semana.',
    source: ROADMAP,
  },
  {
    ref: 'G10', title: 'Recuperar el reto diario/semanal en la UI', status: 'backlog', priority: 'P3', category: 'Desarrollo', milestone: 'ms-crecimiento', weight: 4,
    description: 'Sin motivo para volver. Las rutas /api/daily/* del Worker son marcadores («Migrating...»).',
    evidence: `${ROADMAP} (G10). src/api.ts: /api/daily/today, /api/daily/result y /api/daily/leaderboard devuelven «Migrating...».`,
    done_criteria: 'El reto del día se muestra en la UI, el resultado se guarda en D1 y el evento career_resume semanal se mide.',
    source: ROADMAP,
  },
  {
    ref: 'G11', title: 'Reto con semilla compartible (/start?seed=)', status: 'backlog', priority: 'P2', category: 'Desarrollo', milestone: 'ms-crecimiento', weight: 4,
    description: 'No hay forma de invitar a un amigo a la misma partida.',
    evidence: `${ROADMAP} (G11).`,
    done_criteria: 'Un enlace con ?seed= reproduce la misma carrera inicial en otro navegador.',
    source: ROADMAP,
  },
  {
    ref: 'G12', title: 'Propuesta de valor en la cabecera', status: 'backlog', priority: 'P2', category: 'Diseño/UX', milestone: 'ms-crecimiento', weight: 3,
    description: '«Gratis · sin registro · plantillas reales 2026-27». El valor no queda claro al entrar.',
    evidence: `${ROADMAP} (G12). docs/audit/11-quick-wins.md «En una semana» punto 4.`,
    done_criteria: 'La línea aparece en la pantalla de creación en ES, EN y CA, y se mide el % de career_start antes y después.',
    source: ROADMAP,
  },
  {
    ref: 'G13', title: 'Dividir el bundle del simulador (plantillas y motor bajo demanda)', status: 'backlog', priority: 'P2', category: 'Rendimiento', milestone: 'ms-rendimiento', weight: 3,
    description: 'El CLS del simulador ya bajó a 0 (commit 00ff3b4); queda el TBT móvil de 1-1,8 s por la carga del motor. No tocar la lógica del simulador sin autorización.',
    evidence: `${ROADMAP} (G13). ${LH} «Corrección del CLS del simulador»: CLS 2.00→0 en /en; «En móvil queda el TBT alto (1–1,8 s)».`,
    done_criteria: 'TBT móvil < 600 ms en /en, /ca y /start (mediana de 3 pasadas Lighthouse) sin cambios en el comportamiento del juego.',
    source: ROADMAP,
  },
  {
    ref: 'G14', title: 'Imagen OG de 1200×630 por idioma', status: 'backlog', priority: 'P2', category: 'Diseño/UX', milestone: 'ms-crecimiento', weight: 3,
    description: 'La vista previa al compartir el enlace es pobre. También faltan og:image en /legal/* (M7).',
    evidence: `${ROADMAP} (G14). ${WEB} M7.`,
    done_criteria: 'Cada idioma tiene su og:image de 1200×630 y el depurador de Facebook/LinkedIn la muestra.',
    source: ROADMAP,
  },
  {
    ref: 'G15', title: 'Hub de guías en español (draft, posiciones, Europa o NCAA)', status: 'backlog', priority: 'P3', category: 'SEO', milestone: 'ms-contenido', weight: 4,
    description: 'Poco contenido indexable propio.',
    evidence: `${ROADMAP} (G15, depende de G1 y G3).`,
    done_criteria: 'Al menos 2 guías publicadas, enlazadas desde la portada e indexadas en Search Console.',
    source: ROADMAP,
  },
  {
    ref: 'G17', title: 'Revisar páginas de privacidad y aviso legal', status: 'review', priority: 'P2', category: 'Administración', milestone: 'ms-medicion', weight: 3,
    description: 'Existen generadas por scripts/gen-legal-pages.mjs; falta revisar que cubren la analítica y AdSense actuales.',
    evidence: `${ROADMAP} (G17). ${LH}: legal/aviso-legal y legal/privacidad medidas en Lighthouse, así que existen.`,
    done_criteria: 'El texto de /legal/privacidad menciona Cloudflare Web Analytics, AdSense y las cuentas (Better Auth), y lo ha leído una persona.',
    source: ROADMAP,
  },
  {
    ref: 'G18', title: 'Decisión de marca y revisión legal del uso de «NBA» y logos', status: 'backlog', priority: 'P2', category: 'Administración', weight: 4,
    description: 'Riesgo de marca. Revisar antes de cualquier promoción grande.',
    evidence: `${ROADMAP} (G18). docs/LEGAL.md.`,
    done_criteria: 'Decisión registrada en Decisiones y, si hace falta, informe de asesoría.',
    source: ROADMAP,
  },
  {
    ref: 'G19', title: 'Migración real de partidas (migrate()) e importación del JSON', status: 'backlog', priority: 'P1', category: 'Desarrollo', milestone: 'ms-calidad', weight: 3,
    description: 'Riesgo de pérdida silenciosa de partidas al promocionar pre a main con campos nuevos.',
    evidence: `${ROADMAP} (G19). ${ENVS} §3: «al desplegar pre en producción, las partidas antiguas se cargan sin esos campos. No se ha verificado».`,
    done_criteria: 'Test que carga una partida de la versión anterior y la migra sin perder datos; importar un JSON exportado funciona.',
    source: ROADMAP,
  },
  {
    ref: 'G20', title: 'Arreglar la regex /s+/g de exportCareer', status: 'todo', priority: 'P2', category: 'Desarrollo', milestone: 'ms-calidad', weight: 1,
    description: 'Debe ser /\\s+/g: hoy sustituye la letra «s» en vez de los espacios del nombre de archivo.',
    evidence: `${ROADMAP} (G20). Comprobado el 2026-11-21: src/store/store.ts:126 usa .replace(/s+/g, '-').`,
    done_criteria: 'El archivo exportado de «Santi Aldama» se llama nba-legacy-santi-aldama-….json y hay un test.',
    source: ROADMAP,
  },
  {
    ref: 'G21', title: 'Parches de seguridad de dependencias (npm audit)', status: 'backlog', priority: 'P2', category: 'Seguridad/infra', milestone: 'ms-calidad', weight: 2,
    description: 'react-router-dom ya está en 6.30.6; queda un aviso que solo se corrige con react-router v7 (pendiente de autorización).',
    evidence: `${ROADMAP} (G21). ${LH} «Pendiente de tu autorización»: react-router v7.`,
    done_criteria: '`npm audit --omit=dev` sin vulnerabilidades altas, con build y tests en verde.',
    source: ROADMAP,
  },
  {
    ref: 'G22', title: 'Fichas en itch.io, AlternativeTo y Product Hunt', status: 'backlog', priority: 'P2', category: 'Marketing', milestone: 'ms-crecimiento', weight: 3,
    description: 'Cero enlaces externos. Hay generadores de portales en scripts/gen-portal-*.mjs.',
    evidence: `${ROADMAP} (G22).`,
    done_criteria: 'Las tres fichas publicadas con enlace a anillero.com y referidos visibles en la analítica.',
    source: ROADMAP,
  },
  {
    ref: 'G24', title: 'Repo de GitHub: descripción, homepage, topics y LICENSE', status: 'backlog', priority: 'P3', category: 'Administración', weight: 1,
    description: 'Señal y enlace gratuitos.',
    evidence: `${ROADMAP} (G24). docs/audit/11-quick-wins.md «En un día» punto 6.`,
    done_criteria: 'El repo muestra descripción, homepage https://anillero.com, topics y un archivo LICENSE.',
    source: ROADMAP,
  },
  {
    ref: 'LH-P0-1', title: 'Estudiar hidratación (hydrateRoot) de la portada', status: 'backlog', priority: 'P2', category: 'Rendimiento', milestone: 'ms-rendimiento', weight: 4,
    description: 'Riesgo alto y ganancia alta en LCP: requiere renderToString en el build con los datos. Pendiente de autorización.',
    evidence: `${LH} «Pendiente de tu autorización» P0-1. Portada móvil: LCP 8.1→6.5 s tras los bloques 0-4.`,
    done_criteria: 'Propuesta aprobada y LCP móvil de la portada < 2,5 s (mediana de 3 pasadas) sin errores de hidratación en consola.',
    source: LH,
  },
  {
    ref: 'LH-P1-1', title: 'Cargar AdSense tras load o la primera interacción', status: 'backlog', priority: 'P2', category: 'Rendimiento', milestone: 'ms-rendimiento', weight: 2,
    description: 'Anuncios automáticos en index.html y 404.html. Puede reducir algo los ingresos: decidir antes.',
    evidence: `${LH} P1-1. index.html:44 carga adsbygoogle.js con async. ${WEB} I14: la 404 carga AdSense.`,
    done_criteria: 'AdSense no aparece en 404.html y en el resto se carga tras load; decisión registrada.',
    source: LH,
  },
  {
    ref: 'LH-P1-8', title: 'CSP completa compatible con Turnstile y AdSense', status: 'backlog', priority: 'P2', category: 'Seguridad/infra', milestone: 'ms-calidad', weight: 2,
    description: 'Ahora solo hay frame-ancestors. En /auth/* la CSP bloqueaba una conexión de Turnstile (I12).',
    evidence: `${LH} P1-8. ${WEB} I12 (connect-src no permite data:).`,
    done_criteria: 'Content-Security-Policy en _headers sin errores de consola en /, /auth/login y /auth/register.',
    source: LH,
  },
  {
    ref: 'LH-TBT', title: 'Medir window.__HUB__ y el TBT de la portada en móvil', status: 'backlog', priority: 'P2', category: 'Rendimiento', milestone: 'ms-rendimiento', weight: 2,
    description: 'TBT de la portada 369→639 ms con mucha variación entre pasadas; no se puede atribuir a un cambio.',
    evidence: `${LH} «Lo que no se ha resuelto»: TBT de la portada en móvil, pendiente medir window.__HUB__ (P0-3).`,
    done_criteria: 'Traza de rendimiento guardada en docs/lighthouse/ que explica el TBT, con 5 pasadas.',
    source: LH,
  },
  {
    ref: 'LH-CHECKS', title: 'Comprobaciones pendientes: 439 URLs del sitemap en local, diff visual y pruebas del simulador', status: 'todo', priority: 'P1', category: 'Desarrollo', milestone: 'ms-calidad', weight: 2,
    description: 'Las optimizaciones de los bloques 0-4 están en main sin estas comprobaciones.',
    evidence: `${LH} «Comprobaciones aún sin hacer».`,
    done_criteria: 'Las 439 URLs devuelven 200 en wrangler dev, sin diferencias visuales inesperadas y con el simulador probado a mano.',
    source: LH,
  },
  {
    ref: 'M1', title: 'Más contenido en las fichas /jugador/*', status: 'backlog', priority: 'P2', category: 'SEO', milestone: 'ms-contenido', weight: 4,
    description: '91 palabras de media: Google suele dejarlas en «Rastreada: sin indexar».',
    evidence: `${WEB} M1 (292 fichas).`,
    done_criteria: 'Las fichas tienen trayectoria, equipos anteriores y un texto breve; media > 250 palabras.',
    source: WEB,
  },
  {
    ref: 'M2', title: 'Más contenido en las páginas /equipo/*', status: 'backlog', priority: 'P3', category: 'SEO', milestone: 'ms-contenido', weight: 3,
    description: '308 palabras de media y algunas solo 66.',
    evidence: `${WEB} M2 (112 páginas).`,
    done_criteria: 'Cada página de equipo incluye historia, palmarés, plantilla y entrenador; ninguna < 200 palabras.',
    source: WEB,
  },
  {
    ref: 'M3', title: 'Acortar títulos de más de 60 caracteres y unificar el sufijo «| Anillero»', status: 'backlog', priority: 'P3', category: 'SEO', milestone: 'ms-contenido', weight: 2,
    description: 'Incluye M4: quitar «| Anillero · Modo Carrera» de las páginas del hub.',
    evidence: `${WEB} M3 (179 títulos) y M4.`,
    done_criteria: 'Ningún título del sitemap supera 60 caracteres y todos terminan en «| Anillero».',
    source: WEB,
  },
];

export const SEED_INCIDENTS: SeedIncident[] = [
  { ref: 'E1', title: '/en y /ca redirigían a /start (noindex)', severity: 'alta', category: 'SEO', source: WEB,
    description: 'Google veía las landings como no indexables. El commit 22ce51e dice corregirlo; verificar en producción.',
    evidence: `${WEB} E1: Lighthouse /en → /start, SEO 69. Commit 22ce51e: «/en y /ca muestran la creación en su URL».` },
  { ref: 'E2', title: 'Etiqueta «Hall of Fame» falsa en fichas de jugador', severity: 'alta', category: 'SEO', source: WEB,
    description: '278 fichas decían Hall of Fame a jugadores que no lo son. Commit 22ce51e dice corregirlo; verificar.',
    evidence: `${WEB} E2: gen-player-pages.py:189 usaba retirado = actual is None.` },
  { ref: 'E3', title: 'Descripciones «en la NBA» con equipos que no son de la NBA', severity: 'media', category: 'SEO', source: WEB,
    description: 'Más de 30 fichas. Commit 22ce51e: «liga real»; verificar.',
    evidence: `${WEB} E3.` },
  { ref: 'E4', title: 'Nombres de equipo duplicados («Real Madrid Real Madrid»)', severity: 'media', category: 'SEO', source: WEB,
    description: 'Títulos y descripciones mal formados. Commit 22ce51e: «nombres de club sin repetir»; verificar.',
    evidence: `${WEB} E4.` },
  { ref: 'E5', title: '191 enlaces internos a /equipo/* que no existen', severity: 'alta', category: 'SEO', source: WEB,
    description: 'Daban 404 desde el arreglo del soft 404. Hay un paso de build nuevo (scripts/fix-team-links.mjs); verificar.',
    evidence: `${WEB} E5: comprobación de 6.606 enlaces.` },
  { ref: 'E6', title: 'Jugadores duplicados en dos URLs', severity: 'media', category: 'SEO', source: WEB,
    description: 'luka-doncic y quincy-miller con dos URLs cada uno. Commit 22ce51e: «sin jugadores duplicados»; verificar.',
    evidence: `${WEB} E6.` },
  { ref: 'E7', title: 'http://anillero.com no redirige a https', severity: 'alta', category: 'Seguridad/infra', source: WEB,
    description: 'Contenido duplicado y menos seguro. Se arregla en el panel de Cloudflare (ver tarea G6).',
    evidence: `${WEB} E7: curl http://anillero.com/ → 200.` },
  { ref: 'E8', title: '500 cacheados en tres fichas del CDN', severity: 'media', category: 'Seguridad/infra', source: WEB,
    description: 'eddie-miles, jim-brasco, sagaba-konate. Purgar caché y vigilar en el próximo deploy.',
    evidence: `${WEB} E8: con ?x=1 responden 200.` },
  { ref: 'I1', title: 'Portada: LCP móvil alto', severity: 'alta', category: 'Rendimiento', source: WEB,
    description: 'LCP 8,9 s en la auditoría; 6,5 s tras los bloques 0-4 en local. Sigue lejos de 2,5 s.',
    evidence: `${WEB} I1. ${LH}: home 58→60, LCP 8.1→6.5 s.` },
  { ref: 'I5', title: '/noticias: LCP móvil 8,9 s y CLS 0,15', severity: 'media', category: 'Rendimiento', source: WEB,
    description: 'Mismo patrón que la portada. Ejecución Lighthouse: noticias/resultados/calendario/estadísticas ≈ igual.',
    evidence: `${WEB} I5. ${LH}: «noticias / resultados / calendario / estadísticas ≈ igual (58–64)».` },
  { ref: 'I6', title: '/equipo/* en móvil: TBT de 880 ms', severity: 'baja', category: 'Rendimiento', source: WEB,
    description: 'JS pesado en el hilo principal en la plantilla de equipo (Real Madrid).',
    evidence: `${WEB} I6.` },
  { ref: 'I11', title: 'Barra final con 307 en vez de 301/308', severity: 'baja', category: 'SEO', source: WEB,
    description: '/noticias/ → /noticias con 307 temporal.',
    evidence: `${WEB} I11.` },
  { ref: 'I12', title: 'CSP bloquea Turnstile en /auth/*', severity: 'media', category: 'Seguridad/infra', source: WEB,
    description: 'connect-src no permite data:; la página nunca termina de cargar.',
    evidence: `${WEB} I12: consola del navegador.` },
  { ref: 'I14', title: 'La página 404 carga AdSense', severity: 'media', category: 'Marketing', source: WEB,
    description: 'Google no permite anuncios en páginas sin contenido.',
    evidence: `${WEB} I14.` },
  { ref: 'I15', title: '/jugadores pesa 476 KB (19.000 palabras)', severity: 'baja', category: 'SEO', source: WEB,
    description: 'Paginar o dividir por liga.',
    evidence: `${WEB} I15.` },
  { ref: 'I16', title: '/hall-of-fame/* sin JSON-LD y 109 KB de media', severity: 'baja', category: 'SEO', source: WEB,
    description: 'Paginar y añadir ItemList.',
    evidence: `${WEB} I16.` },
];
