#!/usr/bin/env python3
"""Reintento para equipos sin escudo: usa pageimages y, si falla, el HTML del infobox."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRESTS = ROOT / "public" / "crests"
MAP = ROOT / "src" / "actualidad" / "crestMap.json"
API = "https://en.wikipedia.org/w/api.php"
UA = "CoperoNBA/1.0 (https://anillero.com; contact dariomititelu)"

TARGETS = {
    "Bandırma Bordo Basketbol": "Bandırma Bordo Basketbol",
    "Dijon": "JDA Dijon Basket",
    "Esenler Erokspor (basketball)": "Esenler Erokspor",
    "Força Lleida CE": "Força Lleida Club Esportiu",
    "Gravelines-Dunkerque": "BCM Gravelines-Dunkerque",
    "Hapoel Be'er Sheva B.C.": "Hapoel Be'er Sheva B.C.",
    "Hapoel Galil Elyon": "Hapoel Galil Elyon",
    "Limoges": "Limoges CSP",
    "Maroussi": "Maroussi B.C.",
    "Napoli Basket": "Napoli Basket",
    "Rodos": "Kolossos Rodou B.C.",
    "Slovan Bratislava": "Slovan Bratislava (basketball)",
    "Trabzonspor B.K.": "Trabzonspor Basketball",
}


def slug(name: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", name.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def api(params: dict) -> dict:
    params = {**params, "format": "json", "formatversion": "2"}
    url = f"{API}?{urllib.parse.urlencode(params)}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            return {}
        except Exception:  # noqa: BLE001
            time.sleep(2)
    return {}


def thumb_from_pageimages(title: str) -> str | None:
    d = api({"action": "query", "titles": title, "prop": "pageimages", "piprop": "original"})
    for p in (d.get("query") or {}).get("pages") or []:
        src = ((p.get("original") or {}).get("source") or "").strip()
        if src:
            return src
    return None


def thumb_from_html(title: str) -> str | None:
    d = api({"action": "parse", "page": title, "prop": "text", "section": "0"})
    html = ((d.get("parse") or {}).get("text") or "")
    m = re.search(r'src="(https://upload\.wikimedia\.org/wikipedia/[^"]+\.(?:png|jpg|svg)[^"]*)"', html)
    if not m:
        return None
    url = m.group(1)
    if url.endswith(".svg.png"):
        return url
    return url


def download(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            blob = r.read()
        if len(blob) < 600:
            return False
        dest.write_bytes(blob)
        return True
    except Exception as err:  # noqa: BLE001
        print("   dl:", err)
        return False


def main() -> None:
    mapping = json.loads(MAP.read_text())
    for name, title in TARGETS.items():
        if name in mapping:
            continue
        url = thumb_from_pageimages(title) or thumb_from_html(title)
        time.sleep(1.2)
        dest = CRESTS / f"{slug(name)}.png"
        if url and download(url, dest):
            mapping[name] = f"/crests/{dest.name}"
            print(f"OK {name} -> {mapping[name]}")
        else:
            print(f"FALLO {name} ({title}) url={url}")
        time.sleep(1.2)
    MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print("total:", len(mapping))


if __name__ == "__main__":
    main()
