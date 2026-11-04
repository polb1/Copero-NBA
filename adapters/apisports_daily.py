"""Adaptador API-Basketball (api-sports.io) en modo "ventana de fechas".

Hallazgo verificado el 4/11/2026 con el plan **Free**:
- `GET /games?date=YYYY-MM-DD` funciona y devuelve TODAS las competiciones del día
  (hoy y ayer; fechas futuras devuelven vacío).
- `GET /games?id=<id>` funciona también para la temporada en curso.
- Los endpoints con `season=2026-2027` (games por liga, standings, statistics)
  están bloqueados: "Free plans do not have access to this season, try from 2022 to 2024".

Consecuencia: sin pagar se puede mantener **L1** (calendario, resultados, estado,
marcador) de las 8 ligas con 2 peticiones al día, y derivar la clasificación
sumando resultados. No hay box score (L3) ni plantillas (L2) en el plan gratuito.

Los partidos se acumulan en `out/history/{liga}.json` (idempotente por id), de modo
que la clasificación se calcula sobre todo el histórico recogido, no sólo el día.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

API = "https://v1.basketball.api-sports.io"
ROOT = Path(__file__).resolve().parent.parent
HIST = ROOT / "out" / "history"

# id de API-Basketball -> clave interna
LIGAS = {
    12: "nba",
    117: "acb",
    52: "lega",
    104: "bsl",
    40: "bbl",
    82: "vtb",
    31: "cba",
}

NOMBRE_API = {
    "nba": "NBA",
    "acb": "Liga ACB",
    "lega": "Lega Basket Serie A",
    "bsl": "Basketbol Süper Ligi",
    "bbl": "Basketball Bundesliga",
    "vtb": "VTB United League",
    "cba": "CBA (China)",
}

SOURCE = "API-Basketball (api-sports.io), plan gratuito — ventana de fechas"

STATUS = {
    "NS": "NS", "TBD": "NS", "PST": "POST",
    "FT": "FT", "AOT": "FT", "AET": "FT", "AWD": "FT",
    "Q1": "LIVE", "Q2": "LIVE", "Q3": "LIVE", "Q4": "LIVE",
    "OT": "LIVE", "BT": "LIVE", "HT": "LIVE", "LIVE": "LIVE",
    "CANC": "CANC", "ABD": "CANC",
}


def key() -> str:
    k = os.environ.get("API_BASKETBALL_KEY", "").strip()
    if k:
        return k
    env = Path.home() / ".hermes" / "apisports.env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("API_BASKETBALL_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("falta API_BASKETBALL_KEY")


def _get(path: str, params: dict) -> dict:
    url = f"{API}/{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "x-apisports-key": key(),
        "User-Agent": "AnilleroBot/1.0 (+https://anillero.com)",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def _game(g: dict) -> dict:
    liga = LIGAS[g["league"]["id"]]
    casa = g["teams"]["home"]
    fuera = g["teams"]["away"]
    return {
        "id": f"{liga}-{g['id']}",
        "external_id": g["id"],
        "start_ts": g.get("timestamp"),
        "date": (g.get("date") or "")[:10],
        "status": STATUS.get(g.get("status", {}).get("short", "NS"), "NS"),
        "round": g.get("week"),
        "venue": g.get("venue") or None,
        "home": {"id": f"{liga}-{casa['id']}", "name": casa["name"], "logo": casa.get("logo"), "score": g["scores"]["home"]["total"]},
        "away": {"id": f"{liga}-{fuera['id']}", "name": fuera["name"], "logo": fuera.get("logo"), "score": g["scores"]["away"]["total"]},
        "period": g.get("status", {}).get("long") if STATUS.get(g.get("status", {}).get("short")) == "LIVE" else None,
    }


def fetch_day(d: date) -> dict[str, list[dict]]:
    data = _get("games", {"date": d.isoformat()})
    if data.get("errors"):
        raise RuntimeError(f"API-Basketball: {data['errors']}")
    salida: dict[str, list[dict]] = {}
    for g in data.get("response", []):
        if g["league"]["id"] not in LIGAS:
            continue
        j = _game(g)
        salida.setdefault(j["id"].split("-")[0], []).append(j)
    return salida


def _hist_path(liga: str) -> Path:
    return HIST / f"{liga}.json"


def cargar_historial(liga: str) -> dict[str, dict]:
    f = _hist_path(liga)
    if f.exists():
        try:
            return json.loads(f.read_text())
        except Exception:
            return {}
    return {}


def guardar_historial(liga: str, partidos: dict[str, dict]) -> None:
    HIST.mkdir(parents=True, exist_ok=True)
    _hist_path(liga).write_text(json.dumps(partidos, ensure_ascii=False, indent=0, sort_keys=True))


def recolectar(dias_atras: int = 1) -> tuple[set[str], int]:
    """Descarga hoy y ayer, y acumula en el histórico. Devuelve (ligas, peticiones)."""
    hoy = datetime.now(timezone.utc).date()
    peticiones = 0
    tocadas: set[str] = set()
    for delta in range(0, dias_atras + 1):
        dia = hoy - timedelta(days=delta)
        try:
            por_liga = fetch_day(dia)
            peticiones += 1
        except Exception as e:
            print(f"  apisports {dia}: {e}")
            continue
        for liga, partidos in por_liga.items():
            hist = cargar_historial(liga)
            for p in partidos:
                hist[p["id"]] = p
            guardar_historial(liga, hist)
            tocadas.add(liga)
        time.sleep(1.2)
    return tocadas, peticiones


def standings(liga: str) -> list[dict]:
    """Clasificación calculada sumando los resultados oficiales acumulados."""
    hist = cargar_historial(liga)
    acc: dict[str, dict] = {}
    for p in hist.values():
        if p["status"] != "FT":
            continue
        hs, as_ = p["home"].get("score"), p["away"].get("score")
        if not isinstance(hs, int) or not isinstance(as_, int):
            continue
        for equipo, pf, pc, gano in (
            (p["home"], hs, as_, hs > as_),
            (p["away"], as_, hs, as_ > hs),
        ):
            fila = acc.setdefault(equipo["name"], {
                "team": equipo["name"], "team_id": equipo["id"], "logo": equipo.get("logo"),
                "played": 0, "wins": 0, "losses": 0, "points_for": 0, "points_against": 0,
            })
            fila["played"] += 1
            fila["wins"] += 1 if gano else 0
            fila["losses"] += 0 if gano else 1
            fila["points_for"] += pf
            fila["points_against"] += pc

    filas = sorted(acc.values(), key=lambda r: (-r["wins"], -(r["points_for"] - r["points_against"])))
    for i, r in enumerate(filas):
        r["rank"] = i + 1
        r["diff"] = r["points_for"] - r["points_against"]
        # puntos de liga: 2 por victoria, 1 por derrota (estándar FIBA)
        r["points"] = r["wins"] * 2 + r["losses"]
    return filas


def fetch_league(liga: str) -> dict:
    """Devuelve el paquete con esquema común para una liga del histórico."""
    hist = cargar_historial(liga)
    partidos = sorted(hist.values(), key=lambda p: p.get("start_ts") or 0, reverse=True)
    return {
        "league": liga,
        "name": NOMBRE_API[liga],
        "season": _season_label(),
        "source": SOURCE,
        "updated": int(time.time()),
        "games": partidos,
        "standings": standings(liga),
    }


def _season_label() -> str:
    hoy = datetime.now()
    inicio = hoy.year if hoy.month >= 8 else hoy.year - 1
    return f"{inicio}-{inicio + 1}"
