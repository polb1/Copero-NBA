#!/usr/bin/env python3
"""Escudos vía Wikidata (P154 logo / P18 imagen) y Special:FilePath de Commons."""
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

def get(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(4 * (i + 1)); continue
            return None
        except Exception:
            time.sleep(2)
    return None

def _file_from_entities(d):
    for ent in (d.get("entities") or {}).values():
        claims = (ent or {}).get("claims") or {}
        for prop in ("P154", "P18", "P15"):
            if prop in claims:
                try:
                    return claims[prop][0]["mainsnak"]["datavalue"]["value"]
                except Exception:
                    continue
    return None


def logo_file(host, name):
    q = urllib.parse.urlencode({"action": "wbgetentities", "format": "json", "sites": host,
                                "titles": name, "props": "claims|sitelinks"})
    raw = get(f"https://www.wikidata.org/w/api.php?{q}")
    if raw:
        got = _file_from_entities(json.loads(raw))
        if got:
            return got
    # búsqueda por nombre
    q2 = urllib.parse.urlencode({"action": "wbsearchentities", "format": "json",
                                 "search": name, "language": "en", "limit": "3"})
    raw2 = get(f"https://www.wikidata.org/w/api.php?{q2}")
    if not raw2:
        return None
    try:
        hits = json.loads(raw2).get("search") or []
    except Exception:
        return None
    for hit in hits[:2]:
        qid = hit.get("id")
        if not qid:
            continue
        q3 = urllib.parse.urlencode({"action": "wbgetentities", "format": "json",
                                     "ids": qid, "props": "claims"})
        raw3 = get(f"https://www.wikidata.org/w/api.php?{q3}")
        if raw3:
            got = _file_from_entities(json.loads(raw3))
            if got:
                return got
    return None

def main():
    mapping = json.loads(MAP.read_text())
    leagues = json.loads((ROOT / "public/data/leagues.json").read_text())
    names = sorted({(c if isinstance(c, str) else c.get("name", "")) for v in leagues.values() for c in v})
    missing = [n for n in names if n not in mapping]
    print("pendientes:", len(missing), flush=True)
    for name in missing:
        host = "jawiki" if re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", name) else "enwiki"
        fname = logo_file(host, name)
        time.sleep(0.6)
        ok = False
        if fname:
            url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(fname.replace(" ", "_")) + "?width=220"
            blob = get(url)
            time.sleep(0.6)
            if blob and len(blob) > 600:
                dest = CRESTS / f"{slug(name)}.png"
                dest.write_bytes(blob)
                mapping[name] = f"/crests/{dest.name}"
                ok = True
                print(f"OK {name} -> {mapping[name]}", flush=True)
        if not ok:
            print(f"FALLO {name}", flush=True)
        MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=0, sort_keys=True))
    print("total:", len(mapping), "/", len(names))

if __name__ == "__main__":
    main()
