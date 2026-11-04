#!/usr/bin/env python3
"""Genera páginas de jugador usando datos de ESPN (ya tenemos los rosters).

Uso: python3 scripts/gen-player-pages.py
"""
from __future__ import annotations

import datetime
import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path
import html

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
OUT_DIR = ROOT / "dist" / "jugador"
API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"

def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Anillero/1.0 (https://anillero.com; contact)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def slugify(s: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def esc(s: str) -> str:
    return html.escape(str(s or ""))


def main() -> None:
    import re
    ROOT = Path(__file__).resolve().parent.parent
    DATA_DIR = ROOT / "public" / "data"
    OUT_DIR = ROOT / "dist" / "jugador"
    DATA_DIR.mkdir(exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Cargar ligas y equipos nuestros para cruzar
    standings = json.loads((Path("public/data/standings.json")).read_text())
    leagues = json.loads((Path("public/data/leagues.json")).read_text())
    results = json.loads((Path("public/data/results.json")).read_text())
    fixtures = json.loads((Path("public/data/fixtures.json")).read_text())

    team_name_to_liga = {}
    for liga, clubs in leagues.items():
        for c in clubs:
            name = c if isinstance(c, str) else c.get("name", "")
            if name:
                team_name_to_liga[name] = liga

    # --- Obtener rosters de NBA desde ESPN ---
    print("Descargando rosters NBA de ESPN...")
    teams_data = fetch("https://site.api.espn.com/apis/v2/sports/basketball/nba/teams")
    all_players = []
    
    for team in teams_data.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
        team_info = team.get("team", {})
        team_id = team_info.get("id")
        team_name = team_info.get("displayName", "")
        team_abbr = team_info.get("abbreviation", "")
        
        # Obtener roster de cada equipo
        try:
            roster_url = f"https://site.api.espn.com/apis/v2/sports/basketball/nba/teams/{team_id}/roster"
            roster_data = fetch(roster_url)
            for athlete in roster_data.get("athletes", []):
                p = athlete.get("athlete", {})
                all_players.append({
                    "id": p.get("id"),
                    "name": p.get("displayName", ""),
                    "first_name": p.get("firstName", ""),
                    "last_name": p.get("lastName", ""),
                    "position": p.get("position", {}).get("abbreviation", ""),
                    "height": p.get("displayHeight", ""),
                    "weight": p.get("displayWeight", ""),
                    "team_id": str(team_id),
                    "team_name": team_name,
                    "team_abbr": team_abbr,
                })
        except Exception as e:
            print(f"Error roster {team_name}: {e}")

    print(f"Total jugadores descargados: {len(all_players)}")

    # Mapa id -> info del jugador
    by_id = {}
    for p in all_players:
        by_id[p["id"]] = {
            "name": p["name"],
            "team_name": p["team_name"],
            "team_abbr": p.get("team_abbr", ""),
            "position": p.get("position", ""),
            "team_abbr": p.get("team_abbr", ""),
        }

    # Cargar ligas y equipos nuestros para cruzar
    standings = json.loads((Path("public/data/standings.json")).read_text())
    leagues = json.loads((Path("public/data/leagues.json")).read_text())

    team_name_to_liga = {}
    for liga, clubs in leagues.items():
        for c in clubs:
            name = c if isinstance(c, str) else c.get("name", "")
            if name:
                team_name_to_liga[name] = liga

    # HTML shell
    shell = (Path("dist") / "index.html").read_text()
    css = "".join(re.findall(r'<link[^>]+rel="stylesheet"[^>]*>', Path("dist/index.html").read_text()))
    scripts = "".join(re.findall(r'<script[^>]+type="module"[^>]*></script>', Path("dist/index.html").read_text()))
    fonts = "".join(re.findall(r'<link[^>]+fonts\.googleapis[^>]*>', Path("dist/index.html").read_text()))

    OUT_DIR = Path("dist") / "jugador"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    urls = []
    count = 0

    # Mapa team_name -> liga (para NBA)
    team_name_to_liga = {k: "NBA" for k in team_name_to_liga.keys()}

    count = 0
    urls = []
    for pid, info in by_id.items():
        team_name = info["team_name"]
        if not info["name"] or not team_name:
            continue
        
        liga = "NBA"
        slug = slugify(info["name"])
        urls.append(f"https://anillero.com/jugador/{slug}")

        # Build page
        height_str = "—"
        weight_str = "—"
        position = info.get("position", "—")

        ld_json = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": info["name"],
            "sport": "Basketball",
            "memberOf": {"@type": "SportsTeam", "name": info["team_name"]},
            "position": info["position"],
            "affiliation": {"@type": "SportsTeam", "name": info["team_name"]},
        }

        html_page = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0c0e" />
    <title>{esc(info["name"])} · {esc(info["team_name"])} · NBA | Anillero</title>
    <meta name="description" content="{esc(info["name"])}: estadísticas, carrera y equipo." />
    <link rel="canonical" href="https://anillero.com/jugador/{slugify(info["name"])}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Anillero" />
    <meta property="og:title" content="{esc(info["name"])} · {esc(info["team_name"])}" />
    <meta property="og:description" content="Estadísticas y carrera de {esc(info["name"])}." />
    <meta property="og:url" content="https://anillero.com/jugador/{slugify(info["name"])}" />
    <meta property="og:image" content="https://anillero.com/og/anillero-1200x630.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://anillero.com/jugador/{slugify(info["name"])}" />
    <link rel="alternate" hreflang="es" href="https://anillero.com/jugador/{slugify(info["name"])}" />
    <link rel="alternate" hreflang="x-default" href="https://anillero.com/jugador/{slugify(info["name"])}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0b0c0e" />
    <title>{esc(info["name"])} · {esc(info["team_name"])} | Anillero</title>
    <link rel="stylesheet" href="/assets/main.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <meta property="og:image" content="https://anillero.com/og/anillero-1200x630.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">{json.dumps(ld_json, ensure_ascii=False)}</script>
    <style>
      body{{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}}
      main{{max-width:900px;margin:0 auto;padding:32px 20px 64px}}
      h1{{font-size:32px;margin:0 0 6px}}
      h2{{font-size:19px;margin:26px 0 10px;color:#f0c04d}}
      .meta{{color:#98a0ae;margin:0 0 18px}}
      .stats{{display:flex;gap:18px;flex-wrap:wrap;margin:18px 0}}
      .stat{{background:#14171d;border:1px solid #232733;border-radius:10px;padding:12px 16px;min-width:110px}}
      .stat b{{display:block;font-size:22px}}
      .stat span{{color:#8a93a3;font-size:12px;text-transform:uppercase;letter-spacing:.06em}}
      .cta{{display:inline-block;margin-top:26px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}}
      ul{{list-style:none;padding:0;margin:0}}
      li{{padding:8px 0;border-bottom:1px solid #1c1f26;font-size:14px}}
    </style>
  </head>
  <body>
    <main id="root">
      <p><a href="/" style="color:#ff6b1a;text-decoration:none">Anillero</a> · <a href="/liga/nba" style="color:#98a0ae;text-decoration:none">NBA</a> · Jugador</p>
      <h1>{esc(info["name"])}</h1>
      <p class="meta">{esc(info["position"])} · {esc(info["team_name"])} · NBA</p>
      <h2>Equipo actual</h2>
      <p><a href="/equipo/{slugify(info["team_name"])}">{esc(info["team_name"])}</a> · <a href="/liga/nba">NBA</a></p>
      <h2>Perfil (ESPN)</h2>
      <p class="meta">Datos de ESPN.</p>
      <a class="cta" href="/play">Jugar al simulador</a>
    </main>
    {scripts}
  </body>
</html>"""

        out_dir = Path("dist") / "jugador" / slugify(info["name"])
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(html_page)
        count += 1
        urls.append(f"https://anillero.com/jugador/{slugify(info['name'])}")

    print(f"gen-player-pages: {count} jugadores")

    # sitemap
    try:
        sm = Path("dist/sitemap.xml").read_text()
        today = datetime.date.today().isoformat()
        add = "\n".join(
            f'  <url>\n    <loc>https://anillero.com/jugador/{slugify(p)}</loc>\n    <lastmod>{datetime.date.today().isoformat()}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>'
            for p in urls)
        if urls:
            sm = sm.replace("</urlset>", "\n".join(urls) + "\n</urlset>")
            Path("dist/sitemap.xml").write_text(sm)
            print(f"sitemap: +{len(urls)} jugadores")
    except Exception as e:
        print("sitemap warn:", e)


if __name__ == "__main__":
    main()