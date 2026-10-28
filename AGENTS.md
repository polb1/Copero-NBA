# Copero-NBA — AGENTS.md

App web (Vite + TS) para gestión de copas NBA. Stack: TypeScript, Vite, Node.

---

## Stack agéntico (hereda global ~/.config/opencode/AGENTS.md)

| Rol | Agente | Modelo | Proveedor | Coste |
|-----|--------|--------|-----------|-------|
| Orquestador | `orquestador` | `deepseek/deepseek-v4.1-flash` | OpenRouter | pago |
| Arquitecto | `arquitecto` | `deepseek/deepseek-v4-pro-0813` | OpenRouter | pago |
| Auditor | `auditor` | `qwen2.5-coder:7b` | **Ollama (local)** | **gratis** |
| Constructor | `constructor` | `qwen/qwen3-coder-30b-a3b-instruct` | OpenRouter | pago (céntimos) |
| Escritor 2 | `escritor2` | `z-ai/glm-5.3-flash` | OpenRouter | pago (céntimos) |
| Escritor 3 | `escritor3` | `poolside/laguna-s-2.1:free` | OpenRouter | **gratis*** |
| Juez 1 | `juez1` | `nvidia/nemotron-3-ultra-550b-a55b:free` | OpenRouter | **gratis*** |
| Juez 2 | `juez2` | `minimax/minimax-m3.1-flash:free` | OpenRouter | **gratis*** |
| Juez 3 (desempate) | `juez3` | `anthropic/claude-sonnet-5.5` | OpenRouter | pago, uso limitado |

*Los modelos `:free` pueden registrar prompts. No usar con código privado de clientes.

---

## 🛡️ SISTEMA DE FALLBACK AUTOMÁTICO (Plan B/C/D...)

Cada agente tiene **cadena de fallback priorizada** (Premium → Barato → Gratis OpenRouter → Local).
Si el modelo principal falla (sin saldo, rate limit, caído, error), **OpenCode rota automáticamente** al siguiente disponible.

### Cadenas de fallback por rol:

| Rol | Primario (Premium) | Secundario (Barato) | Terciario (Gratis OpenRouter) | Cuaternario (Local) |
|-----|-------------------|---------------------|-------------------------------|---------------------|
| **Orquestador** | DeepSeek V4.1 Flash | DeepSeek V4 Flash | GLM 5.3 Flash / MiMo V2.6 Flash / Nemotron 3.5 Lightning :free / Inkling :free | Ollama qwen2.5:7b / qwen2.5-coder:7b / gemma2:9b |
| **Arquitecto** | DeepSeek V4 Pro 0813 | DeepSeek V4.1 Flash | GLM 5.3 FlashX / MiMo V2.6 Pro / Nemotron 3.5 Super VL :free / Inkling :free | Ollama qwen2.5-coder:14b / 7b |
| **Auditor** | **Ollama qwen2.5-coder:7b** (local) | Ollama qwen2.5-coder:14b / qwen2.5:7b / gemma2:9b | Nemotron 3.5 Lightning :free / Cohere North Mini Code :free / Gemma 4 :free / Inkling :free | DeepSeek V4.1 Flash (OpenRouter) |
| **Constructor** | Qwen3 Coder 30B | Qwen3 Coder Next / Flash / 3.8-27b / 3.7 Flash | DeepSeek V4.1 Flash / GLM 5.3 Flash / MiMo V2.6 Flash / Laguna :free / Cohere :free | Ollama qwen2.5-coder:14b / 7b |
| **Escritor 2** | GLM 5.3 Flash | GLM 5.3 FlashX / MiMo V2.6 Flash | DeepSeek V4.1 Flash / Qwen 3.7 Flash / Nemotron :free / Inkling :free | Ollama qwen2.5:7b / qwen2.5-coder:7b |
| **Escritor 3** | Laguna S 2.1 :free | Cohere North Mini Code :free / Gemma 4 :free / Inkling :free / Nemotron :free / MiMo :free | Ollama qwen2.5-coder:7b / qwen2.5:7b |
| **Juez 1** | Nemotron 3 Ultra :free | Minimax M3.1 Flash :free / Nemotron 3.5 Super VL :free / Inkling :free / Gemma 4 :free / MiMo :free | Ollama qwen2.5-coder:14b / 7b |
| **Juez 2** | Minimax M3.1 Flash :free | Nemotron 3 Ultra :free / Nemotron 3.5 Super VL :free / Inkling :free / Gemma 4 :free / MiMo :free | Ollama qwen2.5:7b / gemma2:9b |
| **Juez 3** | Claude Sonnet 5.5 | GPT-6 Luna / GPT-OSS 20B | DeepSeek V4 Pro / GLM 5.3 FlashX / Llama 3.3 70B | Ollama qwen2.5-coder:14b |

### Cómo funciona (cero intervención):

1. **OpenCode nativo**: `fallbackModels` en config → rota automáticamente si error 4xx/5xx/timeout
2. **OpenRouter nativo**: `provider.order` + `allow_fallbacks` → rota entre proveedores del mismo modelo
3. **Monitor daemon** (`fallback-monitor.sh` cada 5 min):
   - Health-check real de cada modelo (test 1 token)
   - Si primario cae → reescribe `opencode.json` con el siguiente funcional
   - Reinicia Ollama/LM Studio si no responden
   - Log en `~/.config/opencode/fallback.log`

### Comandos de fallback:

```bash
# Health-check manual AHORA
~/.config/opencode/fallback-now.sh

# Ver logs
tail -f ~/.config/opencode/fallback.log

# Activar daemon automático (macOS launchd)
launchctl load ~/Library/LaunchAgents/com.dariomititelu.opencode-fallback.plist

# Desactivar daemon
launchctl unload ~/Library/LaunchAgents/com.dariomititelu.opencode-fallback.plist

# Ver estado daemon
launchctl list | grep opencode-fallback
```

### Garantías:

- ✅ **Sin saldo OpenRouter** → Usa modelos `:free` + Local
- ✅ **Rate limit / 429** → Rota a siguiente proveedor/modelo
- ✅ **Modelo deprecado / 404** → Salta al siguiente en cadena
- ✅ **Ollama caído** → Intenta reiniciar; si no, usa OpenRouter
- ✅ **Actualización continua** → Cache de modelos OpenRouter (1h), detecta nuevos `:free`
- ✅ **Cero cortes** → Fallback en <2s, transparente para el usuario

---

## Comandos

- Build: `npm run build`
- Test: `npm test`
- Dev: `npm run dev`
- Lint: `npm run lint`

---

## Convenciones

- ESM, 2 espacios, funciones puras
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- Rama por fase: `fase-N-nombre`