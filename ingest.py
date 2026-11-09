#!/usr/bin/env python3
"""Ingesta de datos de anillero.com — 5 ligas: NBA, ACB, Euroliga, BSL y GBL.

Uso:
    python3 ingest.py discover         # qué cubre cada fuente y su estado
    python3 ingest.py run              # todas las ligas
    python3 ingest.py run --leagues gbl bsl
    python3 ingest.py run --force      # ignora la caché

Salida (out/):
    {liga}_games.json   {liga}_standings.json   live.json   leagues.json
Esquema común documentado en FUENTES.md. La web sólo lee estos ficheros.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
import locale

# Configurar locale en español para parsear meses abreviados
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'C.UTF-8')
    except locale.Error:
        pass  # fallback to default

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
DATA = ROOT / "public" / "data"
STATE = OUT / ".state.json"

LEAGUES = ["nba", "acb", "euroleague", "lega", "bsl", "bbl", "vtb", "cba", "gbl"]

# ligas servidas por API-Basketball en ventana de fechas
API_LEAGUES = {"lega", "bsl", "bbl", "vtb", "cba"}

# Caché por tipo de dato (segundos)
TTL_GAMES = 3 * 3600
TTL_STANDINGS = 6 * 3600
TTL_LIVE = 5 * 60

# Presupuesto diario de peticiones (API-Basketball free = 100/día)
PRESUPUESTO = {"apisports": 100}


# Meses en español (abreviados)
MESES_ES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12
}


def parse_date_flexible(date_str: str) -> datetime | None:
    """Parsea fechas en formato ISO (2026-11-07) o abreviado (7 nov)."""
    if not date_str:
        return None
    # ISO format
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        pass
    # Formato "d MMM" (ej: "7 nov", "8 nov", "3 oct") - meses en español
    try:
        parts = date_str.strip().split()
        if len(parts) != 2:
            return None
        day = int(parts[0])
        mes_abrev = parts[1].lower()[:3]
        month = MESES_ES.get(mes_abrev)
        if not month:
            return None
        now = datetime.now()
        dt = datetime(now.year, month, day)
        # Si la fecha es futura (ej: diciembre y estamos en noviembre), restar un año
        if dt.month > now.month + 1:  # margen de 1 mes
            dt = dt.replace(year=now.year - 1)
        return dt
    except (ValueError, IndexError):
        return None


# ---------------------------------------------------------------- estado/caché
def load_state() -> dict:
    if STATE.exists():
        try:
            return json.loads(STATE.read_text())
        except Exception:
            return {}
    return {}


def save_state(st: dict) -> None:
    OUT.mkdir(exist_ok=True)
    STATE.write_text(json.dumps(st, indent=1))


def fresco(kind: str, league: str, ttl: int, force: bool) -> bool:
    f = OUT / f"{league}_{kind}.json"
    if force or not f.exists():
        return False
    edad = time.time() - f.stat().st_mtime
    return edad < ttl


def escribir(nombre: str, payload: dict) -> Path:
    OUT.mkdir(exist_ok=True)
    f = OUT / nombre
    f.write_text(json.dumps(payload, ensure_ascii=False, indent=1, default=str))
    return f


def presupuesto_ok(st: dict) -> bool:
    hoy = datetime.now(timezone.utc).date().isoformat()
    uso = st.setdefault("uso", {})
    if uso.get("dia") != hoy:
        uso["dia"] = hoy
        uso["apisports"] = 0
    return uso.get("apisports", 0) < PRESUPUESTO["apisports"]


def consumir(st: dict, n: int = 1) -> None:
    hoy = datetime.now(timezone.utc).date().isoformat()
    uso = st.setdefault("uso", {})
    if uso.get("dia") != hoy:
        uso["dia"] = hoy
        uso["apisports"] = 0
    uso["apisports"] = uso.get("apisports", 0) + n


# ---------------------------------------------------------------- esquema común
def game(gid, start_ts, status, home, away, period=None, venue=None) -> dict:
    return {
        "id": gid,
        "start_ts": start_ts,
        "status": status,          # NS | LIVE | FT | POST | CANC
        "home": home,              # {id, name, score}
        "away": away,
        "period": period,
        "venue": venue,
    }


def season_label() -> str:
    hoy = datetime.now()
    inicio = hoy.year if hoy.month >= 8 else hoy.year - 1
    return f"{inicio}-{inicio + 1}"


# ---------------------------------------------------------------- ligas legadas
LEGACY_KEYS = {
    "nba": ["NBA"],
    "acb": ["Liga ACB", "ACB"],
    "euroleague": ["EuroLeague", "EU"],
}

LEGACY_SOURCE = {
    "nba": "ESPN (site.api.espn.com)",
    "acb": "ACB oficial (acb.com) + Apify para clasificación",
    "euroleague": "api-live.euroleague.net (API oficial)",
}


def legacy(liga: str) -> dict:
    keys = LEGACY_KEYS[liga]
    standings_raw = json.loads((DATA / "standings.json").read_text())
    results = json.loads((DATA / "results.json").read_text())
    fixtures = json.loads((DATA / "fixtures.json").read_text())

    rows = []
    for k in keys:
        if k in standings_raw:
            rows = standings_raw[k]
            break

    standings = [
        {
            "rank": i + 1,
            "team": r.get("team") if isinstance(r, dict) else str(r),
            "played": r.get("pj") if isinstance(r, dict) else None,
            "wins": r.get("w") if isinstance(r, dict) else None,
            "losses": r.get("l") if isinstance(r, dict) else None,
            "points": None,
        }
        for i, r in enumerate(rows)
    ]

    def slug(s: str) -> str:
        import re
        import unicodedata
        s = unicodedata.normalize("NFD", (s or "").lower())
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

    juegos = []
    for r in results:
        if r.get("league") not in keys:
            continue
        if not isinstance(r.get("hs"), int):
            continue
        juegos.append(game(
            f"{liga}-{slug(r['home'])}-{slug(r['away'])}-{r.get('date')}",
            int(dt.replace(tzinfo=timezone.utc).timestamp()) if (dt := parse_date_flexible(r["date"])) else None,
            "FT",
            {"id": f"{liga}-{slug(r['home'])}", "name": r["home"], "score": r["hs"]},
            {"id": f"{liga}-{slug(r['away'])}", "name": r["away"], "score": r["as"]},
        ))
    for f in fixtures:
        if f.get("league") not in keys:
            continue
        juegos.append(game(
            f"{liga}-{slug(f['home'])}-{slug(f['away'])}-{f.get('date')}",
            int(dt.replace(tzinfo=timezone.utc).timestamp()) if (dt := parse_date_flexible(f["date"])) else None,
            "NS",
            {"id": f"{liga}-{slug(f['home'])}", "name": f["home"], "score": None},
            {"id": f"{liga}-{slug(f['away'])}", "name": f["away"], "score": None},
        ))

    juegos = [j for j in juegos if j["start_ts"]]
    juegos.sort(key=lambda g: g["start_ts"], reverse=True)
    return {"standings": standings, "games": juegos, "source": LEGACY_SOURCE[liga]}


# ---------------------------------------------------------------- pipeline
def procesar(liga: str, force: bool, st: dict) -> dict:
    resumen = {"league": liga, "games": 0, "standings": 0, "source": None, "error": None}

    if liga in LEGACY_KEYS:
        res = legacy(liga)
        escribir(f"{liga}_games.json", {
            "league": liga, "season": season_label(), "source": res["source"],
            "updated": int(time.time()), "games": res["games"],
        })
        escribir(f"{liga}_standings.json", {
            "league": liga, "season": season_label(), "source": res["source"],
            "updated": int(time.time()), "standings": res["standings"],
        })
        resumen["games"] = len(res["games"])
        resumen["standings"] = len(res["standings"])
        resumen["source"] = res["source"]
        return resumen

    if liga == "gbl":
        from adapters import gbl_esake
        res = gbl_esake.fetch()
        resumen = _guardar(liga, res, resumen)
        return resumen

    if liga in API_LEAGUES:
        from adapters import apisports_daily as apid
        if not presupuesto_ok(st):
            resumen["error"] = "presupuesto diario de API-Basketball agotado"
            return resumen
        try:
            apid.key()
        except RuntimeError as e:
            resumen["error"] = str(e)
            return resumen
        # la ventana de fechas se descarga una sola vez por ejecución
        if not getattr(procesar, "_ventana_ok", False):
            tocadas, peticiones = apid.recolectar()
            consumir(st, peticiones)
            procesar._ventana_ok = True  # type: ignore[attr-defined]
        res = apid.fetch_league(liga)
        if not res["games"]:
            resumen["error"] = "sin partidos en la ventana de fechas (plan gratuito: hoy y ayer)"
            return resumen
        resumen = _guardar(liga, res, resumen)
        return resumen

    resumen["error"] = "liga desconocida"
    return resumen


def _guardar(liga: str, res: dict, resumen: dict) -> dict:
    escribir(f"{liga}_games.json", {
        "league": liga, "season": res["season"], "source": res["source"],
        "updated": res["updated"], "games": res["games"],
    })
    escribir(f"{liga}_standings.json", {
        "league": liga, "season": res["season"], "source": res["source"],
        "updated": res["updated"], "standings": res["standings"],
    })
    resumen["games"] = len(res["games"])
    resumen["standings"] = len(res["standings"])
    resumen["source"] = res["source"]
    return resumen


def live(st: dict) -> None:
    """Partidos en juego o que empiezan en los próximos 30 minutos."""
    ahora = int(time.time())
    en_vivo = []
    for liga in LEAGUES:
        f = OUT / f"{liga}_games.json"
        if not f.exists():
            continue
        datos = json.loads(f.read_text())
        for g in datos.get("games", []):
            ts = g.get("start_ts")
            if not ts:
                continue
            if g["status"] == "LIVE" or (g["status"] == "NS" and 0 <= g["start_ts"] - ahora <= 1800):
                en_vivo.append({
                    "league": liga, "id": g["id"], "start_ts": g["start_ts"],
                    "status": g["status"],
                    "home": g["home"], "away": g["away"], "period": g.get("period"),
                })
    escribir("live.json", {"updated": ahora, "count": len(en_vivo), "games": en_vivo})


def indice(resumenes: list[dict], st: dict) -> None:
    escribir("leagues.json", {
        "updated": int(time.time()),
        "leagues": [{"key": r["league"], "games": r["games"], "standings": r["standings"],
                     "source": r["source"], "error": r["error"]} for r in resumenes],
        "budget": st.get("uso", {}),
    })


# ---------------------------------------------------------------- CLI
def api_id(liga: str) -> int:
    from adapters.apisports_daily import LIGAS
    for k, v in LIGAS.items():
        if v == liga:
            return k
    return 0


def cmd_discover() -> None:
    print(f"Descubrimiento de fuentes ({len(LEAGUES)} ligas)\n")
    for liga in LEAGUES:
        print(f"· {liga}")
        if liga in LEGACY_KEYS:
            print(f"    fuente: {LEGACY_SOURCE[liga]} (ya integrada en update-actualidad.py)")
        elif liga == "gbl":
            print("    fuente: esake.gr (web oficial, HTML público, robots.txt 404)")
            try:
                sys.path.insert(0, str(ROOT))
                from adapters import gbl_esake
                st = gbl_esake.standings()
                print(f"    cobertura: {len(st)} equipos, jornadas 1-26, resultados con cuartos")
                print(f"    muestra: {st[0]['team']} {st[0]['wins']}-{st[0]['losses']} ({st[0]['points']} pts)")
            except Exception as e:
                print(f"    ERROR: {e}")
        elif liga in API_LEAGUES:
            from adapters import apisports_daily as apid
            print(f"    fuente: API-Basketball liga {api_id(liga)} (ventana de fechas: hoy y ayer)")
            print("    L1 sí (calendario/resultados) · L2/L3 no en plan gratuito")
            continue
        print()


def cmd_run(ligas: list[str], force: bool) -> int:
    OUT.mkdir(exist_ok=True)
    st = load_state()
    resumenes = []
    fallos = 0
    for liga in ligas:
        try:
            r = procesar(liga, force, st)
        except Exception:
            r = {"league": liga, "games": 0, "standings": 0, "source": None,
                 "error": traceback.format_exc(limit=2).splitlines()[-1]}
            fallos += 1
        estado = r["error"] or f"{r['games']} partidos · {r['standings']} equipos"
        print(f"{liga:11s} {estado}")
        resumenes.append(r)
    live(st)
    indice(resumenes, st)
    save_state(st)
    print(f"\npresupuesto APIs hoy: {st.get('uso', {}).get('apisports', 0)}/{PRESUPUESTO['apisports']}")
    return 1 if fallos else 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingesta de datos de anillero.com")
    ap.add_argument("cmd", choices=["discover", "run"], nargs="?", default="run")
    ap.add_argument("--leagues", nargs="*", default=None, choices=LEAGUES)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    if args.cmd == "discover":
        cmd_discover()
        return 0
    return cmd_run(args.leagues or LEAGUES, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
