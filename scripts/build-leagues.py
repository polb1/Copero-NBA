#!/usr/bin/env python3
"""
Completa todas las ligas con sus equipos reales de la temporada 2026-27
leyendo las páginas de temporada de Wikipedia (wikitexto, sin API key).

Escribe ~/codigo/copero-NBA/public/data/leagues.json  { liga: [ {name, ...} ] }
y ~/codigo/copero-NBA/public/data/leagueMeta.json    { liga: {source, teams} }

Uso: python3 scripts/build-leagues.py
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

DATA = os.path.expanduser("~/codigo/copero-NBA/public/data")
UA = "CoperoNBA/1.0 (contact dariomititelu)"

# liga del juego -> posibles títulos de temporada en Wikipedia (en orden)
PAGES = {
    "Liga ACB": ["2026–27 ACB season"],
    "Basketbol Süper Ligi": ["2026–27 Basketbol Süper Ligi"],
    "Lega Basket Serie A": ["2026–27 Lega Basket Serie A"],
    "Greek Basket League": ["2026–27 Greek Basketball League", "2026–27 Greek Basket League"],
    "Liga ABA": ["2026–27 ABA League", "2026–27 ABA League First Division"],
    "LNB Élite": ["2026–27 LNB Pro A", "2026–27 LNB Élite"],
    "Basketball Bundesliga": ["2026–27 Basketball Bundesliga"],
    "LKL": ["2026–27 LKL season"],
    "PLK": ["2026–27 PLK season"],
    "NBL Australia": ["2026–27 NBL season"],
    "B.League": ["2026–27 B.League season"],
    "KBL": ["2026–27 KBL season"],
    "PBA": ["2026–27 PBA season"],
    "CBA": ["2026–27 CBA season"],
    "Liga Nacional": ["2026–27 Liga Nacional de Básquet"],
    "NBB": ["2026–27 NBB season", "2026–27 Novo Basquete Brasil"],
    "Liga Portuguesa": ["2026–27 Liga Portuguesa de Basquetebol"],
    "VTB United League": ["2026–27 VTB United League"],
    "Liga Letona-Estonia": ["2026–27 Latvian-Estonian Basketball League"],
    "Ligat ha'Al": ["2026–27 Israeli Basketball Premier League"],
}


def fetch_wikitext(title):
    url = "https://en.wikipedia.org/w/index.php?action=raw&title=" + urllib.parse.quote(title.replace(" ", "_"))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            if r.status != 200:
                return None
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None


def clean_name(raw):
    """'[[FC Barcelona Bàsquet|Barça]]' -> 'FC Barcelona Bàsquet'."""
    text = raw.strip()
    m = re.match(r"\[\[([^|\]]+)(?:\|([^\]]+))?\]\]", text)
    if m:
        return (m.group(1) or m.group(2)).strip()
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip(" |}")


def teams_from_wikitext(text):
    """Extrae los equipos del cuadro de posiciones (| teamN=) o de una tabla de equipos."""
    teams = []
    for m in re.finditer(r"\|\s*name_[A-Za-z0-9&]+?\s*=\s*([^\n]+)", text):
        name = clean_name(m.group(1))
        if name and name not in teams:
            teams.append(name)
    if 6 <= len(teams) <= 30:
        return teams
    # Respaldo: filas de tablas con enlaces a clubes
    for m in re.finditer(r"^\|\s*\[\[([^|\]]+?)(?:\|[^\]]*)?\]\]", text, re.M):
        name = m.group(1).strip()
        if 3 < len(name) < 45 and name not in teams and not name.lower().startswith(("file", "image", "category")):
            teams.append(name)
    return teams


def main():
    leagues, meta = {}, {}
    for league, titles in PAGES.items():
        found = None
        for title in titles:
            text = fetch_wikitext(title)
            if not text:
                continue
            teams = teams_from_wikitext(text)
            if len(teams) >= 6:
                found = (title, teams)
                break
            time.sleep(1)
        if found:
            title, teams = found
            leagues[league] = teams
            meta[league] = {"source": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}", "teams": len(teams)}
            print(f"[ok] {league:26s} {len(teams):2d} equipos  ({title})")
        else:
            print(f"[--] {league:26s} sin datos")
        time.sleep(1.2)

    # Base: clubes del juego (clubs.ts), para no perder ligas sin página de Wikipedia.
    import re as _re
    src = open(os.path.expanduser("~/codigo/copero-NBA/src/data/clubs.ts"), encoding="utf-8").read()
    base = {}
    for name, league, _c, _t in _re.findall(
        r"\{ name: '([^']+)', league: '([^']+)', country: '([^']+)', tier: (\d) \}", src
    ):
        base.setdefault(league, []).append(name)

    merged = dict(base)
    for league, teams in leagues.items():
        prev = base.get(league, [])
        # Solo se acepta si es plausible (6-24 equipos) y no encoge la lista existente.
        if 6 <= len(teams) <= 24 and len(teams) >= len(prev):
            merged[league] = teams
        else:
            print(f"[keep] {league}: wikipedia {len(teams)} equipos, se mantiene la lista del juego ({len(prev)})")
    leagues = merged

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "leagues.json"), "w", encoding="utf-8") as f:
        json.dump(leagues, f, indent=1, ensure_ascii=False)
    with open(os.path.join(DATA, "leagueMeta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    print(f"\n{len(leagues)} ligas escritas en {DATA}/leagues.json")


if __name__ == "__main__":
    main()
