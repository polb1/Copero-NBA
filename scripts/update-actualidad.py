#!/usr/bin/env python3
"""
Actualiza los datos de la sección /actualidad de Copero-NBA.

Fuente: API pública de ESPN (sin clave).
  · NBA: clasificación (ambas conferencias) + resultados + próximos partidos.
  · EuroLeague: resultados y próximos partidos.
  · B.League: se conserva lo que haya (ESPN no la cubre).

Escribe en ~/codigo/copero-NBA/public/data/:
  standings.json, results.json, fixtures.json

Nunca deja la web vacía: si una fuente falla, conserva el archivo anterior.
"""
import gzip
import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

DATA = os.path.expanduser("~/codigo/copero-NBA/public/data")
UA = "CoperoNBA/1.0 (+actualidad)"
ESPN = "https://site.api.espn.com/apis"


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read()
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return json.loads(raw.decode("utf-8", "replace"))


def read_json(name, default):
    try:
        with open(os.path.join(DATA, name), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def write_json(name, payload):
    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, name)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def nba_standings():
    data = get_json(f"{ESPN}/v2/sports/basketball/nba/standings")
    rows = []
    for conf in data.get("children", []):
        conf_name = conf.get("abbreviation") or conf.get("name", "")
        for entry in conf.get("standings", {}).get("entries", []):
            stats = {s.get("name"): s.get("value") for s in entry.get("stats", [])}
            team = entry.get("team", {}).get("displayName", "")
            if not team:
                continue
            wins = int(stats.get("wins") or 0)
            losses = int(stats.get("losses") or 0)
            rows.append({
                "team": team,
                "conf": conf_name,
                "w": wins,
                "l": losses,
                "pct": (wins / (wins + losses)) if (wins + losses) else 0.0,
                "seed": int(stats.get("playoffSeed") or 99),
            })
    if not rows:
        return None
    rows.sort(key=lambda r: (-r["pct"], -r["w"], r["seed"]))
    return [
        {"rank": i, "team": r["team"], "w": r["w"], "l": r["l"], "form": "", "conf": r["conf"]}
        for i, r in enumerate(rows[:10], start=1)
    ]


def scoreboard(slug, days_back=2, days_ahead=2):
    results, fixtures = [], []
    today = datetime.now(timezone.utc).date()
    for delta in range(-days_back, days_ahead + 1):
        day = today + timedelta(days=delta)
        try:
            data = get_json(f"{ESPN}/site/v2/sports/basketball/{slug}/scoreboard?dates={day:%Y%m%d}")
        except Exception:
            continue
        for event in data.get("events", []):
            comp = (event.get("competitions") or [{}])[0]
            state = ((comp.get("status") or {}).get("type") or {}).get("state")
            teams = comp.get("competitors") or []
            if len(teams) != 2:
                continue
            home = next((t for t in teams if t.get("homeAway") == "home"), teams[0])["team"].get("displayName", "")
            away = next((t for t in teams if t.get("homeAway") == "away"), teams[1])["team"].get("displayName", "")
            if not home or not away:
                continue
            if state == "post":
                try:
                    hs = int(next(t for t in teams if t.get("homeAway") == "home").get("score"))
                    as_ = int(next(t for t in teams if t.get("homeAway") == "away").get("score"))
                except (TypeError, ValueError, StopIteration):
                    continue
                results.append({"date": day.strftime("%d %b"), "home": home, "away": away, "hs": hs, "as": as_})
            elif state == "pre":
                when = ""
                try:
                    iso = event.get("date", "").replace("Z", "+00:00")
                    when = datetime.fromisoformat(iso).astimezone().strftime("%H:%M")
                except Exception:
                    pass
                note = ""
                if comp.get("notes"):
                    note = (comp["notes"][0] or {}).get("headline", "") or ""
                fixtures.append({"date": day.strftime("%d %b"), "time": when, "home": home, "away": away, "event": note})
    return results, fixtures


def main():
    changed = []

    # ---- NBA clasificación
    try:
        nba = nba_standings()
        if nba:
            standings = read_json("standings.json", {})
            standings["NBA"] = nba
            write_json("standings.json", standings)
            changed.append(f"NBA tabla {len(nba)}")
    except Exception as e:
        print(f"[warn] NBA tabla: {e}")

    # ---- NBA resultados + calendario
    try:
        res, fix = scoreboard("nba")
        if res or fix:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") != "NBA"]
            write_json("results.json", ([dict(r, league="NBA") for r in res] + others)[:12])
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "NBA"]
            write_json("fixtures.json", ([dict(f, league="NBA") for f in fix] + othersf)[:10])
            changed.append(f"NBA {len(res)} res / {len(fix)} próx")
    except Exception as e:
        print(f"[warn] NBA marcador: {e}")

    # ---- EuroLeague resultados + calendario
    try:
        res, fix = scoreboard("euroleague")
        if res or fix:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") != "EU"]
            write_json("results.json", ([dict(r, league="EU") for r in res] + others)[:12])
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "EU"]
            write_json("fixtures.json", ([dict(f, league="EU") for f in fix] + othersf)[:10])
            changed.append(f"EU {len(res)} res / {len(fix)} próx")
    except Exception as e:
        print(f"[warn] EuroLeague: {e}")

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"[{stamp}] " + ("Actualizado: " + " · ".join(changed) if changed else "Sin cambios; se conserva lo anterior."))


if __name__ == "__main__":
    main()
