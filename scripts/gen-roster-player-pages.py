#!/usr/bin/env python3
"""Genera fichas de jugador para las plantillas reales 2026-27 (ACB, Euroliga, GBL, BSL...).

Complementa a gen-player-pages.py (que cubre NBA vía balldontlie): crea las fichas que
faltan a partir de src/data/realRosters2026.json y las registra en player-slugs.json
para que las fichas de equipo las enlacen.

Todas salen con noindex: el contenido es real pero de plantilla (nombre, dorsal,
posición, altura, país, edad, club y entrenador).
"""
from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist"
DATA = ROOT / "public" / "data"


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""))


def main() -> None:
    rosters = json.loads((ROOT / "src" / "data" / "realRosters2026.json").read_text()).get("clubs") or {}

    # plantillas de la GBL (esake.gr): mismos campos, liga griega
    try:
        gbl = json.loads((DATA / "gbl-rosters.json").read_text())
        for club, jugadores in gbl.items():
            rosters.setdefault(club, {"league": "Greek Basket League", "coach": "", "players": jugadores})
    except Exception as e:  # noqa: BLE001
        print("sin plantillas GBL:", e)
    mapa_path = DATA / "player-slugs.json"
    mapa = json.loads(mapa_path.read_text()) if mapa_path.exists() else {}

    creadas = 0
    for club, data in rosters.items():
        jugadores = data.get("players") or []
        if not jugadores:
            continue
        liga = data.get("league") or ""
        coach = data.get("coach") or ""
        for pl in jugadores:
            nombre = (pl.get("name") or "").strip()
            if not nombre:
                continue
            s = slug(nombre)
            destino = OUT / "jugador" / s / "index.html"
            # registrar siempre, para que la ficha de equipo enlace
            fila = {"name": nombre, "slug": s, "indexable": False}
            equipo_map = mapa.setdefault(club, [])
            if not any(j["slug"] == s for j in equipo_map):
                equipo_map.append(fila)
            if destino.exists():
                continue  # ya existe (balldontlie y equipo real)

            altura = f"{pl['heightCm']} cm" if pl.get("heightCm") else "—"
            peso = f"{pl['weightKg']} kg" if pl.get("weightKg") else ""
            edad = f"{pl['age']} años" if pl.get("age") else ""
            pos = pl.get("pos") or "—"
            dorsal = pl.get("number")
            nat = pl.get("nat") or "—"

            ld = {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": nombre,
                "jobTitle": "Baloncestista",
                "memberOf": {"@type": "SportsTeam", "name": club},
                "height": altura,
                "nationality": nat,
            }

            page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{esc(nombre)} · {esc(club)} | Anillero</title>
<meta name="description" content="{esc(nombre)}, {esc(pos)} de {esc(club)} ({esc(liga)}): dorsal, altura, edad y plantilla." />
<link rel="canonical" href="https://anillero.com/jugador/{s}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Anillero" />
<meta property="og:title" content="{esc(nombre)} · {esc(club)}" />
<meta property="og:image" content="https://anillero.com/og/anillero-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="robots" content="noindex, follow" />
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<script>try{{var t=localStorage.getItem("anillero-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>
  :root{{--a-bg:#F7F3EC;--a-card:#FFFDF8;--a-card2:#F3ECE1;--a-line:#E5DBCB;--a-line2:#D8CBB6;--a-line3:#C9B9A2;--a-ink:#2B2420;--a-ink2:#3D342D;--a-ink3:#4A4038;--a-ink4:#5C5148;--a-muted:#6F645A;--a-muted2:#7C7064;--a-gold:#8C6420;--a-accent:#B85A31;--a-on-accent:#FFF8F2;--a-win:#3F7D5A;--a-loss:#B3261E;--a-note-bg:#FBF1DE;--a-note-line:#E2C48B;--a-note-ink:#6B4A12}}
  :root[data-theme="dark"]{{--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}}
  @media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--a-bg:#1C1410;--a-card:#261B15;--a-card2:#31241C;--a-line:#4A3828;--a-line2:#5A4532;--a-line3:#6B5440;--a-ink:#F2E8D8;--a-ink2:#E6D9C4;--a-ink3:#D6C5AC;--a-ink4:#C7B497;--a-muted:#B3A089;--a-muted2:#9C8A73;--a-gold:#E0BC7A;--a-accent:#D9A95B;--a-on-accent:#1C1410;--a-win:#9CC795;--a-loss:#E39B8C;--a-note-bg:#33251C;--a-note-line:#6B5232;--a-note-ink:#E8CFA0;color-scheme:dark}}}}
</style>
<style>
  h1,h2,h3{{font-family:"Source Serif 4",Georgia,serif}}

body{{margin:0;background:var(--a-bg);color:var(--a-ink);font-family:Inter,system-ui,sans-serif;line-height:1.55}}
main{{max-width:880px;margin:0 auto;padding:28px 20px 64px}}
a{{color:var(--a-accent);text-decoration:none}}
.crumbs{{font-size:13px;color:var(--a-muted);margin-bottom:14px}}
.crumbs a{{color:var(--a-muted)}}
h1{{font-size:34px;margin:0 0 4px;letter-spacing:-.01em}}
.meta{{color:var(--a-muted);margin:0 0 20px}}
.hero{{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid var(--a-line);border-radius:14px;background:linear-gradient(135deg,var(--a-card),var(--a-card))}}
.num{{font-size:34px;font-weight:800;color:var(--a-accent);min-width:64px;text-align:center;font-variant-numeric:tabular-nums}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:18px 0}}
.stat{{background:var(--a-card);border:1px solid var(--a-line);border-radius:10px;padding:12px 14px}}
.stat b{{display:block;font-size:20px}}
.stat span{{color:var(--a-muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em}}
h2{{font-size:17px;margin:28px 0 10px;color:var(--a-gold)}}
.cta{{display:inline-block;margin-top:26px;background:var(--a-accent);color:var(--a-on-accent);font-weight:700;padding:12px 20px;border-radius:10px}}
</style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">Anillero</a> · <a href="/jugadores">Jugadores</a> · <a href="/equipo/{slug(club)}">{esc(club)}</a></p>
  <div class="hero">
    <div class="num">{esc(dorsal if dorsal not in (None, "") else '—')}</div>
    <div>
      <h1>{esc(nombre)}</h1>
      <p class="meta" style="margin:0">{esc(pos)} · {esc(club)}{f' · {esc(liga)}' if liga else ''}</p>
    </div>
  </div>
  <div class="grid">
    <div class="stat"><b>{esc(altura)}</b><span>Altura</span></div>
    <div class="stat"><b>{esc(nat)}</b><span>Nacionalidad</span></div>
    <div class="stat"><b>{esc(edad or '—')}</b><span>Edad</span></div>
    {f'<div class="stat"><b>{esc(peso)}</b><span>Peso</span></div>' if peso else ''}
  </div>
  <h2>Equipo</h2>
  <p><a href="/equipo/{slug(club)}">{esc(club)}</a>{f' · {esc(liga)}' if liga else ''}{f' · Entrenador: {esc(coach)}' if coach else ''}</p>
  <h2>Plantilla</h2>
  <p><a href="/equipo/{slug(club)}">Ver la plantilla completa de {esc(club)}</a></p>
  <a class="cta" href="/play">Jugar al simulador</a>
</main>
</body>
</html>"""
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(page)
            creadas += 1

    mapa_path.write_text(json.dumps(mapa, ensure_ascii=False, indent=0, sort_keys=True))
    print(f"gen-roster-player-pages: {creadas} fichas nuevas · {len(mapa)} clubes con plantilla")


if __name__ == "__main__":
    main()
