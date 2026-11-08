// Build POKI: SDK obligatorio + sin enlaces salientes + sin analytics + sin ads
// Genera dist-poki/ con index.html limpio y el SDK inyectado
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIST = 'dist';
const OUT = 'dist-poki';
// Poki SDK - verificar URL actual en developers.poki.com
const SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';

console.log('📦 Building base...');
execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.cpSync(DIST, OUT, { recursive: true });

const playHtml = path.join(OUT, 'play', 'index.html');
let html = fs.readFileSync(playHtml, 'utf8');

// Elimina analytics Cloudflare
html = html.replace(/<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*><\/script>/, '');

// Elimina Google AdSense
html = html.replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3428519882418322"[^>]*><\/script>/, '');

// Elimina enlaces salientes del footer (enlaces a /mejores-simuladores-baloncesto, etc.)
html = html.replace(/<p class="about-links">[\s\S]*?<\/p>/, '');
html = html.replace(/<p class="about-note">[\s\S]*?<\/p>/, '');

// Inyecta Poki SDK antes de </head>
const sdkScript = `
    <!-- Poki SDK v2 -->
    <script src="${SDK_URL}"></script>
    <script>
      (async () => {
        try {
          await PokiSDK.init();
          console.log('[Poki] SDK initialized');
          // Notificar gameplay start para retención
          PokiSDK.gameplayStart();
        } catch (e) {
          console.error('[Poki] SDK error:', e);
        }
      })();
      // Pausar juego cuando Poki pida commercial break
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) PokiSDK.commercialBreak?.();
      });
    </script>`;

html = html.replace('</head>', `${sdkScript}\n  </head>`);

// noindex + nofollow (Poki usa su canonical)
html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex, nofollow"');

// Asegura CSP compatible con Poki (si usas meta CSP)
if (!html.includes('content-security-policy')) {
  const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' https: data: blob:; script-src \'self\' \'unsafe-inline\' https://game-cdn.poki.com https://static.cloudflareinsights.com; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com data:; img-src \'self\' data: https:; connect-src \'self\' https://api.anillero.com https://anillero.com;">';
  html = html.replace('</head>', `  ${csp}\n  </head>`);
}

fs.writeFileSync(playHtml, html);
console.log('✅ Poki build en dist-poki/');

// ZIP para subida
execSync(`cd ${OUT} && zip -r ../poki-build.zip . -x "*.DS_Store"`, { stdio: 'inherit' });
console.log('📦 poki-build.zip listo para subir a developers.poki.com');