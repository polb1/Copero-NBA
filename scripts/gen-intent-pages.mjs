// Landings por intención de búsqueda (ES/EN) con hreflang, FAQ y CTA al juego.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const SITE = 'https://anillero.com';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
  :root{color-scheme:dark}
  body{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.6}
  a{color:#ff6b1a}
  .wrap{max-width:820px;margin:0 auto;padding:24px 20px 80px}
  .crumbs{font-size:13px;color:#8a93a3}
  .hero{padding:30px 0 8px}
  .kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#f0c04d}
  h1{font-size:clamp(28px,4.6vw,42px);line-height:1.1;margin:10px 0 12px;letter-spacing:-.02em}
  .lead{font-size:17px;color:#b9c0cc;margin:0}
  h2{font-size:20px;margin:34px 0 10px;color:#f0c04d}
  ul{padding-left:20px}
  li{margin:6px 0}
  .cta{display:inline-block;margin:26px 0 6px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none}
  .card{background:#12151b;border:1px solid #232733;border-radius:14px;padding:16px 18px;margin-top:14px}
  .faq{border-top:1px solid #232733;margin-top:14px;padding-top:12px}
  footer{margin-top:44px;border-top:1px solid #232733;padding-top:16px;color:#8a93a3;font-size:12px}
  .lang{font-size:12px;color:#8a93a3;margin-top:10px}
`;

function page({ lang, title, desc, h1, kicker, lead, body, canonical, alternates, faq }) {
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });
  const alt = Object.entries(alternates).map(([hl, href]) => `<link rel="alternate" hreflang="${hl}" href="${href}" />`).join('\n');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
${alt}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${SITE}/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow" />
<script type="application/ld+json">${ld}</script>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <p class="crumbs"><a href="/">Anillero</a> · ${esc(kicker)}</p>
  <header class="hero">
    <span class="kicker">${esc(kicker)}</span>
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>
    <a class="cta" href="/play">${lang === 'es' ? 'Jugar gratis ahora' : 'Play free now'}</a>
    <p class="lang">${Object.keys(alternates).filter((k) => k !== 'x-default').map((k) => `<a href="${alternates[k]}">${k.toUpperCase()}</a>`).join(' · ')}</p>
  </header>
  ${body}
  <footer><a href="/">${lang === 'es' ? 'Resultados y clasificaciones' : 'Scores and standings'}</a> · <a href="/hall-of-fame">Hall of Fame</a> · <a href="/play">Play</a></footer>
</div>
</body>
</html>`;
}

const faqEs = [
  ['¿Es gratis?', 'Sí. El juego es gratis, sin registro y sin anuncios por ahora. Se juega en el navegador, en el móvil o en el ordenador.'],
  ['¿Se puede jugar sin descargar nada?', 'Sí. No hay instalación: entras en la web y juegas. También puedes añadirlo a la pantalla de inicio como si fuera una app.'],
  ['¿Cuánto dura una carrera?', 'Entre 5 y 10 minutos. Cada temporada tomas de una a cinco decisiones y el resto se simula partido a partido.'],
  ['¿Puedo entrenar a un equipo en vez de ser jugador?', 'Ahora mismo el modo principal es la carrera de jugador: empiezas en un club de formación, pasas por el draft y llegas a la NBA o haces carrera en Europa.'],
];
const faqEn = [
  ['Is it free?', 'Yes. It is free, with no sign-up and no ads for now. It runs in the browser, on mobile or desktop.'],
  ['Do I need to download anything?', 'No. You open the site and play. You can also add it to your home screen and use it like an app.'],
  ['How long is a career?', 'Between 5 and 10 minutes. Each season you make one to five decisions and the rest is simulated game by game.'],
  ['Can I manage a team instead of playing?', 'The main mode is a player career: you start at a youth club, enter the draft and reach the NBA or build a career in Europe.'],
];

const faqBlock = (faq) => `<section class="faq">
    <h2>${faq === faqEs ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
    ${faq.map(([q, a]) => `<div class="card"><b>${esc(q)}</b><p style="margin:6px 0 0;color:#b9c0cc">${esc(a)}</p></div>`).join('')}
  </section>`;

const defs = [
  {
    file: 'manager-de-baloncesto/index.html',
    lang: 'es',
    canonical: `${SITE}/manager-de-baloncesto`,
    alternates: {
      es: `${SITE}/manager-de-baloncesto`,
      en: `${SITE}/en/basketball-manager`,
      'x-default': `${SITE}/manager-de-baloncesto`,
    },
    kicker: 'Manager de baloncesto',
    title: 'Manager de baloncesto online y gratis | Anillero',
    desc: 'Juega a ser manager de baloncesto en el navegador: elige club, construye plantilla, toma decisiones de temporada y pelea por el título. Gratis y sin registro.',
    h1: 'Manager de baloncesto online, gratis y sin registro',
    lead: 'Dirige tu carrera desde dentro: empiezas en un club modesto, decides cada temporada y acabas peleando por ligas y anillos.',
    body: `
  <h2>Qué hace un manager y qué vas a decidir aquí</h2>
  <p>Un manager de baloncesto no juega los partidos: decide lo que pasa alrededor. En Anillero cada temporada te plantea entre una y cinco decisiones que mueven la moral del vestuario, la confianza del entrenador, tu contrato y tu rol en el equipo. No hay menús infinitos ni hojas de cálculo: son decisiones cortas con consecuencias que se notan en la siguiente temporada.</p>
  <ul>
    <li><b>Dónde empiezas:</b> club de formación, cantera europea o directamente draft.</li>
    <li><b>Qué priorizas:</b> minutos, dinero, proyecto deportivo o visibilidad para dar el salto.</li>
    <li><b>Cómo reaccionas:</b> a una lesión, a un banquillazo, a una oferta de un equipo grande.</li>
    <li><b>Cuándo te retiras:</b> y con qué vitrina: ligas, copas, premios individuales y anillos.</li>
  </ul>

  <h2>Las cinco ligas que puedes jugar</h2>
  <p>El juego usa datos reales de cinco competiciones: NBA, Liga ACB, Euroliga, la liga griega (GBL) y la turca (BSL). Puedes hacer carrera en España, saltar a Europa o cruzar el charco al draft, con las plantillas reales de la temporada 2026-27.</p>

  <h2>Datos reales, decisiones simuladas</h2>
  <p>Las plantillas y las clasificaciones salen de fuentes públicas oficiales y se actualizan periódicamente. Lo que es simulación —y se nota— son los partidos, los traspasos, los entrenadores y los agentes. En cada página de datos verás de dónde viene el dato y cuándo se actualizó por última vez.</p>

  <h2>Por qué este manager y no otro</h2>
  <p>Porque no necesitas registrarte, descargar nada ni pagar. Entras, juegas una carrera completa en menos de diez minutos y, si te engancha, la siguiente empieza desde otro club con otras decisiones. Y si quieres seguir la actualidad de verdad, el portal te da resultados, clasificaciones y calendario de las cinco ligas.</p>
  ${faqBlock(faqEs)}`,
    faq: faqEs,
  },
  {
    file: 'en/basketball-manager/index.html',
    lang: 'en',
    canonical: `${SITE}/en/basketball-manager`,
    alternates: {
      es: `${SITE}/manager-de-baloncesto`,
      en: `${SITE}/en/basketball-manager`,
      'x-default': `${SITE}/manager-de-baloncesto`,
    },
    kicker: 'Basketball manager',
    title: 'Free online basketball manager game | Anillero',
    desc: 'Play a free basketball manager game in your browser: pick a club, build your career and fight for titles. No sign-up, no download.',
    h1: 'Free online basketball manager game',
    lead: 'Run a career from the inside: start at a small club, make the calls each season and end up fighting for league titles.',
    body: `
  <h2>What you actually decide</h2>
  <p>This is not a spreadsheet. Each season the game puts one to five choices in front of you, and every choice moves squad morale, the coach's trust, your contract and your role. Short decisions, visible consequences.</p>
  <ul>
    <li><b>Where you start:</b> youth club, European academy or straight into the draft.</li>
    <li><b>What you chase:</b> minutes, money, a project or exposure.</li>
    <li><b>How you react:</b> to an injury, a benching or an offer from a bigger club.</li>
    <li><b>When you retire:</b> and with what trophy cabinet.</li>
  </ul>

  <h2>Five real competitions</h2>
  <p>NBA, Spain's Liga ACB, the EuroLeague, the Greek GBL and the Turkish BSL, all with real 2026-27 rosters. Start in Spain, move around Europe or cross the Atlantic for the draft.</p>

  <h2>Real data, simulated decisions</h2>
  <p>Rosters and standings come from official public sources and are refreshed regularly. Games, trades, coaches and agents are simulated, and the site labels which is which on every data page.</p>
  ${faqBlock(faqEn)}`,
    faq: faqEn,
  },
  {
    file: 'juegos-de-baloncesto-online/index.html',
    lang: 'es',
    canonical: `${SITE}/juegos-de-baloncesto-online`,
    alternates: {
      es: `${SITE}/juegos-de-baloncesto-online`,
      en: `${SITE}/en/basketball-games-online`,
      'x-default': `${SITE}/juegos-de-baloncesto-online`,
    },
    kicker: 'Juegos de baloncesto',
    title: 'Juegos de baloncesto online gratis, sin descargar | Anillero',
    desc: 'Juegos de baloncesto online gratis en el navegador: simulador de carrera, decisiones de temporada y datos reales de cinco ligas. Sin descargas ni registro.',
    h1: 'Juegos de baloncesto online, gratis y sin descargar',
    lead: 'Si buscas un juego de baloncesto para el navegador, aquí tienes uno que no es un arcade de triples: es una carrera completa.',
    body: `
  <h2>Qué tipo de juego de baloncesto es este</h2>
  <p>Anillero es un simulador de carrera. Creas un jugador de 18 años, eliges país, posición y estilo, y vives su carrera temporada a temporada: club de formación, draft, contratos, lesiones, traspasos, títulos y retirada. No hay reflejos que entrenar ni partidos en tiempo real: hay decisiones y consecuencias.</p>

  <h2>Para quién es (y para quién no)</h2>
  <ul>
    <li><b>Sí es para ti</b> si te gustan los juegos de gestión, las decisiones con consecuencias y el baloncesto real.</li>
    <li><b>No es para ti</b> si buscas un arcade de tirar triples, un juego de cartas o un manager con miles de menús.</li>
  </ul>

  <h2>Qué necesitas para jugar</h2>
  <ul>
    <li>Un navegador actualizado, en móvil u ordenador.</li>
    <li>Cinco o diez minutos para una carrera completa.</li>
    <li>Nada más: sin cuenta, sin descarga, sin pagar.</li>
  </ul>

  <h2>Los datos reales que hay detrás</h2>
  <p>El juego se apoya en un portal con resultados, clasificaciones y calendario de NBA, Liga ACB, Euroliga, GBL y BSL. Así puedes mirar cómo va tu equipo en la vida real y después intentar hacerlo mejor en la simulación.</p>
  ${faqBlock(faqEs)}`,
    faq: faqEs,
  },
  {
    file: 'en/basketball-games-online/index.html',
    lang: 'en',
    canonical: `${SITE}/en/basketball-games-online`,
    alternates: {
      es: `${SITE}/juegos-de-baloncesto-online`,
      en: `${SITE}/en/basketball-games-online`,
      'x-default': `${SITE}/juegos-de-baloncesto-online`,
    },
    kicker: 'Basketball games',
    title: 'Free online basketball games, no download | Anillero',
    desc: 'Free online basketball games in your browser: a full career simulator with real data from five leagues. No download, no sign-up.',
    h1: 'Free online basketball games, no download',
    lead: 'Not another arcade three-point shootout: a complete player career you can finish in ten minutes.',
    body: `
  <h2>What kind of basketball game this is</h2>
  <p>Anillero is a career simulator. You create an 18-year-old player, pick country, position and style, then live the career season by season: youth club, draft, contracts, injuries, trades, titles and retirement. No reflexes, no real-time matches — decisions and consequences.</p>

  <h2>Who it is for</h2>
  <ul>
    <li><b>Good fit</b> if you like management games, meaningful choices and real basketball.</li>
    <li><b>Not for you</b> if you want an arcade shooter, a card game or a 50-menu manager.</li>
  </ul>

  <h2>What you need</h2>
  <ul>
    <li>A modern browser, mobile or desktop.</li>
    <li>Five to ten minutes for a full career.</li>
    <li>Nothing else: no account, no download, no payment.</li>
  </ul>

  <h2>The real data behind it</h2>
  <p>The game sits on top of a portal with scores, standings and schedules from the NBA, Liga ACB, EuroLeague, GBL and BSL, so you can check how your club is doing for real before trying to do better in the simulation.</p>
  ${faqBlock(faqEn)}`,
    faq: faqEn,
  },
];

const urls = [];
for (const d of defs) {
  const html = page(d);
  const dest = path.join(OUT, d.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  urls.push(d.canonical);
}
console.log(`gen-intent-pages: ${urls.length} landings`);

try {
  const smPath = path.join(OUT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  const add = urls.filter((u) => !sm.includes(`<loc>${u}</loc>`))
    .map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`)
    .join('\n');
  if (add) {
    sm = sm.replace('</urlset>', `${add}\n</urlset>`);
    fs.writeFileSync(smPath, sm);
    console.log(`sitemap: +${urls.length} landings`);
  }
} catch (e) { console.warn('sitemap intents:', e.message); }
