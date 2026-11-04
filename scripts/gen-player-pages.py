#!/usr/bin/env python3
"""Genera /jugador/<slug> desde balldontlie (free tier: players + teams).

- Cachea la lista de jugadores en public/data/players.json (24 h).
- Genera una página estática por jugador NBA en dist/jugador/<slug>/index.html.
- Añade las URLs al sitemap.

La clave se lee de BALDONTLIE_API_KEY o de ~/.hermes/balldontlie.env (nunca del repo).
"""
from __future__ import annotations

import datetime
import html
import json
import os
import re
import time
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist"
DATA = ROOT / "public" / "data"
CACHE = DATA / "players.json"
API = "https://api.balldontlie.io/v1"


def api_key() -> str:
    key = os.environ.get("BALDTL_KEY", "") or os.environ.get("BALDONTLIE_API_KEY", "")
    if key:
        return key.strip()
    env = Path.home() / ".hermes" / "balldontlie.env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("BALDONTLIE_API_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


KEY = api_key()


def get(url: str, intentos: int = 5) -> dict:
    """Free tier de balldontlie: 5 req/min. Reintenta ante 429."""
    import urllib.error

    for i in range(intentos):
        req = urllib.request.Request(
            url,
            headers={"Authorization": KEY, "User-Agent": "Anillero/1.0 (+https://anillero.com)"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < intentos - 1:
                espera = 13 * (i + 1)
                print(f"  429, espero {espera}s")
                time.sleep(espera)
                continue
            raise
    raise RuntimeError("sin respuesta")


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""))


def refresh_players() -> list[dict]:
    """balldontlie pagina por cursor (meta.next_cursor)."""
    out: list[dict] = []
    cursor = None
    for _ in range(80):  # tope de seguridad
        url = f"{API}/players?per_page=100" + (f"&cursor={cursor}" if cursor else "")
        data = get(url)
        out.extend(data.get("data", []))
        cursor = data.get("meta", {}).get("next_cursor")
        if not cursor:
            break
        time.sleep(13)  # 5 req/min en el plan free
    CACHE.write_text(json.dumps(out, ensure_ascii=False))
    return out


def load_players() -> list[dict]:
    if CACHE.exists() and (time.time() - CACHE.stat().st_mtime) < 86400:
        return json.loads(CACHE.read_text())
    if not KEY:
        print("sin BALDONTLIE_API_KEY: usando cache si existe")
        return json.loads(CACHE.read_text()) if CACHE.exists() else []
    return refresh_players()


def main() -> None:
    players = load_players()
    if not players:
        print("gen-player-pages: sin datos, se omite")
        return

    standings = json.loads((DATA / "standings.json").read_text())
    results = json.loads((DATA / "results.json").read_text())
    fixtures = json.loads((DATA / "fixtures.json").read_text())

    nba_rows = standings.get("NBA", [])
    tablon = {r["team"]: r for r in nba_rows}

    activos = [p for p in players if p.get("team") and p["team"].get("full_name") and p.get("first_name")]

    index = (OUT / "index.html").read_text()
    scripts = "".join(re.findall(r'<script[^>]+type="module"[^>]*></script>', index))

    (OUT / "jugador").mkdir(parents=True, exist_ok=True)
    urls: list[str] = []
    vistos: set[str] = set()

    for p in activos:
        nombre = f"{p['first_name']} {p['last_name']}".strip()
        equipo = p["team"]["full_name"]
        liga = "NBA"
        s = slug(nombre)
        if not s:
            continue
        if s in vistos:  # homónimos: se distinguen por id para no pisarse
            s = f"{s}-{p['id']}"
        vistos.add(s)

        row = tablon.get(equipo)
        partidos = [r for r in results if r.get("home") == equipo or r.get("away") == equipo]
        partidos.sort(key=lambda r: r.get("date", ""), reverse=True)
        proximos = [f for f in fixtures if f.get("home") == equipo or f.get("away") == equipo]
        proximos.sort(key=lambda f: f.get("date", ""))

        altura = p.get("height") or "—"
        peso = p.get("weight") or "—"
        titulo = f"{nombre} · {equipo} · NBA | Anillero"

        filas_partidos = "".join(
            f'<li><a href="/partido/{slug(r["home"])}--{slug(r["away"])}--{r["date"]}">'
            f'{esc(r["home"])} {r["hs"]}–{r["as"]} {esc(r["away"])}</a> · {esc(r["date"])}</li>'
            for r in partidos[:8]
        ) or "<li>Sin partidos registrados.</li>"

        ld = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": nombre,
            "jobTitle": "Baloncestista",
            "memberOf": {"@type": "SportsTeam", "name": equipo},
            "height": altura,
            "nationality": p.get("country") or "",
        }

        page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{esc(titulo)}</title>
<meta name="description" content="{esc(nombre)}, {esc(p.get('position') or 'jugador')} de {esc(equipo)} en la NBA: perfil, equipo, clasificación y últimos partidos." />
<link rel="canonical" href="https://anillero.com/jugador/{s}" />
<meta property="og:type" content="profile" />
<meta property="og:title" content="{esc(nombre)} · {esc(equipo)}" />
<meta property="og:description" content="Perfil de {esc(nombre)} en {esc(equipo)} (NBA)." />
<meta property="og:image" content="https://anillero.com/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="index, follow" />
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
body{{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}}
main{{max-width:900px;margin:0 auto;padding:32px 20px 64px}}
a{{color:#ff6b1a}} h1{{font-size:34px;margin:0 0 4px}} h2{{font-size:18px;margin:26px 0 10px;color:#f0c04d}}
.meta{{color:#98a0ae;margin:0 0 18px}} .grid{{display:flex;gap:14px;flex-wrap:wrap;margin:16px 0}}
.stat{{background:#14171d;border:1px solid #232733;border-radius:10px;padding:12px 16px;min-width:100px}}
.stat b{{display:block;font-size:20px}} .stat span{{color:#8a93a3;font-size:11px;text-transform:uppercase;letter-spacing:.06em}}
ul{{list-style:none;padding:0;margin:0}} li{{padding:7px 0;border-bottom:1px solid #1c1f26;font-size:14px}}
li a{{text-decoration:none;color:#e6e8ec}} .cta{{display:inline-block;margin-top:24px;background:#ff6b1a;color:#1b0b00;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none}}
</style>
</head>
<body>
<main>
<p><a href="/">Anillero</a> · <a href="/liga/nba">NBA</a> · <a href="/equipo/{slug(equipo)}">{esc(equipo)}</a></p>
<h1>{esc(nombre)}</h1>
<p class="meta">{esc(p.get('position') or 'Jugador')} · {esc(equipo)} · {esc(liga)}</p>
<div class="grid">
  <div class="stat"><b>{esc(p.get('jersey_number') or '—')}</b><span>Dorsal</span></div>
  <div class="stat"><b>{esc(altura)}</b><span>Altura</span></div>
  <div class="stat"><b>{esc(peso)}</b><span>Peso (lb)</span></div>
  <div class="stat"><b>{esc(p.get('country') or '—')}</b><span>País</span></div>
  <div class="stat"><b>{esc(p.get('college') or '—')}</b><span>Universidad</span></div>
</div>
<h2>Equipo</h2>
<p><a href="/equipo/{slug(equipo)}">{esc(equipo)}</a>{(f" · {row['rank']}º · {row['w']}-{row['l']}") if row else ""}</p>
<h2>Últimos partidos del equipo</h2>
<ul>{filas_partidos}</ul>
{f'<h2>Próximo partido</h2><p>{esc(proximos[0]["home"])} — {esc(proximos[0]["away"])} · {esc(proximos[0]["date"])}</p>' if proximos else ''}
<p class="meta">Perfil: balldontlie.io. Marcadores: fuentes públicas de la liga.</p>
<a class="cta" href="/play">Jugar al simulador</a>
</main>
{scripts}
</body>
</html>"""
        d = OUT / "jugador" / s
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page)
        urls.append(f"https://anillero.com/jugador/{s}")

    print(f"gen-player-pages: {len(urls)} jugadores")

    try:
        sm_path = OUT / "sitemap.xml"
        sm = sm_path.read_text()
        entries = "\n".join(
            f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{datetime.date.today().isoformat()}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>'
            for u in urls
        )
        sm = re.sub(r"\s*<url>\s*<loc>https://anillero\.com/jugador/[^<]+</loc>.*?</url>", "", sm, flags=re.S)
        sm = sm.replace("</urlset>", entries + "\n</urlset>")
        sm_path.write_text(sm)
        print(f"sitemap: {len(urls)} jugadores")
    except Exception as e:
        print("sitemap warn:", e)


if __name__ == "__main__":
    main()