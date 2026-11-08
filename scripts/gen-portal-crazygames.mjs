// Build CrazyGames FULL: SDK + sin analytics propio + revenue share 50/50
// Genera dist-crazygames/ con index.html limpio y el SDK inyectado
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIST = 'dist';
const OUT = 'dist-crazygames';
const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v2.js'; // verificar versión actual en docs.crazygames.com

// 1. Build base
console.log('📦 Building base...');
execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });

// 2. Copia dist a dist-crazygames
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.cpSync(DIST, OUT, { recursive: true });

// 3. Modifica index.html del juego (/play/index.html) para portal
const playHtml = path.join(OUT, 'play', 'index.html');
let html = fs.readFileSync(playHtml, 'utf8');

// Elimina analytics de Cloudflare
html = html.replace(/<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*><\/script>/, '');

// Elimina Google AdSense (requisito CrazyGames full)
html = html.replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3428519882418322"[^>]*><\/script>/, '');

// Inyecta CrazyGames SDK antes de </head>
const sdkScript = `
    <!-- CrazyGames SDK v2 -->
    <script src="${SDK_URL}"></script>
    <script>
      window.CrazyGamesSDK = window.CrazyGamesSDK || [];
      CrazyGamesSDK.push({
        event: 'init',
        gameId: 'REPLACE_WITH_YOUR_GAME_ID', // <-- Pon tu Game ID de CrazyGames aquí
        onSuccess: () => console.log('[CG] SDK initialized'),
        onError: (e) => console.error('[CG] SDK error:', e)
      });
      // Gameplay start para tracking de retención
      window.addEventListener('load', () => {
        CrazyGamesSDK.push({ event: 'gameplayStart' });
      });
    </script>`;

html = html.replace('</head>', `${sdkScript}\n  </head>`);

// Asegura noindex (CrazyGames usa su propia canonical)
html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex, nofollow"');

fs.writeFileSync(playHtml, html);
console.log('✅ CrazyGames FULL build en dist-crazygames/');
console.log('⚠️  Edita dist-crazygames/play/index.html y pon tu Game ID real');

// 4. Crea ZIP para subida
execSync(`cd ${OUT} && zip -r ../crazygames-full.zip . -x "*.DS_Store"`, { stdio: 'inherit' });
console.log('📦 crazygames-full.zip listo para subir');