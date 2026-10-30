#!/usr/bin/env python3
"""Último recurso: primera imagen del infobox en el HTML del artículo."""
import json, re, time, unicodedata, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRESTS = ROOT / "public" / "crests"
MAP = ROOT / "src" / "actualidad" / "crestMap.json"
UA = "CoperoNBA/1.0 (https://anillero.com; contact dariomititelu)"

def slug(n):
    s = unicodedata.normalize("NFD", n.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "team"

def api(host, params):
    params = {**params, "format": "json", "formatversion": "2"}
    url = f"https://{host}/w/api.php?{urllib.parse.urlencode(params)}"
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(5 * (i + 1)); continue
            return {}
        except Exception:
            time.sleep(2)
    return {}

def title_for(host, name):
    d = api(host, {"action": "query", "titles": name, "redirects": "1"})
    for p in (d.get("query") or {}).get("pages") or []:
        if not p.get("missing") and p.get("title"):
            return p["title"]
    s = api(host, {"action": "query", "generator": "search", "gsrsearch": name, "gsrlimit": "1"})
    for p in (s.get("query") or {}).get("pages") or []:
        return p.get("title")
    return None

def img_from_html(host, title):
    d = api(host, {"action": "parse", "page": title, "prop": "text"})
    html = (d.get("parse") or {}).get("text") or ""
    cands = []
    for m in re.finditer(r'src="(//(?:upload|thumb)\.wikimedia\.org/[^"]+)"', html):
        url = "https:" + m.group(1)
        if not re.search(r'\.(png|jpe?g)(\?|$)', url, re.I):
            continue
        if re.search(r'(Kit_|Flag_|Icon_|Commons-logo|Wiki|Question_book)', url, re.I):
            continue
        score = 2 if re.search(r'logo', url, re.I) else 1
        cands.append((score, url))
    if not cands:
        return None
    cands.sort(key=lambda c: -c[0])
    return cands[0][1]


FORCE = {
    "Bandırma Bordo Basketbol": "Bandırma Bordo Basketbol",
    "Gravelines-Dunkerque": "BCM Gravelines-Dunkerque",
    "Hapoel Be'er Sheva B.C.": "Hapoel Be'er Sheva B.C.",
    "Hapoel Galil Elyon": "Hapoel Galil Elyon",
    "Napoli Basket": "Napoli Basket",
    "Telekom Baskets Bonn": "Telekom Baskets Bonn",
    "Tofaş S.K.": "Tofaş S.K.",
    "Toyama Grouses": "Toyama Grouses",
    "Twarde Pierniki Toruń": "Twarde Pierniki Toruń",
    "Wilki Morskie Szczecin": "Wilki Morskie Szczecin",
    "Yokohama B-Corsairs": "Yokohama B-Corsairs",
    "アルティーリ千葉A千葉": "アルティーリ千葉",
}


def main():
    mapping = json.loads(MAP.read_text())
    leagues = json.loads((ROOT / "public/data/leagues.json").read_text())
    names = sorted({(c if isinstance(c, str) else c.get("name", "")) for v in leagues.values() for c in v})
    missing = [n for n in names if n not in mapping]
    for name in missing:
        host = "ja.wikipedia.org" if re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", name) else "en.wikipedia.org"
        title = FORCE.get(name) or title_for(host, name)
        time.sleep(2.5)
        url = img_from_html(host, title) if title else None
        time.sleep(2.5)
        dest = CRESTS / f"{slug(name)}.png"
        ok = False
        if url:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=40) as r:
                    blob = r.read()
                if len(blob) > 600:
                    dest.write_bytes(blob); ok = True
            except Exception as e:
                print("  dl:", e)
        if ok:
            mapping[name] = f"/crests/{dest.name}"
            print(f"OK {name} -> {mapping[name]}")
        else:
            print(f"FALLO {name} ({title})")
        MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print("total:", len(mapping), "/", len(names))

if __name__ == "__main__":
    main()
