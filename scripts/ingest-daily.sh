#!/bin/bash
# Ingesta diaria de anillero.com: fuentes -> out/ -> public/data.
# No publica nada: deja los datos listos y resume el estado.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

echo "== ingest $(date '+%Y-%m-%d %H:%M')"
python3 ingest.py run --leagues nba acb euroleague bsl gbl
echo
echo "== sync a public/data"
python3 scripts/sync-out-to-site.py
