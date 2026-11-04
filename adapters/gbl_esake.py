"""Adaptador GBL (Greek Basketball League) — fuente: esake.gr (web oficial).

esake.gr es server-side renderizado: la clasificación está en
`/el/action/EsakeRanking` y cada jornada en `/el/action/EsakeResults?series=NN`.
No hay API pública documentada; se parsea el HTML público.

robots.txt: https://esake.gr/robots.txt devuelve 404 (sin restricciones publicadas).
Términos: contenido del organizador (ΕΣΑΚΕ). Uso informativo con atribución al origen.
"""
from __future__ import annotations

import re
import time
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

BASE = "https://esake.gr"
UA = "AnilleroBot/1.0 (+https://anillero.com; contacto: legal@anillero.com)"
SOURCE = "esake.gr (ΕΣΑΚΕ, web oficial GBL)"

MESES_GR = {
    "Ιαν": 1, "Φεβ": 2, "Μαρ": 3, "Απρ": 4, "Μαΐ": 5, "Μαι": 5, "Ιουν": 6,
    "Ιουλ": 7, "Αυγ": 8, "Σεπ": 9, "Οκτ": 10, "Νοε": 11, "Δεκ": 12,
}


CACHE = Path(__file__).resolve().parent.parent / "out" / ".cache"
TTL = 3 * 3600


def _get(path: str, cache_key: str | None = None) -> str:
    """GET con caché en disco y reintentos (3 intentos, backoff)."""
    if cache_key:
        f = CACHE / cache_key
        if f.exists() and (time.time() - f.stat().st_mtime) < TTL:
            return f.read_text(encoding="utf-8")

    ultimo = None
    for intento in range(3):
        try:
            req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                html = r.read().decode("utf-8", "ignore")
            if cache_key:
                CACHE.mkdir(parents=True, exist_ok=True)
                (CACHE / cache_key).write_text(html, encoding="utf-8")
            return html
        except Exception as e:
            ultimo = e
            time.sleep(5 * (intento + 1))
    raise ultimo  # type: ignore[misc]


def _txt(s: str) -> str:
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _team_id(name: str) -> str:
    base = re.sub(r"[^0-9A-Za-zΑ-Ωα-ωΆ-Ώά-ώ]+", "-", name).strip("-").lower()
    return f"gbl-{base}"


def normalize_name(name: str) -> str:
    """Quita patrocinadores del nombre para que el club sea estable."""
    limpio = re.sub(r"\s+(BETSSON|AKTOR|H HOTELS COLLECTION|ELABET|ΙΑΠΩΝΙΚΗ|ONEX|MOTION|CARDS|KAPPA)\s*$", "", name, flags=re.I)
    return limpio.strip() or name



# Nombres latinos de los 14 clubes (clave: nombre griego sin patrocinador)
LATINOS = {
    "ΠΑΟΚ": "PAOK",
    "ΑΡΗΣ": "Aris",
    "ΟΛΥΜΠΙΑΚΟΣ": "Olympiacos",
    "ΠΕΡΙΣΤΕΡΙ": "Peristeri",
    "ΚΑΡΔΙΤΣΑ": "Karditsa",
    "ΚΟΛΟΣΣΟΣ": "Kolossos",
    "ΔΟΞΑ ΛΕΥΚΑΔΑΣ": "Doxa Lefkadas",
    "ΠΑΝΑΘΗΝΑΪΚΟΣ": "Panathinaikos",
    "ΑΕΚ": "AEK",
    "ΜΑΡΟΥΣΙ": "Maroussi",
    "ΜΥΚΟΝΟΣ": "Mykonos",
    "ΠΡΟΜΗΘΕΑΣ ΠΑΤΡΑΣ": "Promitheas Patras",
    "ΗΡΑΚΛΗΣ": "Iraklis",
    "VIKOS ΦALCONS": "Vikos Falcons",
}


def display_name(raw: str) -> str:
    """Nombre griego -> nombre latino del club; si no está en el mapa, se respeta el original."""
    limpio = normalize_name(raw).upper().replace("ΦALCONS", "FALCONS")
    for griego, latin in LATINOS.items():
        if limpio.startswith(griego.upper()):
            return latin
    return normalize_name(raw)


def standings() -> list[dict]:
    html = _get("/el/action/EsakeRanking", "gbl_ranking.html")
    filas = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S)
    out = []
    for f in filas:
        celdas = [_txt(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", f, re.S)]
        if len(celdas) < 9:
            continue
        m = re.match(r"^(\d+)(.+)$", celdas[0])
        if not m:
            continue
        pos, equipo = int(m.group(1)), display_name(m.group(2))
        try:
            pf, pc = [int(x) for x in celdas[6].replace("–", "-").split("-")[:2]]
        except Exception:
            pf = pc = None
        w_l = celdas[3].split("-")
        out.append({
            "rank": pos,
            "team": equipo,
            "team_id": _team_id(equipo),
            "points": int(celdas[1]),
            "played": int(celdas[2]),
            "wins": int(w_l[0].strip()) if len(w_l) > 0 else None,
            "losses": int(w_l[1].strip()) if len(w_l) > 1 else None,
            "points_for": pf,
            "points_against": pc,
            "diff": int(celdas[8]) if celdas[8].lstrip("-").isdigit() else None,
        })
    return out


def _parse_fecha(txt: str) -> int | None:
    """'Σαβ 31 Οκτ - 15:00' -> epoch UTC (año actual o el que toque)."""
    m = re.search(r"(\d{1,2})\s+([Α-Ωα-ω]{3,4})\s*-\s*(\d{1,2}):(\d{2})", txt)
    if not m:
        return None
    dia, mes_txt, hh, mm = int(m.group(1)), m.group(2)[:3], int(m.group(3)), int(m.group(4))
    mes = MESES_GR.get(mes_txt)
    if not mes:
        return None
    hoy = datetime.now(timezone.utc)
    año = hoy.year
    # temporada que cruza año: si el mes es muy anterior al actual, es del año siguiente
    if mes < hoy.month - 6:
        año += 1
    try:
        dt = datetime(año, mes, dia, hh - 2, mm, tzinfo=timezone.utc)  # Grecia UTC+2/+3
        return int(dt.timestamp())
    except Exception:
        return None


def games_round(jornada: int) -> list[dict]:
    html = _get(f"/el/action/EsakeResults?series={jornada:02d}", f"gbl_round_{jornada:02d}.html")
    bloques = re.split(r'<div class="esake-program-game">', html)[1:]
    out = []
    for b in bloques:
        info = re.search(r'class="esake-program-game-info one-col"><img src="/skn/clock\.svg"[^>]*>([^<]+)<', b)
        ids = re.findall(r'idgame=([0-9A-F]+)', b)
        score = re.search(r"<span>(\d+)\s*&nbsp;-\s*&nbsp;(\d+)</span>", b)
        lados = re.findall(r'<div class="col-lg-5 col-md-5 col-sm-4 col-xs-5([^"]*)"[^>]*>(.*?)</div>', b, re.S)
        if len(lados) < 2:
            continue
        home = _team_id(_last_text(lados[0][1]))
        away = _team_id(_last_text(lados[1][1]))
        nombre_home = normalize_text(_last_text(lados[0][1]))
        nombre_away = normalize_text(_last_text(lados[1][1]))
        out.append({
            "id": f"gbl-{ids[0] if ids else jornada}-{_team_id(nombre_home)[-8:]}",
            "round": jornada,
            "start_ts": _parse_fecha(info.group(1)) if info else None,
            "status": "FT" if score else "NS",
            "home": {"id": home, "name": display_name(nombre_home), "score": int(score.group(1)) if score else None},
            "away": {"id": away, "name": display_name(nombre_away), "score": int(score.group(2)) if score else None},
            "period": None,
            "venue": None,
        })
    return out


def _last_text(frag: str) -> str:
    """Del bloque de equipo, el nombre está en el <span> (antes o después del logo)."""
    spans = re.findall(r"<span>(.*?)</span>", frag, re.S)
    return spans[-1] if spans else _txt(frag)


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", _txt(s)).strip()


def fetch(rounds: list[int] | None = None) -> dict:
    st = standings()
    if rounds is None:
        # temporada regular completa: 26 jornadas (la caché evita repetir descargas)
        rounds = list(range(1, 27))

    games: list[dict] = []
    for j in rounds:
        try:
            games.extend(games_round(j))
        except Exception as e:  # una jornada rota no rompe la liga
            print(f"  gbl jornada {j}: {e}")
        time.sleep(1.2)  # cortesía con el servidor

    return {
        "league": "gbl",
        "season": _season_label(),
        "source": SOURCE,
        "updated": int(time.time()),
        "standings": st,
        "games": games,
    }


def _season_label() -> str:
    hoy = datetime.now()
    inicio = hoy.year if hoy.month >= 8 else hoy.year - 1
    return f"{inicio}-{inicio + 1}"
