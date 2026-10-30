# -*- coding: utf-8 -*-
"""Completa NBL Australia (desde nbl.com.au) y Greek Basket League (desde esake.gr)."""
import json
import re
import urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
DATA = "/Users/dariomititelu/codigo/copero-NBA/public/data/leagues.json"

GREEK = {
    "ΑΕΚ": "AEK Athens",
    "ΑΡΗΣ": "Aris Thessaloniki",
    "ΠΑΟΚ": "PAOK",
    "ΟΛΥΜΠΙΑΚΟΣ": "Olympiacos",
    "ΠΑΝΑΘΗΝΑΪΚΟΣ": "Panathinaikos",
    "ΠΕΡΙΣΤΕΡΙ": "Peristeri",
    "ΠΡΟΜΗΘΕΑΣ": "Promitheas Patras",
    "ΚΟΛΟΣΣΟΣ": "Kolossos Rhodes",
    "ΛΑΥΡΙΟ": "Lavrio",
    "ΜΑΡΟΥΣΙ": "Maroussi",
    "ΠΑΝΙΩΝΙΟΣ": "Panionios",
    "ΗΡΑΚΛΗΣ": "Iraklis",
    "ΡΟΔΟΣ": "Rodos",
    "ΚΑΡΔΙΤΣΑ": "Karditsa",
}


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def nbl_teams():
    html = get("https://nbl.com.au/")
    slugs = sorted(set(re.findall(r"/teams/([a-z0-9-]+)", html)))
    return [s.replace("-", " ").title() for s in slugs]


def greek_teams():
    html = get("https://www.esake.gr/el/action/EsakeTeams")
    titles = re.findall(r'title="([^"]{3,40})"', html)
    out = []
    for t in titles:
        up = t.strip().upper()
        if up in GREEK:
            name = GREEK[up]
            if name not in out:
                out.append(name)
    if len(out) < 8:
        # usar los griegos tal cual (sin duplicados)
        for t in titles:
            t = t.strip()
            if t and re.search(r"[Α-Ω]", t) and t not in out:
                out.append(t)
    return out


def main() -> None:
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)

    nbl = nbl_teams()
    if len(nbl) >= 8:
        data["NBL Australia"] = nbl
        print(f"NBL Australia: {len(nbl)} equipos")
    else:
        print(f"NBL Australia: solo {len(nbl)} encontrados, se mantiene lo anterior")

    gr = greek_teams()
    if len(gr) >= 8:
        data["Greek Basket League"] = gr
        print(f"Greek Basket League: {len(gr)} equipos")
    else:
        print(f"Greek: solo {len(gr)} encontrados, se mantiene lo anterior")

    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    print(f"Total: {len(data)} ligas, {sum(len(v) for v in data.values())} clubes")


if __name__ == "__main__":
    main()
