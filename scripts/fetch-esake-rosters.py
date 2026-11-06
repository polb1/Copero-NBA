#!/usr/bin/env python3
"""Plantillas de la GBL desde esake.gr (web oficial).

Recorre los equipos de la liga griega, entra en su ficha y saca la plantilla
(nombre, dorsal y posición cuando están publicados). Salida: public/data/gbl-rosters.json

Uso: python3 scripts/fetch-esake-rosters.py
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

LATINOS = {
    "ΠΑΟΚ": "PAOK", "ΑΡΗΣ": "Aris", "ΟΛΥΜΠΙΑΚΟΣ": "Olympiacos", "ΠΕΡΙΣΤΕΡΙ": "Peristeri",
    "ΚΑΡΔΙΤΣΑ": "Karditsa", "ΚΟΛΟΣΣΟΣ": "Kolossos", "ΔΟΞΑ ΛΕΥΚΑΔΑΣ": "Doxa Lefkadas",
    "ΠΑΝΑΘΗΝΑΪΚΟΣ": "Panathinaikos", "ΑΕΚ": "AEK", "ΜΑΡΟΥΣΙ": "Maroussi",
    "ΜΥΚΟΝΟΣ": "Mykonos", "ΠΡΟΜΗΘΕΑΣ ΠΑΤΡΑΣ": "Promitheas Patras", "ΗΡΑΚΛΗΣ": "Iraklis",
    "VIKOS": "Vikos Falcons",
}


def latin(name: str) -> str:
    up = name.upper()
    for g, l in LATINOS.items():
        if up.startswith(g):
            return l
    return name

BASE = "https://esake.gr"
UA = "AnilleroBot/1.0 (+https://anillero.com)"
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "gbl-rosters.json"

CACHE = Path(__file__).resolve().parent.parent / "out" / ".cache"


def get(path: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    key = CACHE / ("esake" + re.sub(r"[^a-zA-Z0-9]+", "_", path) + ".html")
    if key.exists() and (time.time() - key.stat().st_mtime) < 7 * 86400:
        return key.read_text(encoding="utf-8", errors="ignore")
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "ignore")
    key.write_text(html, encoding="utf-8")
    time.sleep(1.2)
    return html


def txt(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def equipos() -> list[tuple[str, str]]:
    """(idteam, nombre) desde la clasificación oficial: se leen los <a> completos."""
    html = get("/el/action/EsakeRanking")
    out: list[tuple[str, str]] = []
    vistos = set()
    for m in re.finditer(r"<a[^>]*EsaketeamView\?idteam=([0-9A-F]+)[^>]*>", html):
        tag, idteam = m.group(0), m.group(1)
        if idteam in vistos:
            continue
        t = re.search(r'title="([^"]+)"', tag)
        if not t:
            continue
        vistos.add(idteam)
        out.append((idteam, t.group(1).strip()))
    return out


def plantilla(idteam: str) -> list[dict]:
    html = get(f"/el/action/EsaketeamView?idteam={idteam}&mode=1")
    jugadores = []
    for tile in re.split(r'<div class="player-tile">', html)[1:]:
        pid = re.search(r"EsakeplayerView\?idplayer=([0-9A-F]+)", tile)
        if not pid:
            continue
        # nombre: primer texto largo dentro del bloque del título
        cuerpo = re.sub(r"<script.*?</script>", " ", tile, flags=re.S)
        candidatos = [t.strip() for t in re.findall(r">\s*([^<>{}]{3,40}?)\s*<", cuerpo)]
        nombre = ""
        for c in candidatos:
            if re.search(r"[\u0370-\u03ffA-Za-z]", c) and not c.lower().startswith(("http", "esake", "ver", "foto")):
                if len(c) > 4 and " " not in c[:2]:
                    nombre = c
                    break
        if not nombre:
            continue
        num = re.search(r'class="[^"]*player-number[^"]*"[^>]*>\s*(\d{1,2})\s*<', tile)
        pos = re.search(r'class="[^"]*player-position[^"]*"[^>]*>\s*([A-Za-zΑ-Ωα-ω/ -]{2,12})\s*<', tile)
        jugadores.append({
            "name": nombre,
            "id": pid.group(1),
            "number": int(num.group(1)) if num else None,
            "pos": pos.group(1).strip() if pos else "",
            "photo": f"https://www.tbf.org.tr" if False else None,
        })
    return jugadores


def main() -> None:
    eqs = equipos()
    print(f"equipos GBL: {len(eqs)}")
    salida: dict[str, list[dict]] = {}
    for idteam, nombre in eqs:
        try:
            jug = plantilla(idteam)
        except Exception as e:  # noqa: BLE001
            print(f"  {nombre}: {e}")
            continue
        if jug:
            salida[latin(nombre)] = jug
        print(f"  {latin(nombre)}: {len(jug)} jugadores")
        time.sleep(0.4)
    OUT.write_text(json.dumps(salida, ensure_ascii=False, indent=0, sort_keys=True))
    print(f"guardado: {sum(len(v) for v in salida.values())} jugadores en {len(salida)} equipos")


if __name__ == "__main__":
    main()
