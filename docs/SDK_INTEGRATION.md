# SDK Integration Checklist · CrazyGames + Poki

## CrazyGames (Full Launch)

### Requisitos previos
- [ ] Cuenta developer en https://developer.crazygames.com
- [ ] Juego aprobado en "Basic Launch" (retención >25% a 3 min)
- [ ] Game ID asignado (ej: `123456`)

### Integración SDK v2
```html
<!-- En <head> de play/index.html -->
<script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>
<script>
  window.CrazyGamesSDK = window.CrazyGamesSDK || [];
  CrazyGamesSDK.push({
    event: 'init',
    gameId: 'TU_GAME_ID_AQUI',
    onSuccess: () => console.log('[CG] SDK OK'),
    onError: (e) => console.error('[CG] SDK error:', e)
  });
  // Gameplay start (requerido para retención)
  window.addEventListener('load', () => {
    CrazyGamesSDK.push({ event: 'gameplayStart' });
  });
  // Opcional: levelStart, levelComplete, gameComplete
</script>
```

### Quitar de la build
- [ ] Cloudflare Web Analytics beacon
- [ ] Google AdSense / cualquier red publicitaria
- [ ] Enlaces salientes durante gameplay (menú hub, footer links)
- [ ] `robots: noindex, nofollow` en play/index.html

### Eventos recomendados
| Evento | Cuándo disparar | Código |
|--------|-----------------|--------|
| `gameplayStart` | Carga completa del juego (mount React) | `CrazyGamesSDK.push({event:'gameplayStart'})` |
| `levelStart` | Nueva temporada / partido | `CrazyGamesSDK.push({event:'levelStart', level: season})` |
| `levelComplete` | Fin de temporada / partido ganado | `CrazyGamesSDK.push({event:'levelComplete', level: season})` |
| `gameComplete` | Retirada del jugador | `CrazyGamesSDK.push({event:'gameComplete'})` |
| `happyTime` | Logro desbloqueado / anillo ganado | `CrazyGamesSDK.push({event:'happyTime'})` |

### Comercial break (opcional)
```js
// Si CrazyGames pide pausa para anuncio
CrazyGamesSDK.push({
  event: 'commercialBreak',
  onResume: () => { /* reanudar simulación */ }
});
```

### Testing
- [ ] `npm run portal:crazygames` → revisa `dist-crazygames/play/index.html`
- [ ] Sube ZIP a CrazyGames → test en sandbox
- [ ] Verifica en consola: `[CG] SDK OK`, `[CG] gameplayStart`
- [ ] Juega 5 min → revisa dashboard: gameplayStart count, retention

### Revenue Share
- 50/50 net revenue (tras fees de pago)
- Pagos mensuales (Net 30)
- Dashboard: https://developer.crazygames.com/analytics

---

## Poki (Full Launch obligatorio)

### Requisitos previos
- [ ] Cuenta en https://developers.poki.com
- [ ] Juego enviado para review (proceso manual, 1-2 semanas)
- [ ] Criterios: retención >25% a 3 min, sin bugs, sin enlaces salientes, sin ads propios

### Integración SDK v2
```html
<!-- En <head> de play/index.html -->
<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
<script>
  (async () => {
    try {
      await PokiSDK.init();
      console.log('[Poki] SDK initialized');
      PokiSDK.gameplayStart();
    } catch (e) {
      console.error('[Poki] SDK error:', e);
    }
  })();

  // Pausa para commercial break (obligatorio si Poki lo pide)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) PokiSDK.commercialBreak?.();
  });
</script>
```

### Quitar de la build (ESTRICTO)
- [ ] Cloudflare Web Analytics
- [ ] Google AdSense / cualquier ad
- [ ] **Todos los enlaces salientes** durante gameplay (menú, footer, "mejores simuladores", legal links en partida)
- [ ] CSP compatible: `script-src 'self' 'unsafe-inline' https://game-cdn.poki.com`
- [ ] `robots: noindex, nofollow`
- [ ] No `localStorage` writes que fallen en iframe (ya usas try/catch)

### Eventos Poki
| Método | Cuándo |
|--------|--------|
| `PokiSDK.gameplayStart()` | Mount del juego |
| `PokiSDK.levelStart(n)` | Nueva temporada |
| `PokiSDK.levelComplete(n)` | Fin temporada |
| `PokiSDK.gameComplete()` | Retirada |
| `PokiSDK.happyTime()` | Logro / anillo |
| `PokiSDK.commercialBreak()` | Cuando Poki lo requiera (pause sim) |
| `PokiSDK.rewardedBreak()` | Video recompensado (opcional) |

### Testing
- [ ] `npm run portal:poki` → revisa `dist-poki/play/index.html`
- [ ] Sube a developers.poki.com → test en sandbox
- [ ] Verifica consola: `[Poki] SDK initialized`, `gameplayStart`
- [ ] Prueba `visibilitychange` → simulación pausa/reanuda
- [ ] Juega 10 min sin errores de consola

### Revenue Share
- 50/50 net revenue
- Pagos mensuales
- Dashboard: https://developers.poki.com/analytics

---

## itch.io (Sin SDK)

### Requisitos
- [ ] Cuenta en https://itch.io
- [ ] Butler CLI instalado: `npm install -g butler` o descarga binario

### Build
```bash
npm run portal:itch
# Genera dist-itch/ con butler.toml + README_ITCH.md
```

### Subida con Butler (recomendado)
```bash
# Primera vez
butler login
butler push dist-itch/ tu-usuario/anillero:html --userversion 1.0.0

# Actualizaciones
butler push dist-itch/ tu-usuario/anillero:html --userversion 1.0.1
```

### Subida manual (ZIP)
- Sube `itch-build.zip` en "Upload files" → "HTML"
- Rellena metadatos: tags, categoría "Simulation", rating "Everyone"

### Analytics
- itch.io da vistas, descargas, rating, comentarios
- No revenue share obligatorio (puedes activar "Pay what you want")

---

## Checklist maestro pre-subida

| Portal | Build | SDK | Sin ads | Sin enlaces salientes | CSP | ZIP listo | Test sandbox |
|--------|-------|-----|---------|----------------------|-----|-----------|--------------|
| CrazyGames Full | `npm run portal:crazygames` | ✅ v2 | ✅ | ✅ | opcional | `crazygames-full.zip` | [ ] |
| Poki | `npm run portal:poki` | ✅ v2 | ✅ | ✅ ESTRICTO | ✅ | `poki-build.zip` | [ ] |
| itch.io | `npm run portal:itch` | ❌ | ✅ | ✅ | opcional | `itch-build.zip` | [ ] |

---

## Contactos soporte
- **CrazyGames**: developer@crazygames.com / Discord #developer-support
- **Poki**: developers@poki.com / https://developers.poki.com/support
- **itch.io**: support@itch.io / https://itch.io/docs/creators