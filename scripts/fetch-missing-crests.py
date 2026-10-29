#!/usr/bin/env python3
"""Descarga los escudos que faltan desde el infobox de Wikipedia.

Mismo criterio que los 168 escudos ya incluidos: son marcas de sus clubes y se
muestran solo para identificarlos. Se lee el wikitexto del artículo (la API de
MediaWiki está limitada por rate limit) y se descarga el archivo del infobox
renderizado en PNG.

Uso: python3 scripts/fetch-missing-crests.py
"""
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

UA = "CoperoNBA/1.0 (crest fetch; contact dariomititelu)"
CLUBS = [
    ("LDLC ASVEL", ["ASVEL Basket", "LDLC ASVEL Basket"], "ldlc-asvel"),
    ("Maccabi Tel Aviv", ["Maccabi Tel Aviv B.C."], "maccabi-tel-aviv"),
    ("Hapoel Tel Aviv", ["Hapoel Tel Aviv B.C."], "hapoel-tel-aviv"),
    ("VEF Rīga", ["BK VEF Rīga", "VEF Rīga"], "vef-riga"),
    ("Obras Sanitarias", ["Obras Sanitarias", "Club Atlético Obras Sanitarias"], "obras-sanitarias"),
    ("Chiba Jets", ["Chiba Jets", "Chiba Jets Funabashi"], "chiba-jets"),
    ("Illinois", ["Illinois Fighting Illini men's basketball", "Illinois Fighting Illini"], "illinois"),
], "hiroshima-dragonflies"),
    ("Nagoya Diamond Dolphins", ["Nagoya Diamond Dolphins"], "nagoya-diamond-dolphins"),
    ("Kawasaki Brave Thunders", ["Kawasaki Brave Thunders"], "kawasaki-brave-thunders"),
    ("Sunrockers Shibuya", ["Sunrockers Shibuya"], "sunrockers-shibuya"),
    ("Gunma Crane Thunders", ["Gunma Crane Thunders"], "gunma-crane-thunders"),
    ("Levanga Hokkaido", ["Levanga Hokkaido"], "levanga-hokkaido"),
    ("Akita Northern Happinets", ["Akita Northern Happinets"], "akita-northern-happinets"),
    ("Osaka Evessa", ["Osaka Evessa"], "osaka-evessa"),
    ("Kyoto Hannaryz", ["Kyoto Hannaryz"], "kyoto-hannaryz"),
    ("Shimane Susanoo Magic", ["Shimane Susanoo Magic"], "shimane-susanoo-magic"),
    ("Sendai 89ers", ["Sendai 89ers"], "sendai-89ers"),
    ("Shiga Lakes", ["Shiga Lakes"], "shiga-lakes"),
    ("Saga Ballooners", ["Saga Ballooners"], "saga-ballooners"),
    ("Nagasaki Velca", ["Nagasaki Velca"], "nagasaki-velca"),
    ("Koshigaya Alphas", ["Koshigaya Alphas"], "koshigaya-alphas"),
    ("Mikawa Seahorses", ["Seahorses Mikawa", "Mikawa Seahorses"], "mikawa-seahorses"),
    ("Fighting Eagles Nagoya", ["Fighting Eagles Nagoya"], "fighting-eagles-nagoya"),
    ("Toyama Grouses", ["Toyama Grouses"], "toyama-grouses"),
    ("Yokohama B-Corsairs", ["Yokohama B-Corsairs"], "yokohama-b-corsairs"),
    ("Kagawa Five Arrows", ["Kagawa Five Arrows"], "kagawa-five-arrows"),
]
OUT = Path("public/crests")
LOGO_RE = re.compile(r"\|\s*(?:logo|image|crest)\s*=\s*([^\n|}]+)", re.I)


def fetch(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as res:
        data = res.read()
    return data if raw else data.decode("utf-8", "replace")


def logo_file(page: str):
    """Nombre del archivo del escudo según el wikitexto del infobox."""
    url = "https://en.wikipedia.org/w/index.php?title=" + urllib.parse.quote(page.replace(" ", "_")) + "&action=raw"
    wiki = fetch_retry(url)
    if wiki.startswith("#REDIRECT") or wiki.startswith("#redirect"):
        target = re.search(r"\[\[([^\]]+)\]\]", wiki)
        if target:
            return logo_file(target.group(1))
        return None
    for match in LOGO_RE.finditer(wiki):
        name = match.group(1).strip()
        name = re.sub(r"^\[\[(?:File|Image):", "", name, flags=re.I)
        name = name.split("|")[0].strip().strip("[]")
        if name and not name.lower().endswith((".ogg", ".webm")):
            return name
    return None


def fetch_retry(url: str, raw: bool = False, tries: int = 4):
    last = None
    for attempt in range(tries):
        try:
            return fetch(url, raw)
        except Exception as err:  # noqa: BLE001
            last = err
            if "429" in str(err):
                time.sleep(8 * (attempt + 1))
                continue
            raise
    raise last


def download(name: str, slug: str):
    url = "https://en.wikipedia.org/wiki/Special:Redirect/file/" + urllib.parse.quote(name.replace(" ", "_"))
    if name.lower().endswith(".svg"):
        url += "?width=400"
    data = fetch_retry(url, raw=True)
    if len(data) < 1200 or len(data) > 900_000:
        raise ValueError(f"descarga demasiado pequeña ({len(data)} bytes)")
    if data[:4] not in (b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1", b"GIF8", b"RIFF"):
        raise ValueError("no parece una imagen")
    path = OUT / f"{slug}.png"
    path.write_bytes(data)
    return path, len(data)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    saved = []
    for club, pages, slug in CLUBS:
        ok = False
        for page in pages:
            try:
                name = logo_file(page)
                if not name:
                    print(f"[miss] {club}: sin 'logo' en el infobox de {page}")
                    continue
                path, size = download(name, slug)
                print(f"[ok] {club} ← {name} → {path} ({size} bytes)")
                saved.append(club)
                ok = True
                break
            except Exception as err:  # noqa: BLE001
                print(f"[warn] {club} ({page}): {err}")
            finally:
                time.sleep(1.0)
        if not ok:
            print(f"[miss] {club}: no se pudo descargar")
    print(f"\n{len(saved)}/{len(CLUBS)} escudos descargados")


if __name__ == "__main__":
    main()
