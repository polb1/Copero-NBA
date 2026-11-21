#!/bin/bash
# Uso: run-lh.sh <lista de rutas> <carpeta de salida>
export CHROME_PATH="$LOCALAPPDATA/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
while read u; do [ -z "$u" ] && continue; n=$(echo "$u" | sed 's#^/##;s#/#_#g'); n=${n:-home}
  for p in mobile desktop; do f=""; [ $p = desktop ] && f="--preset=desktop"
    [ -s "$2/$n.$p.json" ] && continue
    timeout 180 npx -y lighthouse@12.6.0 "https://anillero.com$u" $f --quiet --output=json --output-path="$2/$n.$p.json" --chrome-flags="--headless=new" >/dev/null 2>&1 || echo "fallo $u $p"
  done; done < "$1"
