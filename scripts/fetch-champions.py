#!/usr/bin/env python3
"""Campeones NBA por temporada y títulos por franquicia desde Wikipedia (CC BY-SA).

Parsea la tabla con soporte real de rowspan/colspan: la tabla original los usa y
por eso un parser ingenuo perdía 26 temporadas.

Uso: python3 scripts/fetch-champions.py
"""
from __future__ import annotations

import datetime
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
    # restos de CSS que Wikipedia inyecta dentro de las celdas
    txt = re.sub(r"\.mw-parser-output.*$", "", txt)
    txt = re.sub(r"\{[^}]*\}", "", txt)
    return re.sub(r"\s+", " ", txt).strip(" ,.;")


def table_rows(table_html: str) -> list[list[str]]:
    """Tabla HTML -> matriz de texto aplicando rowspan y colspan."""
    grid: dict[tuple[int, int], str] = {}
    out: list[list[str]] = []
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, re.S)
    for r, row in enumerate(rows):
        col = 0
        for _tag, attrs, body in re.findall(r"<(td|th)([^>]*)>(.*?)</\1>", row, re.S):
            while (r, col) in grid:
                col += 1
            rs = re.search(r'rowspan="?(\d+)', attrs)
            cs = re.search(r'colspan="?(\d+)', attrs)
            rowspan = int(rs.group(1)) if rs else 1
            colspan = int(cs.group(1)) if cs else 1
            text = clean(body)
            for dr in range(rowspan):
                for dc in range(colspan):
                    grid[(r + dr, col + dc)] = text
            col += colspan
        width = max([c for (rr, c) in grid if rr == r], default=-1) + 1
        out.append([grid.get((r, c), "") for c in range(width)])
    return out


def main() -> None:
    data = api({"action": "parse", "page": "List_of_NBA_champions", "prop": "text"})
    page = (data.get("parse") or {}).get("text") or ""
    tables = re.findall(r'<table[^>]*class="[^"]*wikitable[^"]*".*?</table>', page, re.S)
    if len(tables) < 3:
        raise SystemExit("No se encontraron las tablas esperadas")

    champions = []
    for cells in table_rows(tables[1]):
        if len(cells) < 5:
            continue
        year = re.match(r"\s*((?:19|20)\d{2})", cells[0] or "")
        if not year:
            continue
        west, _coach, result, east = cells[1], cells[2], cells[3], cells[4]
        m = re.search(r"(\d+)\s*[–\-—]\s*(\d+)", result or "")
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2))
        winner, loser = (west, east) if a > b else (east, west)
        champions.append({"year": int(year.group(1)), "champion": winner,
                          "runnerUp": loser, "result": result.strip()})

    franchises = []
    for cells in table_rows(tables[2]):
        if len(cells) < 2 or not re.match(r"^\d+$", (cells[1] or "").strip()):
            continue
        franchises.append({"team": cells[0], "titles": int(cells[1]),
                           "losses": int(cells[2]) if len(cells) > 2 and cells[2].strip().isdigit() else None})
    franchises.sort(key=lambda r: (-r["titles"], r["team"]))

    years = {c["year"] for c in champions}
    missing = [y for y in range(1947, datetime.date.today().year + 1) if y not in years]
    OUT.write_text(json.dumps({
        "source": "https://en.wikipedia.org/wiki/List_of_NBA_champions",
        "license": "CC BY-SA 4.0",
        "updated": datetime.date.today().isoformat(),
        "champions": sorted(champions, key=lambda r: r["year"]),
        "franchises": franchises,
    }, ensure_ascii=False, indent=0))
    print(f"campeones={len(champions)} franquicias={len(franchises)} años_faltantes={missing}")


if __name__ == "__main__":
    main()
