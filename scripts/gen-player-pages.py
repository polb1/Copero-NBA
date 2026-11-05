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
import sys
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
    """balldontlie pagina por cursor (meta.next_cursor). Plan free: 5 req/min."""
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
    """La caché manda: sólo se descarga con --refresh o si no hay caché.

    El build nunca espera a la API; el refresco va aparte, en su propio cron.
    """
    forzar = "--refresh" in sys.argv
    if CACHE.exists() and not forzar:
        return json.loads(CACHE.read_text())
    if not KEY:
        print("sin BALDONTLIE_API_KEY: usando caché si existe")
        return json.loads(CACHE.read_text()) if CACHE.exists() else []
    try:
        return refresh_players()
    except Exception as e:
        print(f"balldontlie no disponible ({type(e).__name__}); uso la caché")
        return json.loads(CACHE.read_text()) if CACHE.exists() else []



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

    # --- Conjunto indexable: sólo jugadores con contenido propio ---
    # Criterio: perfil completo + mención en la actualidad (señal de vigencia real).
    # El conjunto es acumulativo: quien entra, se queda, para que la indexación no oscile.
    import unicodedata

    def _norm(t: str) -> str:
        return unicodedata.normalize("NFD", (t or "").lower()).encode("ascii", "ignore").decode()

    INDEXABLE = DATA / "players-indexable.json"
    indexables: set[str] = set(json.loads(INDEXABLE.read_text())) if INDEXABLE.exists() else set()

    try:
        noticias = json.loads((DATA / "actualidad.json").read_text())
        texto = _norm(" ".join(
            f"{n.get('title','')} {n.get('summary','')} {n.get('description','')}" for n in noticias
        ))
    except Exception:
        texto = ""

    def perfil_completo(x: dict) -> bool:
        return all([x.get("position"), x.get("height"), x.get("weight"),
                    x.get("college"), x.get("country"), x.get("draft_year")])

    for x in players:
        if not x.get("team") or not x["team"].get("full_name") or not x.get("first_name"):
            continue
        apellido = _norm(x.get("last_name", ""))
        if len(apellido) > 3 and apellido in texto and perfil_completo(x):
            indexables.add(f"{x['first_name']} {x['last_name']}".strip())

    INDEXABLE.write_text(json.dumps(sorted(indexables), ensure_ascii=False, indent=0))
    print(f"indexables (contenido propio): {len(indexables)}")

    activos = [p for p in players if p.get("team") and p["team"].get("full_name") and p.get("first_name")]

    index = (OUT / "index.html").read_text()
    scripts = "".join(re.findall(r'<script[^>]+type="module"[^>]*></script>', index))

    # Plantillas reales (5 ligas): mandan sobre el equipo que devuelve baloncesto.
    # baloncesto conserva el último club del jugador aunque ya no juegue allí.
    club_actual = {}
    try:
        import json as _json
        _root = Path(__file__).resolve().parent.parent
        _roster = _json.loads((_root / "src" / "data" / "realRosters2026.json").read_text())
        for _club, _data in (_roster.get("clubs") or {}).items():
            for _pl in (_data.get("players") or []):
                _n = (_pl.get("name") or "").strip()
                if _n:
                    club_actual[_n] = {"club": _club, "liga": _data.get("league") or "NBA"}
    except Exception as _e:
        print("sin plantillas actuales:", _e)

    (OUT / "jugador").mkdir(parents=True, exist_ok=True)
    urls: list[str] = []
    vistos: set[str] = set()
    por_equipo: dict[str, list[dict]] = {}
    hof: list[dict] = []

    for p in activos:
        nombre = f"{p['first_name']} {p['last_name']}".strip()
        equipo = p["team"]["full_name"]
        liga = "NBA"
        actual = club_actual.get(nombre)
        retirado = actual is None  # no está en ninguna plantilla 2026-27
        if actual:
            equipo, liga = actual["club"], actual["liga"]
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
        titulo = (f"{nombre} · Hall of Fame · {equipo} | Anillero" if retirado else f"{nombre} · {equipo} · NBA | Anillero")

        filas_partidos = "".join(
            f'<li><a href="/partido/{slug(r["home"])}--{slug(r["away"])}--{r["date"]}">'
            f'{esc(r["home"])} {r["hs"]}–{r["as"]} {esc(r["away"])}</a> · {esc(r["date"])}</li>'
            for r in partidos[:8]
        ) or "<li>Sin partidos registrados.</li>"

        ronda = p.get("draft_round")
        puesto = p.get("draft_number")
        draft = (
            f"elegido en el draft de {p['draft_year']}"
            + (f" (ronda {ronda}, puesto {puesto})" if ronda and puesto else "")
            if p.get("draft_year") else "no elegido en el draft"
        )
        formacion = f", formado en {p['college']}" if p.get("college") else ""
        origen = f" ({p['country']})" if p.get("country") else ""
        situacion = (
            f" Su equipo es {row['rank']}º de la NBA con balance {row['w']}-{row['l']}."
            if row else ""
        )
        POS_ES = {"G": "escolta", "F": "alero", "C": "pívot", "PG": "base", "SG": "escolta",
                  "SF": "alero", "PF": "ala-pívot", "G-F": "escolta-alero", "F-G": "alero-escolta",
                  "F-C": "alero-pívot", "C-F": "pívot-ala"}
        pos_larga = POS_ES.get((p.get("position") or "").upper(), (p.get("position") or "jugador"))
        seccion_perfil = "Hall of Fame" if retirado else "Perfil"
        etiqueta = '<span class="hof">Hall of Fame</span> · ' if retirado else ""
        bloque_partidos = "" if retirado else (
            "<h2>Últimos partidos del equipo</h2>"
            f"<ul>{filas_partidos}</ul>"
            + (
                f'<h2>Próximo partido</h2><p>{esc(proximos[0]["home"])} — {esc(proximos[0]["away"])} · {esc(proximos[0]["date"])}</p>'
                if proximos else ""
            )
        )

        if retirado:
            contexto = (
                f"{nombre} fue {('un ' + pos_larga) if p.get('position') else 'un jugador'}"
                f" de {altura}{formacion}{origen}, {draft}."
                f" Su última camiseta en la NBA fue la de {equipo}."
            )
        else:
            contexto = (
                f"{nombre} es {('un ' + pos_larga) if p.get('position') else 'un jugador'}"
                f" de {altura}{formacion}{origen}, {draft}.{situacion}"
            )

        ld = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": nombre,
            "jobTitle": "Baloncestista",
            "memberOf": {"@type": "SportsTeam", "name": equipo},
            "height": altura,
            "nationality": p.get("country") or "",
        }

        es_indexable = nombre in indexables
        robots = "index, follow" if es_indexable else "noindex, follow"

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
<meta name="robots" content="{robots}" />
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
body{{margin:0;background:#0b0c0e;color:#e6e8ec;font-family:Inter,system-ui,sans-serif;line-height:1.55}}
main{{max-width:900px;margin:0 auto;padding:32px 20px 64px}}
a{{color:#ff6b1a}} h1{{font-size:34px;margin:0 0 4px}}
.hof{{display:inline-block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#f0c04d;border:1px solid rgba(240,192,77,.4);border-radius:999px;padding:2px 8px;margin-right:8px}} h2{{font-size:18px;margin:26px 0 10px;color:#f0c04d}}
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
<p class="meta">{etiqueta}{esc(p.get('position') or 'Jugador')} · última camiseta: {esc(equipo)}</p>
<div class="grid">
  <div class="stat"><b>{esc(p.get('jersey_number') or '—')}</b><span>Dorsal</span></div>
  <div class="stat"><b>{esc(altura)}</b><span>Altura</span></div>
  <div class="stat"><b>{esc(peso)}</b><span>Peso (lb)</span></div>
  <div class="stat"><b>{esc(p.get('country') or '—')}</b><span>País</span></div>
  <div class="stat"><b>{esc(p.get('college') or '—')}</b><span>Universidad</span></div>
</div>
<h2>{seccion_perfil}</h2>
<p class="meta">{contexto}</p>
<h2>{'Último equipo' if retirado else 'Equipo'}</h2>
<p><a href="/equipo/{slug(equipo)}">{esc(equipo)}</a>{("" if retirado else ((f" · {row['rank']}º · {row['w']}-{row['l']}") if row else ""))}</p>
{bloque_partidos}
<p class="meta">Perfil: balldontlie.io. Marcadores: fuentes públicas de la liga.</p>
<a class="cta" href="/play">Jugar al simulador</a>
</main>
</body>
</html>"""
        por_equipo.setdefault(equipo, []).append({"name": nombre, "slug": s, "indexable": es_indexable})
        if retirado:
            hof.append({
                "name": nombre,
                "slug": s,
                "pos": p.get("position") or "",
                "draft": p.get("draft_year"),
                "pick": p.get("draft_number"),
                "country": p.get("country") or "",
                "team": equipo,
                "height": altura,
            })

        d = OUT / "jugador" / s
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page)
        if es_indexable:
            urls.append(f"https://anillero.com/jugador/{s}")

    (DATA / "hall-of-fame.json").write_text(json.dumps(hof, ensure_ascii=False, indent=0))
    print(f"hall of fame: {len(hof)} leyendas")

    # índice equipo -> jugadores, para que las fichas de equipo enlacen la plantilla
    (DATA / "player-slugs.json").write_text(
        json.dumps(por_equipo, ensure_ascii=False, indent=0, sort_keys=True)
    )
    print(f"gen-player-pages: {len(urls)} indexables · {sum(len(v) for v in por_equipo.values())} fichas enlazables")

    # Sólo las fichas con contenido propio entran en el sitemap.
    try:
        sm_path = OUT / "sitemap.xml"
        sm = sm_path.read_text()
        sm = re.sub(r"\s*<url>\s*<loc>https://anillero\.com/jugador/[^<]+</loc>.*?</url>", "", sm, flags=re.S)
        if urls:
            entries = "\n".join(
                f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{datetime.date.today().isoformat()}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>'
                for u in urls
            )
            sm = sm.replace("</urlset>", entries + "\n</urlset>")
        sm_path.write_text(sm)
        print(f"sitemap: {len(urls)} jugadores indexables")
    except Exception as e:
        print("sitemap warn:", e)


if __name__ == "__main__":
    main()