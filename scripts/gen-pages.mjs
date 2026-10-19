// Generates en/index.html and ca/index.html from index.html (the Spanish page) before each build:
// translated <head> metadata, JSON-LD and crawlable guide, so every language is indexable on its own URL.
import fs from 'node:fs';

const SITE = 'https://nba.polb.dev';
const src = fs.readFileSync('index.html', 'utf8');

const PAGES = {
  en: {
    locale: 'en_US',
    title: 'NBA Career Simulator · Free Basketball Career Game | NBA Legacy',
    description: 'Free basketball career simulator in your browser: create your player, start at your club, enter the NBA draft and win rings. No sign-up, made for mobile.',
    ogTitle: 'NBA Legacy · Free basketball career simulator',
    ogDescription: 'Create your player, enter the NBA draft and build your legacy. Free, in your browser and on your phone.',
    loading: 'Loading…',
    slow: 'This is taking longer than usual.',
    reload: 'Reload',
    broken: 'Your browser could not start the game.<br>Update it or open it in Safari or Chrome.',
    alt: 'NBA career simulator',
    genre: ['Sports simulation', 'Basketball'],
    ldDescription: 'Free basketball career simulator: create your player, play for your club, enter the NBA draft and build your legacy all the way to the Hall of Fame.',
    h1: 'Free NBA basketball career simulator',
    intro: '<strong>NBA Legacy</strong> is a basketball career simulator you play for free in your browser, on your phone or on your computer. You create your player at 18 and live his whole career: your first club, the <strong>NBA draft</strong>, contracts, injuries, trades, rings and retirement. Every season you make one or two decisions and the rest is played out game by game.',
    howTitle: 'How to play',
    how: [
      '<strong>Create your player:</strong> name, jersey number, country (more than 190), position and play style.',
      '<strong>Pick an agency and a club:</strong> three clubs from your country want you. Big clubs pay more but give fewer minutes.',
      '<strong>Choose your path:</strong> enter the NBA draft, wait another season or build a career in Europe.',
      '<strong>Make decisions:</strong> press, training, sponsors, trades and clutch shots in a mini-game.',
      '<strong>Retire and compare:</strong> your legacy, stats and achievements stay in "My careers" so you can beat them next time.',
    ],
    featTitle: 'What this basketball simulator has',
    feat: [
      'A fully simulated NBA: 30 teams, 82 games, play-in, playoffs, MVP awards, All-Star and Hall of Fame.',
      'Careers in Europe and around the world: Liga ACB, EuroLeague, Italy, Greece, Turkey, France, Germany and more, with every club crest.',
      'Decisions with consequences: morale, chemistry, pressure and the coach\'s trust change your minutes and your performance.',
      'A real economy: you start with no money, get paid every season, pay your agent and decide what to spend on.',
      'National team, medals, personal records, career challenges and 31 achievements to unlock.',
      'Fast and light: a whole career in minutes, installable as an app and works offline.',
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      ['Is NBA Legacy free?', 'Yes. It is a free game you play in your phone or computer browser, with no downloads, no sign-up and no ads.'],
      ['How does the basketball career simulator work?', 'You create your player at 18, pick a country, position and style, and live his career season by season: youth club, NBA draft, contracts, injuries, trades, rings and retirement. Each season you make one or two decisions and the rest is simulated game by game.'],
      ['Do my decisions change the career?', 'Yes. Every choice moves your morale, chemistry, pressure, the coach\'s trust, popularity or your money, and that changes your minutes, your performance in every game, the contracts you get and what you earn.'],
      ['Can I play in Spain or Europe instead of the NBA?', 'Yes. You can start at a club from your country (Real Madrid, Barça, Baskonia, Valencia Basket and many more), go to the draft or build your whole career in Europe winning leagues.'],
      ['How long does a career take?', 'A full career takes about 5 to 10 minutes. When you retire you can compare it with your previous careers and start another one right away.'],
      ['Can I play on my phone?', 'Yes. It is made for mobile: it works on iPhone and Android, can be installed on your home screen like an app and works offline.'],
      ['Is my game saved?', 'Yes. Your game is saved automatically in your browser and your finished careers stay in "My careers" with their stats, challenges and achievements.'],
      ['Is this an official NBA game?', 'No. It is an independent project not affiliated with the NBA. Franchise names are used only as references and all players are fictional.'],
    ],
    note: 'An independent project not affiliated with the NBA. Franchise names are used only as references within the simulation; players, coaches and agents are fictional.',
  },
  ca: {
    locale: 'ca_ES',
    title: 'Simulador de Carrera NBA Gratis · Crea el teu Jugador | NBA Legacy',
    description: 'Simulador de carrera de bàsquet gratis al navegador: crea el teu jugador, juga al teu club, entra al draft de l\'NBA i guanya anells. Sense registre, al mòbil.',
    ogTitle: 'NBA Legacy · Simulador de carrera de bàsquet gratis',
    ogDescription: 'Crea el teu jugador, entra al draft de l\'NBA i construeix el teu llegat. Gratis, al navegador i al mòbil.',
    loading: 'Carregant…',
    slow: 'Està trigant més del normal.',
    reload: 'Recarregar',
    broken: 'El teu navegador no ha pogut iniciar el joc.<br>Actualitza’l o obre’l amb Safari o Chrome.',
    alt: 'Simulador de carrera NBA',
    genre: ['Simulador esportiu', 'Bàsquet'],
    ldDescription: 'Simulador de carrera de bàsquet gratis: crea el teu jugador, juga al teu club, entra al draft de l\'NBA i construeix el teu llegat fins al Hall of Fame.',
    h1: 'Simulador de carrera de bàsquet NBA gratis',
    intro: '<strong>NBA Legacy</strong> és un simulador de carrera de bàsquet que es juga gratis al navegador, al mòbil o a l\'ordinador. Crees el teu jugador amb 18 anys i vius tota la seva carrera: el teu primer club, el <strong>draft de l\'NBA</strong>, els contractes, les lesions, els traspassos, els anells i la retirada. Cada temporada prens una o dues decisions i la resta es juga partit a partit.',
    howTitle: 'Com es juga',
    how: [
      '<strong>Crea el teu jugador:</strong> nom, dorsal, país (més de 190), posició i estil de joc.',
      '<strong>Tria agència i club:</strong> tres clubs del teu país et volen. Els grans paguen més però donen menys minuts.',
      '<strong>Decideix el teu camí:</strong> presenta\'t al draft de l\'NBA, espera una altra temporada o fes carrera a Europa.',
      '<strong>Pren decisions:</strong> premsa, entrenaments, patrocinadors, traspassos i tirs decisius en un minijoc.',
      '<strong>Retira\'t i compara:</strong> el teu llegat, les teves estadístiques i els teus assoliments queden a "Les meves carreres" per superar-los a la següent.',
    ],
    featTitle: 'Què té aquest simulador de bàsquet',
    feat: [
      'Lliga NBA completa simulada: 30 equips, 82 partits, play-in, playoffs, premis MVP, All-Star i Hall of Fame.',
      'Carrera a Europa i a la resta del món: Lliga ACB, Eurolliga, Itàlia, Grècia, Turquia, França, Alemanya i més, amb els escuts de cada club.',
      'Decisions amb conseqüències: la moral, la química, la pressió i la confiança de l\'entrenador canvien els teus minuts i el teu rendiment.',
      'Economia real: comences sense diners, cobres el sou cada temporada, pagues el teu agent i decideixes en què gastar.',
      'Selecció nacional, medalles, rècords personals, reptes de carrera i 31 assoliments per desbloquejar.',
      'Ràpid i lleuger: una carrera completa en minuts, instal·lable com una app i funciona sense connexió.',
    ],
    faqTitle: 'Preguntes freqüents',
    faq: [
      ['NBA Legacy és gratis?', 'Sí. És un joc gratuït que es juga al navegador del mòbil o de l\'ordinador, sense descàrregues, sense registre i sense anuncis.'],
      ['Com funciona el simulador de carrera de bàsquet?', 'Crees el teu jugador amb 18 anys, tries país, posició i estil, i vius la seva carrera temporada a temporada: club de formació, draft de l\'NBA, contractes, lesions, traspassos, anells i retirada. Cada temporada prens una o dues decisions i la resta se simula partit a partit.'],
      ['Les decisions canvien la carrera?', 'Sí. Cada elecció mou la moral, la química, la pressió, la confiança de l\'entrenador, la popularitat o els teus diners, i això afecta els teus minuts, el teu rendiment a cada partit, els contractes que reps i el que cobres.'],
      ['Puc jugar a Espanya o a Europa en lloc de l\'NBA?', 'Sí. Pots començar en un club del teu país (Reial Madrid, Barça, Baskonia, València Basket i molts més), anar al draft o fer tota la carrera a Europa guanyant lligues.'],
      ['Quant dura una carrera?', 'Una carrera completa es juga en uns 5 a 10 minuts. Quan et retires la pots comparar amb les teves carreres anteriors i començar-ne una altra al moment.'],
      ['Es pot jugar al mòbil?', 'Sí. Està pensat per al mòbil: funciona a iPhone i Android, es pot instal·lar a la pantalla d\'inici com una app i funciona sense connexió.'],
      ['Es desa la partida?', 'Sí. La partida es desa automàticament al navegador i les teves carreres acabades queden a "Les meves carreres" amb les seves estadístiques, reptes i assoliments.'],
      ['És un joc oficial de l\'NBA?', 'No. És un projecte independent sense afiliació amb l\'NBA. Els noms de franquícies s\'utilitzen només com a referència i tots els jugadors són ficticis.'],
    ],
    note: 'Projecte independent sense afiliació amb l\'NBA. Els noms de franquícies s\'utilitzen només com a referència dins de la simulació; jugadors, entrenadors i agents són ficticis.',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const swap = (html, re, value, label) => {
  if (!re.test(html)) throw new Error(`gen-pages: ${label} not found in index.html`);
  return html.replace(re, value);
};

for (const [lang, p] of Object.entries(PAGES)) {
  let h = src;
  const url = `${SITE}/${lang}/`;
  h = swap(h, /<html lang="es">/, `<html lang="${lang}">`, 'html lang');
  h = swap(h, /<title>[^<]*<\/title>/, `<title>${p.title}</title>`, 'title');
  h = swap(h, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`, 'description');
  h = swap(h, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical');
  h = swap(h, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(p.ogTitle)}" />`, 'og:title');
  h = swap(h, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(p.ogDescription)}" />`, 'og:description');
  h = swap(h, /<meta property="og:locale" content="[^"]*" \/>/, `<meta property="og:locale" content="${p.locale}" />`, 'og:locale');
  h = swap(h, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  const ld = [
    { '@context': 'https://schema.org', '@type': 'VideoGame', name: 'NBA Legacy', alternateName: p.alt, url, inLanguage: lang, genre: p.genre, gamePlatform: ['Web', 'Android', 'iOS'], applicationCategory: 'GameApplication', operatingSystem: 'Web', playMode: 'SinglePlayer', image: `${SITE}/icons/icon-512.png`, description: p.ldDescription, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  h = swap(h, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(ld)}</script>`, 'json-ld');
  const about = `<section id="about" class="about">
      <h1>${p.h1}</h1>
      <p>${p.intro}</p>
      <h2>${p.howTitle}</h2>
      <ol>
${p.how.map((x) => `        <li>${x}</li>`).join('\n')}
      </ol>
      <h2>${p.featTitle}</h2>
      <ul>
${p.feat.map((x) => `        <li>${x}</li>`).join('\n')}
      </ul>
      <h2>${p.faqTitle}</h2>
${p.faq.map(([q, a]) => `        <details><summary>${q}</summary><p>${a}</p></details>`).join('\n')}
      <p class="about-note">${p.note}</p>
    </section>`;
  h = swap(h, /<section id="about" class="about">[\s\S]*?<\/section>/, about, 'about section');
  h = swap(h, />Cargando…</, `>${p.loading}<`, 'splash');
  h = swap(h, /Está tardando más de lo normal\.<br><button onclick="location\.reload\(\)"([^>]*)>Recargar<\/button>/, `${p.slow}<br><button onclick="location.reload()"$1>${p.reload}</button>`, 'slow message');
  h = swap(h, /Tu navegador no pudo iniciar el juego\.<br>Actualízalo o ábrelo en Safari o Chrome\./, p.broken, 'error message');
  // Only the Spanish root redirects to the language saved in the cookie.
  h = swap(h, /\s*<script data-lang-redirect>[\s\S]*?<\/script>/, '', 'language redirect');
  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(`${lang}/index.html`, h);
}
console.log('gen-pages: en/index.html, ca/index.html');
