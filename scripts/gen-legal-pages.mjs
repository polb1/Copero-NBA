// Páginas legales estáticas: aviso legal, privacidad, cookies y fuentes/licencias.
// Los datos del titular están como marcadores [PENDIENTE] a propósito: deben
// rellenarse antes de publicar (no se inventan datos fiscales).
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const SITE = 'https://anillero.com';
const UPDATED = new Date().toISOString().slice(0, 10);

const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const css = (shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || []).join('\n    ');
// Standalone page: only the analytics beacon, never the app (React would mount over #root and show its 404).
const scripts = (shell.match(/<script[^>]+cloudflareinsights[^>]*><\/script>/g) || []).join('\n    ');
const fonts = (shell.match(/<link[^>]+fonts\.googleapis[^>]*>/g) || []).join('\n    ');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const style = `<script>try{var t=localStorage.getItem("anillero-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<style>
  :root{--a-bg:var(--a-bg);--a-card:var(--a-card);--a-card2:var(--a-card2);--a-line:var(--a-line);--a-line2:var(--a-line2);--a-line3:var(--a-line3);--a-ink:var(--a-ink);--a-ink2:var(--a-ink2);--a-ink3:var(--a-ink3);--a-ink4:var(--a-ink4);--a-muted:var(--a-muted);--a-muted2:var(--a-muted2);--a-gold:var(--a-gold);--a-accent:var(--a-accent);--a-on-accent:var(--a-on-accent);--a-win:var(--a-win);--a-loss:var(--a-loss);--a-note-bg:var(--a-note-bg);--a-note-line:var(--a-note-line);--a-note-ink:var(--a-note-ink)}
  :root[data-theme="dark"]{--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}}
</style>
<style>
  h1,h2,h3{font-family:"Source Serif 4",Georgia,serif}
  body{margin:0;background:var(--a-bg);color:var(--a-ink);font-family:Inter,system-ui,sans-serif;line-height:1.65}
  main{max-width:820px;margin:0 auto;padding:40px 20px 72px}
  h1{font-size:30px;margin:0 0 6px}
  h2{font-size:18px;margin:28px 0 8px;color:var(--a-gold)}
  p,li{color:var(--a-ink3);font-size:15px}
  .upd{color:var(--a-muted2);font-size:12px;margin:0 0 24px}
  .todo{background:var(--a-note-bg);border:1px solid var(--a-note-line);color:var(--a-note-ink);padding:10px 14px;border-radius:8px;font-size:14px}
  a{color:var(--a-accent)}
  ul{padding-left:20px}
  code{background:var(--a-card);padding:2px 6px;border-radius:4px;font-size:13px}
</style>`;

const pages = [
  {
    slug: 'aviso-legal',
    title: 'Aviso legal | Anillero',
    h1: 'Aviso legal',
    body: `
      <p class="todo"><b>Pendiente de completar antes de publicar:</b> titular, NIF, domicilio y correo de contacto. No se inventan datos fiscales.</p>
      <h2>Titular del sitio</h2>
      <ul>
        <li>Denominación: <code>[TITULAR: nombre o razón social]</code></li>
        <li>NIF/CIF: <code>[NIF]</code></li>
        <li>Domicilio: <code>[DIRECCIÓN]</code></li>
        <li>Correo de contacto: <code>[EMAIL]</code></li>
      </ul>
      <h2>Objeto</h2>
      <p>Anillero es un proyecto independiente de información y simulación sobre baloncesto. <b>No está afiliado, asociado, autorizado, respaldado ni de ningún modo vinculado oficialmente con la NBA, la Euroliga, la ACB, la B.League, la Basketball Bundesliga, la Lega Basket ni con ninguna de sus franquicias o clubes.</b></p>
      <h2>Marcas y escudos</h2>
      <p>Los nombres de competiciones, clubes y jugadores se emplean con fines descriptivos e informativos (uso nominativo). Los escudos y logotipos son marcas de sus respectivos titulares y se muestran únicamente para identificar a los equipos; su uso no implica licencia ni cesión alguna. Si eres titular de una marca y quieres solicitar la retirada de un elemento, escribe a <code>[EMAIL]</code>.</p>
      <h2>Contenidos de terceros</h2>
      <p>Parte de los datos procede de fuentes públicas (ver <a href="/legal/fuentes">Fuentes y licencias</a>). Los datos se ofrecen «tal cual», sin garantía de exactitud ni de disponibilidad continua.</p>
      <h2>Responsabilidad</h2>
      <p>El titular no responde de interrupciones del servicio, errores en los datos de terceros ni del uso que se haga de la información. El simulador es ficción: los resultados que genera no son reales.</p>
      <h2>Legislación aplicable</h2>
      <p>Relación regida por la legislación española. Para consumidores, la jurisdicción será la que corresponda legalmente a su domicilio.</p>`,
  },
  {
    slug: 'privacidad',
    title: 'Política de privacidad | Anillero',
    h1: 'Política de privacidad',
    body: `
      <p class="todo"><b>Pendiente de completar:</b> identidad del responsable y correo para ejercer derechos (sección marcada).</p>
      <h2>Qué datos se tratan</h2>
      <p>La web no tiene registro ni cuentas de usuario. <b>Las partidas se guardan en el almacenamiento local de tu navegador</b> (localStorage) y no se envían a ningún servidor.</p>
      <p>El servidor puede registrar datos técnicos básicos (dirección IP, agente de usuario, páginas solicitadas) con la única finalidad de servir el contenido y prevenir abusos. La CDN (Cloudflare) actúa como encargado del tratamiento.</p>
      <h2>Finalidad y base jurídica</h2>
      <ul>
        <li>Prestar el servicio y mantener la seguridad: interés legítimo (art. 6.1.f RGPD).</li>
        <li>Estadísticas agregadas, si se activan: consentimiento (art. 6.1.a RGPD).</li>
      </ul>
      <h2>Conservación</h2>
      <p>Los registros técnicos se conservan el tiempo mínimo necesario para la seguridad del servicio.</p>
      <h2>Destinatarios</h2>
      <p>Proveedor de alojamiento/CDN (Cloudflare) y, en su caso, proveedor de analítica. No se ceden datos a terceros con fines publicitarios.</p>
      <h2>Derechos</h2>
      <p>Puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <code>[EMAIL]</code>. También puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="nofollow noopener">aepd.es</a>).</p>
      <h2>Menores</h2>
      <p>El juego no está dirigido a menores de 14 años; no se solicitan datos personales.</p>`,
  },
  {
    slug: 'cookies',
    title: 'Política de cookies | Anillero',
    h1: 'Política de cookies',
    body: `
      <h2>Qué se usa</h2>
      <p>Anillero funciona sin cookies publicitarias ni de seguimiento. Se usan únicamente:</p>
      <ul>
        <li><b>Almacenamiento técnico propio</b> (<code>localStorage</code>): guardar tu partida, ajustes de idioma y preferencias. No es una cookie y no se comparte.</li>
        <li><b>Cookies técnicas de la CDN</b> (Cloudflare): seguridad y balanceo. No identifican personalmente al usuario.</li>
      </ul>
      <h2>Analítica</h2>
      <p>Si en el futuro se activa una analítica, se hará con consentimiento previo y esta página se actualizará antes de ponerla en marcha.</p>
      <h2>Cómo borrarlas</h2>
      <p>Puedes eliminar el almacenamiento local desde los ajustes de tu navegador; al hacerlo se pierden las partidas guardadas.</p>`,
  },
  {
    slug: 'fuentes',
    title: 'Fuentes y licencias | Anillero',
    h1: 'Fuentes y licencias',
    body: `
      <h2>Datos deportivos</h2>
      <ul>
        <li><b>NBA</b>: API pública de ESPN (marcadores y clasificación). Uso informativo; no se redistribuye como base de datos propia.</li>
        <li><b>Euroliga</b>: API pública del sitio oficial de la Euroliga (resultados, calendario y clasificación).</li>
        <li><b>B.League</b>: calendario y resultados publicados en el sitio oficial de la B.League.</li>
        <li><b>Liga ACB</b>: resultados y calendario del sitio oficial de la ACB; clasificación obtenida con un proveedor de datos (Apify) bajo sus términos.</li>
        <li><b>Otras ligas</b>: TheSportsDB (resultados puntuales).</li>
      </ul>
      <h2>Contenido histórico</h2>
      <p>La lista de campeones de la NBA y el ranking de franquicias proceden de <a href="https://en.wikipedia.org/wiki/List_of_NBA_champions" rel="nofollow noopener">Wikipedia</a>, publicada bajo licencia <b>Creative Commons Atribución-CompartirIgual 4.0 (CC BY-SA 4.0)</b>. Se reproduce con atribución; cualquier reutilización de ese contenido debe mantener la misma licencia y citar la fuente.</p>
      <h2>Noticias</h2>
      <p>Los titulares y extractos enlazan siempre a la fuente original (Marca, Mundo Deportivo, Relevo, Gigantes, NBA Maniacs). No se copia el texto completo ni se aloja contenido de terceros.</p>
      <h2>Escudos y marcas</h2>
      <p>Los escudos de clubes son marcas de sus titulares y se muestran solo con finalidad identificativa. Este proyecto no está afiliado a ninguna competición ni club.</p>
      <h2>Aviso</h2>
      <p>Los datos se ofrecen sin garantía de exactitud. El simulador genera resultados ficticios: no son datos reales.</p>`,
  },
];

for (const p of pages) {
  const url = `${SITE}/legal/${p.slug}`;
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F7F3EC" />
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.h1)} de Anillero: información legal, privacidad, cookies y fuentes de datos." />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Anillero" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:url" content="${url}" />
    ${fonts}
    ${css}
    ${style}
  </head>
  <body>
    <main id="root">
      <p><a href="/" style="color:var(--a-accent);text-decoration:none">Anillero</a></p>
      <h1>${esc(p.h1)}</h1>
      <p class="upd">Última actualización: ${UPDATED}</p>
      ${p.body}
      <p class="upd">Esta página no constituye asesoramiento jurídico. Antes de operar comercialmente, revisa los textos con un profesional.</p>
      <p><a href="/legal/aviso-legal">Aviso legal</a> · <a href="/legal/privacidad">Privacidad</a> · <a href="/legal/cookies">Cookies</a> · <a href="/legal/fuentes">Fuentes</a></p>
    </main>
    ${scripts}
  </body>
</html>`;
  const dir = path.join(OUT, 'legal', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// sitemap
try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map((p) => `${SITE}/legal/${p.slug}`).filter((u) => !sm.includes(`<loc>${u}</loc>`));
  const add = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>yearly</changefreq>\n  </url>`).join('\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${urls.length} legales`);
  }
} catch (e) {
  console.warn('sitemap legal:', e.message);
}

console.log(`gen-legal-pages: ${pages.length} páginas`);
