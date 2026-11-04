"""Adaptador BSL (Basketbol Süper Ligi, Turquía) — fuente: API-Basketball (api-sports.io).

Estado de las fuentes oficiales (comprobado el 2026-11-04):
- bsl.org.tr  -> 410 Gone (dominio retirado).
- tbf.org.tr  -> 403 + challenge de Cloudflare. Prohibido evadir bloqueos: descartada.
- basketbolsuperligi.com -> dominio aparcado (94 bytes).
- realgm / eurobasket.com -> 403 / sin conexión.

Por eso la única vía viable y lícita es API-Basketball con su plan gratuito
(100 peticiones/día). Requiere clave gratuita: https://dashboard.api-sports.io

Variables de entorno:
  API_BASKETBALL_KEY   (obligatoria para esta liga)
  API_BASKETBALL_HOST  (opcional, por defecto v1.basketball.api-sports.io)
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime

HOST = os.environ.get("API_BASKETBALL_HOST", "v1.basketball.api-sports.io")
LEAGUE_ID = 97          # Super Ligi (Turquía) en API-Basketball
SOURCE = "API-Basketball (api-sports.io), plan gratuito"

STATUS_MAP = {
    "NS": "NS", "TBD": "NS", "PST": "POST",
    "FT": "FT", "AOT": "FT", "AET": "FT",
    "Q1": "LIVE", "Q2": "LIVE", "Q3": "LIVE", "Q4": "LIVE",
    "OT": "LIVE", "BT": "LIVE", "HT": "LIVE", "LIVE": "LIVE",
    "CANC": "CANC", "ABD": "CANC", "AWD": "FT",
}


class SinClave(RuntimeError):
    pass


def key() -> str:
    k = os.environ.get("API_BASKETBALL_KEY", "").strip()
    if k:
        return k
    env = os.path.join(os.path.expanduser("~"), ".hermes", "apisports.env")
    if os.path.exists(env):
        for line in open(env):
            if line.startswith("API_BASKETBALL_KEY="):
                return line.split("=", 1)[1].strip()
    raise SinClave("falta API_BASKETBALL_KEY (registro gratuito en dashboard.api-sports.io)")


def _get(path: str, params: dict) -> dict:
    url = f"https://{HOST}/{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "x-apisports-key": key(),
        "User-Agent": "AnilleroBot/1.0 (+https://anillero.com)",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def season_label() -> str:
    hoy = datetime.now()
    inicio = hoy.year if hoy.month >= 8 else hoy.year - 1
    return f"{inicio}-{inicio + 1}"


def _team(t: dict) -> dict:
    return {"id": f"bsl-{t.get('id')}", "name": t.get("name") or "", "score": None}


def _game(g: dict) -> dict:
    estado = STATUS_MAP.get(g.get("status", {}).get("short", "NS"), "NS")
    return {
        "id": f"bsl-{g.get('id')}",
        "start_ts": _ts(g.get("date")),
        "status": estado,
        "home": {**_team(g.get("teams", {}).get("home", {})), "score": g.get("scores", {}).get("home", {}).get("total")},
        "away": {**_team(g.get("teams", {}).get("away", {})), "score": g.get("scores", {}).get("away", {}).get("total")},
        "period": g.get("status", {}).get("long") if estado == "LIVE" else None,
        "venue": g.get("venue") or None,
    }


def _ts(iso: str | None) -> int | None:
    if not iso:
        return None
    try:
        return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())
    except ValueError:
        return None


def fetch() -> dict:
    season = season_label()
    games = fetch_games(season)
    return {
        "league": "bsl",
        "season": season,
        "source": SOURCE,
        "updated": int(time.time()),
        "standings": fetch_standings(season),
        "games": games,
    }


def fetch_games(season: str) -> list[dict]:
    out: list[dict] = []
    for bloque in (["1-60"], ["61-120"], ["121-180"], ["181-240"]):
        try:
            data = _get("games", {"league": LEAGUE_ID, "season": season, "timezone": "Europe/Istanbul"})
        except Exception as e:
            print(f"  bsl games: {e}")
            return out
        out.extend(_game(g) for g in data.get("response", []))
        break  # la API devuelve la temporada completa en una llamada
    return out


def fetch_standings(season: str) -> list[dict]:
    try:
        data = _get("standings", {"league": LEAGUE_ID, "season": season})
    except Exception as e:
        print(f"  bsl standings: {e}")
        return []
    filas: list[dict] = []
    for grupo in data.get("response", []):
        for f in grupo:
            if not isinstance(f, dict):
                continue
            filas.append({
                "rank": f.get("position"),
                "team": (f.get("team") or {}).get("name"),
                "team_id": f"bsl-{(f.get('team') or {}).get('id')}",
                "played": f.get("games", {}).get("played"),
                "wins": f.get("games", {}).get("win", {}).get("total"),
                "losses": f.get("games", {}).get("lose", {}).get("total"),
                "points_for": f.get("points", {}).get("for"),
                "points_against": f.get("points", {}).get("against"),
                "points": (f.get("games", {}).get("win", {}).get("total") or 0) * 2
                          + (f.get("games", {}).get("lose", {}).get("total") or 0),
            })
    filas.sort(key=lambda x: (x["rank"] if isinstance(x["rank"], int) else 99))
    return filas
