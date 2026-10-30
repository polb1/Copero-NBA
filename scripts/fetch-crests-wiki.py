#!/usr/bin/env python3
"""Descarga escudos reales desde el infobox de Wikipedia y regenera crestMap.json.

Estrategia por equipo:
1. Resolver el artículo (título exacto o primera coincidencia de búsqueda).
2. Leer el wikitexto de la sección 0 y sacar `| image =` / `| logo =`.
3. Resolver File:X a una miniatura PNG de 220 px (iiurlwidth).
4. Guardar en public/crests/<slug>.png

Va lento a propósito (1,1 s entre peticiones) porque Wikipedia devuelve 429 con ráfagas.

Uso: python3 scripts/fetch-crests-wiki.py [--limit N]
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRESTS = ROOT / "public" / "crests"
LEAGUES = ROOT / "public" / "data" / "leagues.json"
MAP = ROOT / "src" / "actualidad" / "crestMap.json"
API = "https://en.wikipedia.org/w/api.php"
UA = "CoperoNBA/1.0 (https://anillero.com; contact dariomititelu)"
DELAY = 1.1
STOP = {"bc", "basketball", "basket", "club", "baloncesto", "sk", "basketbol", "koleji",
        "spor", "kulubu", "kk", "bk", "sport", "sports", "team", "the", "de", "del", "of"}


def norm(s: str) -> list[str]:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return [t for t in s.split() if t not in STOP]


def slug(s: str) -> str:
    return "-".join(norm(s)) or re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def api(params: dict) -> dict:
    params = {**params, "format": "json", "formatversion": "2"}
    url = f"{API}?{urllib.parse.urlencode(params)}"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(6 * (attempt + 1))
                continue
            return {}
        except Exception:  # noqa: BLE001
            time.sleep(2)
    return {}


def resolve_title(name: str) -> str | None:
    q = api({"action": "query", "titles": name, "redirects": "1"})
    for p in (q.get("query") or {}).get("pages") or []:
        if p.get("missing"):
            break
        if p.get("title"):
            return p["title"]
    s = api({"action": "query", "generator": "search", "gsrsearch": f"{name} basketball",
             "gsrlimit": "1", "gsrinfo": "totalhits"})
    for p in (s.get("query") or {}).get("pages") or []:
        return p.get("title")
    return None


def infobox_file(title: str) -> str | None:
    d = api({"action": "parse", "page": title, "prop": "wikitext", "section": "0"})
    wt = ((d.get("parse") or {}).get("wikitext") or "")
    m = re.search(r"\|\s*(?:image|logo|image_file|badge)\s*=\s*([^\n|]+)", wt)
    if not m:
        return None
    val = m.group(1).strip()
    val = re.sub(r"^\[\[|\]\]$", "", val)
    val = val.split("|")[0].strip()
    if not val:
        return None
    return val if val.lower().startswith("file:") else f"File:{val}"


def file_url(file_title: str) -> str | None:
    d = api({"action": "query", "titles": file_title, "prop": "imageinfo",
             "iiprop": "url", "iiurlwidth": "220"})
    for p in (d.get("query") or {}).get("pages") or []:
        info = (p.get("imageinfo") or [{}])[0]
        return info.get("thumburl") or info.get("url")
    return None


def teams() -> list[str]:
    data = json.loads(LEAGUES.read_text())
    out = set()
    for clubs in data.values():
        for c in clubs:
            name = c if isinstance(c, str) else c.get("name", "")
            if name:
                out.add(name)
    return sorted(out)


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    mapping: dict[str, str] = json.loads(MAP.read_text()) if MAP.exists() else {}
    names = teams()
    missing = [n for n in names if n not in mapping]
    if limit:
        missing = missing[:limit]
    print(f"equipos={len(names)} mapeados={len(mapping)} pendientes={len(missing)}", flush=True)

    for i, name in enumerate(missing, 1):
        title = resolve_title(name)
        time.sleep(DELAY)
        got = None
        if title:
            file_title = infobox_file(title)
            time.sleep(DELAY)
            if file_title:
                url = file_url(file_title)
                time.sleep(DELAY)
                if url:
                    dest = CRESTS / f"{slug(name)}.png"
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": UA})
                        with urllib.request.urlopen(req, timeout=40) as r:
                            blob = r.read()
                        if len(blob) > 600:
                            dest.write_bytes(blob)
                            got = f"/crests/{dest.name}"
                    except Exception as err:  # noqa: BLE001
                        print(f"   dl error {name}: {err}", flush=True)
        if got:
            mapping[name] = got
            print(f"[{i}/{len(missing)}] {name} -> {got}", flush=True)
        else:
            print(f"[{i}/{len(missing)}] {name} -> SIN ESCUDO ({title})", flush=True)
        if i % 10 == 0:
            MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))

    MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print(f"crestMap.json: {len(mapping)}/{len(names)}", flush=True)


if __name__ == "__main__":
    main()
