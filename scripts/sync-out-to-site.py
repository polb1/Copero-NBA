#!/usr/bin/env python3
"""Puente out/ (esquema común de ingest.py) -> public/data/ (lo que lee la web).

Uso: python3 scripts/sync-out-to-site.py
Idempotente: reemplaza por completo los datos de las ligas que gestiona (BSL y GBL),
sin tocar el resto de ligas que siguen viniendo de update-actualidad.py.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
DATA = ROOT / "public" / "data"

# clave interna de ingest.py -> nombre visible en la web
NOMBRES = {
    "bsl": "Basketbol Süper Ligi",
    "gbl": "Greek Basket League",
    "bbl": "Basketball Bundesliga",
    "vtb": "VTB United League",
    "cba": "CBA",
    "lega": "Lega Basket Serie A",
}

# Se publica desde el primer partido, pero marcada como parcial hasta tener muestra.
MIN_PARTIDOS_POR_EQUIPO = 1
COMPLETA_DESDE = 5

# Alcance cerrado de anillero.com: sólo estas cinco competiciones.
ALLOWED = ["NBA", "Liga ACB", "EuroLeague", "Basketbol Süper Ligi",
           "Greek Basket League", "Basketball Bundesliga", "VTB United League",
           "CBA", "Lega Basket Serie A"]


def iso(ts: int | None) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def main() -> None:
    results_path = DATA / "results.json"
    fixtures_path = DATA / "fixtures.json"
    standings_path = DATA / "standings.json"

    results = json.loads(results_path.read_text())
    fixtures = json.loads(fixtures_path.read_text())
    standings = json.loads(standings_path.read_text())

    cambios = []
    for clave, nombre in NOMBRES.items():
        f_games = OUT / f"{clave}_games.json"
        f_st = OUT / f"{clave}_standings.json"
        if not f_games.exists():
            print(f"{clave}: sin out/{clave}_games.json, se omite")
            continue

        games = json.loads(f_games.read_text()).get("games", [])
        # limpiar lo anterior de esta liga
        results = [r for r in results if r.get("league") != nombre]
        fixtures = [f for f in fixtures if f.get("league") != nombre]

        jugados = 0
        programados = 0
        for g in games:
            fecha = iso(g.get("start_ts"))
            if not fecha:
                continue
            base = {"home": g["home"]["name"], "away": g["away"]["name"], "league": nombre, "date": fecha}
            if g["status"] == "FT" and isinstance(g["home"].get("score"), int) and isinstance(g["away"].get("score"), int):
                results.append({**base, "hs": g["home"]["score"], "as": g["away"]["score"]})
                jugados += 1
            elif g["status"] == "NS":
                fixtures.append({**base, "time": None})
                programados += 1

        filas = []
        if f_st.exists():
            filas = json.loads(f_st.read_text()).get("standings", [])
        parcial = True
        if filas:
            minimo = min((r.get("played") or 0) for r in filas)
            parcial = minimo < COMPLETA_DESDE
            if minimo < MIN_PARTIDOS_POR_EQUIPO:
                print(f"{clave}: clasificación omitida (sin partidos)")
                standings.pop(nombre, None)
                filas = []
            standings[nombre] = [
                {
                    "rank": r.get("rank") or i + 1,
                    "team": r.get("team"),
                    "w": r.get("wins"),
                    "l": r.get("losses"),
                    "form": "",
                    "conf": NOMBRES[clave],
                    "played": r.get("played"),
                    "partial": parcial,
                }
                for i, r in enumerate(filas)
            ]
        cambios.append(f"{clave}: {jugados} resultados, {programados} próximos, {len(standings.get(nombre, []))} equipos")

    # recorte al alcance cerrado: fuera el resto de ligas heredadas
    results = [r for r in results if r.get("league") in ALLOWED]
    fixtures = [f for f in fixtures if f.get("league") in ALLOWED]
    standings = {k: v for k, v in standings.items() if k in ALLOWED}
    # leagues.json alimenta las páginas de liga y las fichas de equipo
    leagues_path = DATA / "leagues.json"
    if leagues_path.exists():
        ligas = json.loads(leagues_path.read_text())
        podadas = {k: v for k, v in ligas.items() if k in ALLOWED}
        if podadas != ligas:
            leagues_path.write_text(json.dumps(podadas, ensure_ascii=False, indent=0))
            print(f"leagues.json: {len(ligas)} -> {len(podadas)} ligas")

    results.sort(key=lambda r: (r.get("date") or ""), reverse=True)
    fixtures.sort(key=lambda f: (f.get("date") or ""))

    results_path.write_text(json.dumps(results, ensure_ascii=False, indent=0))
    fixtures_path.write_text(json.dumps(fixtures, ensure_ascii=False, indent=0))
    standings_path.write_text(json.dumps(standings, ensure_ascii=False, indent=0))

    for c in cambios:
        print("sync ·", c)
    print(f"total: {len(results)} resultados · {len(fixtures)} próximos · {len(standings)} ligas")


if __name__ == "__main__":
    main()
