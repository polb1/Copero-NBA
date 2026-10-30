#!/usr/bin/env python3
"""Escudos NBA y EuroLeague desde el CDN de ESPN (logos oficiales, sin clave).

Además normaliza crestMap.json: todos los valores pasan a "/crests/<archivo>".
"""
from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRESTS = ROOT / "public" / "crests"
MAP = ROOT / "src" / "actualidad" / "crestMap.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"

LEAGUES = {
    "nba": "nba",
    "euroleague": "eu",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main() -> None:
    mapping = json.loads(MAP.read_text())
    # 1) normalizar rutas antiguas
    norm = {}
    for name, val in mapping.items():
        val = val.strip()
        if not val.startswith("/"):
            val = "/crests/" + val.lstrip("./")
        norm[name] = val
    mapping = norm

    added = 0
    for espn, prefix in LEAGUES.items():
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/{espn}/teams"
        try:
            data = json.loads(fetch(url))
        except Exception as err:  # noqa: BLE001
            print(f"[{espn}] error: {err}")
            continue
        teams = (data.get("sports") or [{}])[0].get("leagues", [{}])[0].get("teams", [])
        print(f"[{espn}] equipos: {len(teams)}")
        for entry in teams:
            team = entry.get("team") or {}
            name = team.get("displayName") or team.get("name")
            abbr = (team.get("abbreviation") or slug(name))[:6]
            logos = team.get("logos") or []
            href = next((l.get("href") for l in logos if l.get("href")), None)
            if not name or not href:
                continue
            dest = CRESTS / f"{prefix}-{slug(abbr)}.png"
            if not dest.exists() or dest.stat().st_size < 500:
                try:
                    dest.write_bytes(fetch(href))
                except Exception as err:  # noqa: BLE001
                    print("  dl", name, err)
                    continue
            mapping[name] = f"/crests/{dest.name}"
            added += 1

    # 2) alias de nombres que usan los resultados/plantillas
    alias = {
        "Real Madrid": "real-madrid.png",
        "FC Barcelona": "fc-barcelona.png",
        "FC Barcelona Bàsquet": "fc-barcelona.png",
        "Baskonia": "baskonia.png",
        "Saski Baskonia": "baskonia.png",
        "Olympiacos Piraeus": "olympiacos.png",
        "Olympiacos": "olympiacos.png",
        "Panathinaikos": "panathinaikos.png",
        "Partizan": "partizan.png",
        "AS Monaco": "as-monaco.png",
        "Fenerbahçe": "fenerbahce.png",
        "Joventut Badalona": "joventut-badalona.png",
        "Basket Zaragoza": "basket-zaragoza.png",
        "Bàsquet Girona": "basquet-girona.png",
        "Força Lleida CE": "forca-lleida-ce.png",
        "Chiba Jets": "chiba-jets.png",
    }
    for name, fname in alias.items():
        if (CRESTS / fname).exists():
            mapping.setdefault(name, f"/crests/{fname}")

    MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print(f"mapeados={len(mapping)} (nuevos ESPN={added})")


if __name__ == "__main__":
    main()
