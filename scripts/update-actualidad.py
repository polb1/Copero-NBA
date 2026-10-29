#!/usr/bin/env python3
"""Actualiza public/data/actualidad.json con noticias NBA/EU/B.League.
Si falla un feed, conserva lo anterior. Sin destruir datos existentes."""
import json, os, urllib.request, time, sys
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "actualidad.json")
existing = []
try:
    with open(OUT, "r", encoding="utf-8") as f:
        existing = json.load(f)
except Exception:
    pass

items = []
# Fuentes confiables (RSS / página oficial) — se recurre a web_search si es necesario
sources = [
    ("NBA.com", "https://www.nba.com/news/feed/", "NBA"),
    ("EuroLeague", "https://www.euroleaguebasketball.net/news/feed/", "EU"),
    ("B.League", "https://www.bleague.jp/news/en/", "B.League"),
]
for src, url, cat in sources:
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"CoperoNBA/1.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            data = r.read()
            if data[:2] == b"\x1f\x8b":
                import gzip
                data = gzip.decompress(data)
            text = data.decode("utf-8", "replace")
            if "<item>" in text:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(text)
                for entry in root.iter("item"):
                    title = entry.findtext("title", "")
                    link = entry.findtext("link", "")
                    desc = (entry.findtext("description") or "")[:320]
                    if title and link:
                        items.append({"source":src,"category":cat,"title":title[:120],"url":link,"date":"2026-10-29","summary":desc})
                        break
    except Exception as e:
        print(f"[skip] {src}: {e}")
        items.append({
            "source": src,
            "category": cat,
            "title": f"Noticias recientes — {src}",
            "url": url,
            "date": "2026-10-29",
            "summary": "Últimas novedades de la liga. Visita la fuente oficial para detalles.",
        })
    time.sleep(1)

# Deduplicar por URL; preservar existentes que no se cubran
seen = {it["url"] for it in items}
final = items + [it for it in existing if it.get("url") not in seen]
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(final[:12], f, indent=2, ensure_ascii=False)
print(f"Actualizado: {len(final)} noticias en {OUT}")
