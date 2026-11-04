#!/usr/bin/env python3
"""Ingesta de datos de baloncesto vía Apify (actor sian.agency/basketball-api-scraper).

- Clasificaciones completas (posición, G/P, % victorias, racha, puntos a favor/en contra).
- Calendario: partidos jugados (con marcador y parciales) y próximos.
- Guarda presupuesto: si el saldo mensual de Apify baja del mínimo, no ejecuta nada.

El token se lee de la variable APIFY_TOKEN o de ~/.hermes/apify.env (nunca del repo).

Uso:
  python3 scripts/apify-ingest.py                 # ligas activas
  python3 scripts/apify-ingest.py --liga "Liga ACB"
  python3 scripts/apify-ingest.py --solo-clasificacion
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
MAP = DATA / "apify-map.json"
ACTOR = "sian.agency~basketball-api-scraper"
API = "https://api.apify.com/v2"
MIN_BUDGET_USD = 0.60  # no arrancar si queda menos que esto en el ciclo

# competitionId / seasonId de la temporada en curso.
LIGAS = {
    "Liga ACB": {"competitionId": "264", "seasonId": "100873"},
    # BSL: el competitionId hay que descubrirlo con `--descubrir "Basketbol Süper Ligi"`
    # (cuesta ~0,07 $) y queda guardado en apify-map.json. Pendiente: saldo agotado.
}

MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def token() -> str:
    tok = os.environ.get("APIFY_TOKEN", "").strip()
    if tok:
        return tok
    env = Path.home() / ".hermes" / "apify.env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("APIFY_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("Falta APIFY_TOKEN (variable de entorno o ~/.hermes/apify.env)")


TOKEN = token()


def api_get(path: str) -> dict:
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def run_actor(payload: dict) -> list[dict]:
    url = f"{API}/acts/{ACTOR}/run-sync-get-dataset-items?token={TOKEN}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            data = json.loads(r.read().decode())
        return data if isinstance(data, list) else []
    except urllib.error.HTTPError as err:
        body = err.read().decode()[:300]
        print(f"[apify] {err.code}: {body}")
        return []


def descubrir(texto: str) -> None:
    """Busca competiciones en el actor y muestra id + temporadas (cuesta ~0,07 $)."""
    items = run_actor({"operation": "searchCompetitions", "search": texto})
    if not items:
        print("[descubrir] sin resultados")
        return
    for it in items[:10]:
        print(json.dumps(it, ensure_ascii=False)[:400])
    print("\nGuarda el competitionId en LIGAS y ejecuta con --liga \"Basketbol Süper Ligi\".")


def presupuesto_restante() -> float:
    try:
        d = api_get("/users/me/limits")["data"]
        return float(d["limits"]["maxMonthlyUsageUsd"]) - float(d["current"]["monthlyUsageUsd"])
    except Exception as e:  # noqa: BLE001
        print(f"[apify] no pude leer el presupuesto: {e}")
        return 0.0


def fecha(iso: str) -> str:
    try:
        return datetime.strptime(iso[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return ""


def hora(iso: str) -> str:
    try:
        return datetime.strptime(iso[:19], "%Y-%m-%dT%H:%M:%S").strftime("%H:%M")
    except Exception:
        return ""


def leer(nombre: str, defecto):
    p = DATA / nombre
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return defecto
    return defecto


def escribir(nombre: str, valor) -> None:
    (DATA / nombre).write_text(json.dumps(valor, ensure_ascii=False, indent=0))


def ingesta_liga(nombre: str, ids: dict, solo_clasificacion: bool = False) -> list[str]:
    hechos = []
    cid, sid = ids["competitionId"], ids["seasonId"]

    # --- Clasificación
    rows = run_actor({"operation": "leagueStandings", "competitionId": cid,
                      "seasonId": sid, "standingsType": "total"})
    if rows:
        tabla = []
        for r in sorted(rows, key=lambda x: x.get("position") or 99):
            w, l = int(r.get("wins") or 0), int(r.get("losses") or 0)
            streak = int(r.get("streak") or 0)
            form = ("W" * streak if streak > 0 else "L" * abs(streak))[:5]
            tabla.append({
                "rank": int(r.get("position") or 0),
                "team": r.get("teamName") or (r.get("team") or {}).get("name") or "",
                "w": w, "l": l, "form": form, "conf": nombre,
            })
        if tabla:
            st = leer("standings.json", {})
            st[nombre] = tabla
            escribir("standings.json", st)
            hechos.append(f"{nombre} tabla {len(tabla)}")
    if solo_clasificacion:
        return hechos

    # --- Calendario
    res, fix = [], []
    for ventana, destino in (("played", res), ("upcoming", fix)):
        for g in run_actor({"operation": "seasonSchedule", "competitionId": cid, "seasonId": sid,
                            "gameWindow": ventana, "maxPages": 1}):
            home = (g.get("homeTeam") or {}).get("name") or ""
            away = (g.get("awayTeam") or {}).get("name") or ""
            if not home or not away:
                continue
            if ventana == "played" and g.get("homePoints") is not None:
                destino.append({"date": fecha(g.get("startTime", "")), "home": home, "away": away,
                                "hs": int(g["homePoints"]), "as": int(g["awayPoints"]), "league": nombre})
            elif ventana == "upcoming":
                destino.append({"date": fecha(g.get("startTime", "")), "time": hora(g.get("startTime", "")),
                                "home": home, "away": away, "event": g.get("round") or "", "league": nombre})

    if res:
        old = [r for r in leer("results.json", []) if r.get("league") != nombre]
        escribir("results.json", res + old)
        hechos.append(f"{nombre} {len(res)} resultados")
    if fix:
        oldf = [f for f in leer("fixtures.json", []) if f.get("league") != nombre]
        escribir("fixtures.json", fix + oldf)
        hechos.append(f"{nombre} {len(fix)} próximos")
    return hechos


def main() -> None:
    objetivo = None
    solo_clasificacion = "--solo-clasificacion" in sys.argv
    if "--liga" in sys.argv:
        objetivo = sys.argv[sys.argv.index("--liga") + 1]

    if "--descubrir" in sys.argv:
        texto = sys.argv[sys.argv.index("--descubrir") + 1]
        restante = presupuesto_restante()
        print(f"presupuesto restante: ${restante:.2f}")
        if restante < MIN_BUDGET_USD:
            print(f"[apify] saldo insuficiente (< ${MIN_BUDGET_USD}); no se ejecuta nada")
            return
        descubrir(texto)
        return

    restante = presupuesto_restante()
    print(f"presupuesto restante: ${restante:.2f}")
    if restante < MIN_BUDGET_USD:
        print(f"[apify] saldo insuficiente (< ${MIN_BUDGET_USD}); no se ejecuta nada")
        return

    mapa = leer("apify-map.json", {}) or {}
    # Cadencia mínima: por defecto, un refresco cada 7 días por liga (el plan
    # gratuito son 5 $/mes y cada liga cuesta ~0,40 $).
    min_dias = 7
    if "--cada-dias" in sys.argv:
        min_dias = int(sys.argv[sys.argv.index("--cada-dias") + 1])
    if "--fuerza" not in sys.argv:
        recientes = []
        for nombre, ids in mapa.items():
            ultimo = ids.get("lastRun")
            if not ultimo:
                continue
            try:
                dias = (datetime.now() - datetime.fromisoformat(ultimo)).total_seconds() / 86400
            except Exception:
                continue
            if dias < min_dias:
                recientes.append(f"{nombre} ({dias:.1f}d)")
        if recientes and not objetivo:
            print("[apify] aún no toca: " + ", ".join(recientes))
            return
    ligas = {k: v for k, v in LIGAS.items() if not objetivo or k == objetivo}
    if "--rotar" in sys.argv and len(ligas) > 1:
        def edad(n):
            v = ligas[n].get("lastRun")
            if not v:
                return 10**6
            try:
                return (datetime.now() - datetime.fromisoformat(v)).total_seconds()
            except Exception:
                return 10**6
        elegida = max(ligas, key=edad)
        ligas = {elegida: ligas[elegida]}
        print(f"[rotación] toca {elegida}")
    hechos: list[str] = []
    for nombre, ids in ligas.items():
        print(f"→ {nombre} (comp {ids['competitionId']} · temporada {ids['seasonId']})")
        hechos += ingesta_liga(nombre, ids, solo_clasificacion)
        mapa[nombre] = dict(ids, lastRun=datetime.now().isoformat(timespec="seconds"))
    escribir("apify-map.json", mapa)
    print("hecho: " + (" · ".join(hechos) if hechos else "sin datos nuevos"))


if __name__ == "__main__":
    main()
