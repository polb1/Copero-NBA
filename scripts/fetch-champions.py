#!/usr/bin/env python3
"""Descarga los campeones NBA por temporada y el ranking de franquicias desde
Wikipedia (CC BY-SA) y los guarda en public/data/nba-champions.json.

Uso: python3 scripts/fetch-champions.py
"""
from __future__ import annotations

import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "nba-champions.json"
API = "https://en.wikipedia.org/w/api.php"
UA = "Anillero/1.0 (https://anillero.com; contact)"


def api(params: dict) -> dict:
    params = {**params, "format": "json", "formatversion": "2"}
    req = urllib.request.Request(f"{API}?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode())


def clean(cell: str) -> str:
    """Quita HTML, notas al pie y los contadores entre paréntesis."""
    txt = re.sub(r"<[^>]+>", "", cell)
    txt = html.unescape(txt)
    txt = re.sub(r"\[[^\]]*\]", "", txt)          # [i], [b]
    txt = re.sub(r"\((?:[^()]*)\)", "", txt)      # (1), (2, 1–0), (1947)
    txt = re.sub(r"†", "", txt)
    return re.sub(r"\s+", " ", txt).strip(" ,.;")


def main() -> None:
    data = api({"action": "parse", "page": "List_of_NBA_champions", "prop": "text"})
    page = (data.get("parse") or {}).get("text") or ""
    tables = re.findall(r'<table[^>]*class="[^"]*wikitable[^"]*".*?</table>', page, re.S)
    if len(tables) < 2:
        raise SystemExit("No se encontraron las tablas esperadas")

    # --- Campeones por temporada
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tables[1], re.S)
    champions = []
    prev = [""] * 5
    for row in rows:
        cells = [re.sub(r"<[^>]+>", "", c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
        cells = [clean(c) for c in cells]
        # rowspan: la tabla repite celdas; rellenamos con la fila anterior
        if 0 < len(cells) < 5:
            cells = cells + prev[len(cells):5]
        if len(cells) >= 5:
            prev = cells[:5]
        if len(cells) < 5:
            continue
        year_txt = re.match(r"\s*((?:19|20)\d{2})", cells[0] or "")
        if not year_txt:
            continue
        year = year_txt.group(1)
        west, _coach, result, east = cells[1:5]
        m = re.search(r"(\d+)\s*[–\-—]\s*(\d+)", result or "")
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2))
        winner, loser = (west, east) if a > b else (east, west)
        champions.append({"year": int(year), "champion": winner, "runnerUp": loser, "result": result.strip()})

    # --- Títulos por franquicia
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tables[2], re.S)
    franchise = []
    for row in rows:
        cells = [clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
        if len(cells) < 2 or not cells[1].isdigit():
            continue
        franchise.append({"team": cells[0], "titles": int(cells[1]),
                          "losses": int(cells[2]) if len(cells) > 2 and cells[2].isdigit() else None})
    franchise.sort(key=lambda r: (-r["titles"], r["team"]))

    OUT.write_text(json.dumps({
        "source": "https://en.wikipedia.org/wiki/List_of_NBA_champions",
        "license": "CC BY-SA 4.0",
        "updated": __import__("datetime").date.today().isoformat(),
        "champions": sorted(champions, key=lambda r: r["year"]),
        "franchises": franchise,
    }, ensure_ascii=False, indent=0))
    print(f"campeones={len(champions)} franquicias={len(franchise)}")


if __name__ == "__main__":
    main()
