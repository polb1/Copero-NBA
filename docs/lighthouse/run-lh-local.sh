#!/bin/bash
# Uso: run-lh-local.sh <base_url> <lista de rutas> <carpeta de salida> <pasadas>
export CHROME_PATH="$LOCALAPPDATA/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
mkdir -p "$3"
for i in $(seq 1 "$4"); do while read u; do [ -z "$u" ] && continue; n=$(echo "$u" | sed 's#^/##;s#/#_#g'); n=${n:-home}
  for p in mobile desktop; do f=""; [ $p = desktop ] && f="--preset=desktop"; o="$3/$n.$p.$i.json"
    [ -s "$o" ] && continue
    timeout 180 npx -y lighthouse@12.6.0 "$1$u" $f --quiet --output=json --output-path="$o" --chrome-flags="--headless=new" >/dev/null 2>&1 || echo "fallo $u $p $i"
  done; done < "$2"; done
