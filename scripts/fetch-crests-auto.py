#!/usr/bin/env python3
"""Completa los escudos que faltan y regenera src/actualidad/crestMap.json.

- Lee public/data/leagues.json (todos los equipos de todas las ligas).
- Empareja cada equipo con un archivo de public/crests (fuzzy: normaliza acentos,
  quita sufijos tipo BC / S.K. / (basketball) y acepta subconjuntos de tokens).
- Los que no tienen escudo se descargan del artículo de Wikipedia (pageimages/original).

Uso: python3 scripts/fetch-crests-auto.py [--only-download]
"""
from __future__ import annotations

import difflib
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRESTS = ROOT / "public" / "crests"
LEAGUES = ROOT / "public" / "data" / "leagues.json"
MAP = ROOT / "src" / "actualidad" / "crestMap.json"

UA = "CoperoNBA/1.0 (crest fetch; contact dariomititelu)"
STOP = {
    "bc", "b c", "basketball", "basket", "club", "baloncesto", "s k", "sk", "basketbol",
    "koleji", "spor", "kulubu", "kk", "bk", "sport", "sports", "team", "the", "de", "del",
    "of", "ce", "cb", "ss", "pallacanestro", "b c", "sa", "sad",
}


def norm(s: str) -> list[str]:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return [t for t in s.split() if t and t not in STOP]


def slug(s: str) -> str:
    return "-".join(norm(s)) or re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def teams() -> list[str]:
    data = json.loads(LEAGUES.read_text())
    out = set()
    for clubs in data.values():
        for c in clubs:
            name = c if isinstance(c, str) else c.get("name", "")
            if name:
                out.add(name)
    return sorted(out)


def build_map(names: list[str]) -> tuple[dict[str, str], list[str]]:
    files = [f for f in CRESTS.iterdir() if f.suffix.lower() in {".png", ".webp", ".jpg", ".jpeg", ".svg"}]
    index = {f.stem: norm(f.stem) for f in files}
    mapping: dict[str, str] = {}
    missing: list[str] = []
    for name in names:
        tt = norm(name)
        best, score = None, 0.0
        for stem, toks in index.items():
            if not toks:
                continue
            a, b = set(tt), set(toks)
            jac = len(a & b) / max(1, len(a | b))
            sub = 1.0 if (a and b and (a <= b or b <= a)) else 0.0
            ratio = difflib.SequenceMatcher(None, " ".join(tt), " ".join(toks)).ratio() * 0.95
            sc = max(jac, sub, ratio)
            if sc > score:
                best, score = stem, sc
        if best and score >= 0.62:
            mapping[name] = f"/crests/{next(f.name for f in files if f.stem == best)}"
        else:
            missing.append(name)
    return mapping, missing


def wiki_image(name: str) -> str | None:
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"{name} basketball club", "gsrlimit": "1",
        "prop": "pageimages", "piprop": "original",
    })
    url = f"https://en.wikipedia.org/w/api.php?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print(f"[wiki] {name}: {err}")
        return None
    pages = (data.get("query") or {}).get("pages") or {}
    for page in pages.values():
        src = ((page.get("original") or {}).get("source") or "").strip()
        if src:
            return src
    return None


def download(name: str) -> str | None:
    src = wiki_image(name)
    if not src:
        return None
    ext = Path(urllib.parse.urlparse(src).path).suffix.lower() or ".png"
    if ext not in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
        ext = ".png"
    dest = CRESTS / f"{slug(name)}{ext}"
    if dest.exists() and dest.stat().st_size > 800:
        return f"/crests/{dest.name}"
    req = urllib.request.Request(src, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            blob = r.read()
    except Exception as err:  # noqa: BLE001
        print(f"[dl] {name}: {err}")
        return None
    if len(blob) < 800:
        return None
    dest.write_bytes(blob)
    return f"/crests/{dest.name}"


def main() -> None:
    only_download = "--only-download" in sys.argv
    names = teams()
    mapping, missing = build_map(names)
    print(f"equipos={len(names)} mapeados={len(mapping)} sin_escudo={len(missing)}")
    if not only_download:
        for i, name in enumerate(missing, 1):
            got = download(name)
            if got:
                mapping[name] = got
                print(f"[{i}/{len(missing)}] {name} -> {got}")
            else:
                print(f"[{i}/{len(missing)}] {name} -> SIN ESCUDO")
            time.sleep(0.25)
    MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print(f"crestMap.json: {len(mapping)} equipos")


if __name__ == "__main__":
    main()
