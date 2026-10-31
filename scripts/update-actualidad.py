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
import time
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
        for i, r in enumerate(rows, start=1)
    ]


def fecha_corta(day):
    """date -> '31 oct' (siempre en español y en minúsculas)."""
    return f"{day.day} {MESES[day.month - 1]}"


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
                results.append({"date": fecha_corta(day), "home": home, "away": away, "hs": hs, "as": as_})
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
                fixtures.append({"date": fecha_corta(day), "time": when, "home": home, "away": away, "event": note})
    return results, fixtures



# ---------------------------------------------------------------- B.League
BL_NAMES = {
    "アルバルク東京": "Alvark Tokyo",
    "千葉ジェッツ": "Chiba Jets",
    "宇都宮ブレックス": "Utsunomiya Brex",
    "琉球ゴールデンキングス": "Ryukyu Golden Kings",
    "秋田ノーザンハピネッツ": "Akita Northern Happinets",
    "群馬クレインサンダーズ": "Gunma Crane Thunders",
    "サンロッカーズ渋谷": "Sunrockers Shibuya",
    "川崎ブレイブサンダース": "Kawasaki Brave Thunders",
    "横浜ビー・コルセアーズ": "Yokohama B-Corsairs",
    "信州ブレイブウォリアーズ": "Shinshu Brave Warriors",
    "三遠ネオフェニックス": "San-en NeoPhoenix",
    "名古屋ダイヤモンドドルフィンズ": "Nagoya Diamond Dolphins",
    "ファイティングイーグルス名古屋": "Fighting Eagles Nagoya",
    "京都ハンナリーズ": "Kyoto Hannaryz",
    "大阪エヴェッサ": "Osaka Evessa",
    "島根スサノオマジック": "Shimane Susanoo Magic",
    "広島ドラゴンフライズ": "Hiroshima Dragonflies",
    "佐賀バルーナーズ": "Saga Ballooners",
    "長崎ヴェルカ": "Nagasaki Velca",
    "越谷アルファーズ": "Koshigaya Alphas",
    "茨城ロボッツ": "Ibaraki Robots",
    "滋賀レイクス": "Shiga Lakes",
    "富山グラウジーズ": "Toyama Grouses",
    "新潟アルビレックスBB": "Niigata Albirex BB",
    "仙台89ERS": "Sendai 89ers",
    "レバンガ北海道": "Levanga Hokkaido",
    "サンロッカーズ": "Sunrockers Shibuya",
    "横浜ビー・コルセアーズ": "Yokohama B-Corsairs",
    "ファイティングイーグルス": "Fighting Eagles Nagoya",
    "名古屋ダイヤモンドドルフィンズ": "Nagoya Diamond Dolphins",
    "茨城ロボッツ": "Ibaraki Robots",
    "富山グラウジーズ": "Toyama Grouses",
    "新潟アルビレックス": "Niigata Albirex BB",
    "滋賀レイクス": "Shiga Lakes",
    "京都ハンナリーズ": "Kyoto Hannaryz",
    "大阪エヴェッサ": "Osaka Evessa",
    "島根スサノオマジック": "Shimane Susanoo Magic",
    "広島ドラゴンフライズ": "Hiroshima Dragonflies",
    "佐賀バルーナーズ": "Saga Ballooners",
    "長崎ヴェルカ": "Nagasaki Velca",
    "越谷アルファーズ": "Koshigaya Alphas",
    "三遠ネオフェニックス": "San-en NeoPhoenix",
    "群馬クレインサンダーズ": "Gunma Crane Thunders",
    "川崎ブレイブサンダース": "Kawasaki Brave Thunders",
    "秋田ノーザンハピネッツ": "Akita Northern Happinets",
    "宇都宮ブレックス": "Utsunomiya Brex",
    "千葉ジェッツ": "Chiba Jets",
    "アルバルク東京": "Alvark Tokyo",
    "琉球ゴールデンキングス": "Ryukyu Golden Kings",
}
BL_SHORT = {
    "A東京": "Alvark Tokyo", "A千葉": "Chiba Jets", "千葉": "Chiba Jets",
    "宇都宮": "Utsunomiya Brex", "琉球": "Ryukyu Golden Kings", "秋田": "Akita Northern Happinets",
    "群馬": "Gunma Crane Thunders", "渋谷": "Sunrockers Shibuya", "川崎": "Kawasaki Brave Thunders",
    "横浜": "Yokohama B-Corsairs", "信州": "Shinshu Brave Warriors", "三遠": "San-en NeoPhoenix",
    "名古屋D": "Nagoya Diamond Dolphins", "FE名古屋": "Fighting Eagles Nagoya", "京都": "Kyoto Hannaryz",
    "大阪": "Osaka Evessa", "島根": "Shimane Susanoo Magic", "広島": "Hiroshima Dragonflies",
    "佐賀": "Saga Ballooners", "長崎": "Nagasaki Velca", "越谷": "Koshigaya Alphas",
    "茨城": "Ibaraki Robots", "滋賀": "Shiga Lakes", "富山": "Toyama Grouses", "新潟": "Niigata Albirex BB",
    "三河": "SeaHorses Mikawa", "仙台": "Sendai 89ers", "北海道": "Levanga Hokkaido",
    "東京SR": "Sunrockers Shibuya", "神戸": "Kobe Storks", "千葉J": "Chiba Jets",
}


def bl_en(name):
    text = name.strip()
    for jp, en in BL_NAMES.items():
        if jp and jp in text:
            return en
    for jp, en in BL_SHORT.items():
        if text.endswith(jp) or text.startswith(jp):
            return en
    return text


def bleague_standings():
    import re
    req = urllib.request.Request("https://www.bleague.jp/standings/", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        html = r.read().decode("utf-8", "replace")
    table = re.search(r"<table[^>]*>(.*?)</table>", html, re.S)
    if not table:
        return None
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table.group(1), re.S)[1:]:
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        if len(cells) < 5 or not cells[0].isdigit():
            continue
        try:
            wins, losses = int(cells[2]), int(cells[3])
        except ValueError:
            continue
        rows.append({
            "rank": int(cells[0]),
            "team": bl_en(cells[1]),
            "w": wins,
            "l": losses,
            "form": "",
            "conf": "B1",
        })
    return rows or None


def bleague_today():
    hoy_corto = corta_fecha(datetime.now().strftime("%Y-%m-%d"))
    """Marcadores de hoy desde la web oficial (schedule + endpoint JSON)."""
    import re
    req = urllib.request.Request("https://www.bleague.jp/schedule/", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        html = r.read().decode("utf-8", "replace")
    games = []
    for m in re.finditer(r'<li class="list-item" id="(\d+)">(.*?)</li>', html, re.S):
        key, body = m.group(1), m.group(2)
        teams = re.findall(r'class="team-name">([^<]+)<', body)
        times = re.findall(r'(\d{1,2}:\d{2})', body)
        if len(teams) >= 2:
            games.append({"key": key, "home": bl_en(teams[0]), "away": bl_en(teams[1]), "time": times[0] if times else ""})
    if not games:
        return [], []
    keys = ",".join(g["key"] for g in games)
    data = get_json(f"https://www.bleague.jp/direct/bleague/get_today_games_score/?ScheduleKey={keys}")
    if not isinstance(data, dict):
        data = {}
    results, fixtures = [], []
    for g in games:
        info = (data.get(g["key"]) or {}).get("Game") or {}
        hs, as_ = info.get("HomeTeamScore"), info.get("AwayTeamScore")
        ended = str(info.get("GameEndedFlg")) == "1"
        if ended and str(hs).isdigit() and str(as_).isdigit():
            results.append({"date": hoy_corto, "home": g["home"], "away": g["away"], "hs": int(hs), "as": int(as_)})
        else:
            fixtures.append({"date": hoy_corto, "time": g["time"], "home": g["home"], "away": g["away"], "event": ""})
    return results, fixtures



# ---------------------------------------------------------------- TheSportsDB
TSDB = "https://www.thesportsdb.com/api/v1/json/123"
TSDB_LEAGUES = {
    4408: "Liga ACB",
    4433: "Lega Basket Serie A",
    4441: "Basketball Bundesliga",
    4423: "LNB Élite",
    4452: "Greek Basket League",
    4474: "Ligat ha'Al",
    4478: "LKL",
    4475: "Basketbol Süper Ligi",
    4434: "NBL Australia",
}

MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def corta_fecha(iso):
    try:
        d = datetime.strptime(iso[:10], "%Y-%m-%d")
        return f"{d.day} {MESES[d.month - 1]}"
    except Exception:
        return iso[:10]


def _canon(name, index):
    import re as _re
    key = _re.sub(r"[^a-z0-9]+", "", (name or "").lower())
    return index.get(key, name)


def _name_index():
    """Índice de nombres normalizados -> nombre original (para cuadrar equipos)."""
    import re as _re
    import unicodedata
    path = os.path.join(DATA, "..", "..", "src", "actualidad", "crestMap.json")
    try:
        with open(path, encoding="utf-8") as f:
            names = list(json.load(f).keys())
    except Exception:
        names = []
    idx = {}
    for n in names:
        s = unicodedata.normalize("NFD", n.lower())
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        idx[_re.sub(r"[^a-z0-9]+", "", s)] = n
    return idx


def _tsdb(url, intentos=3):
    for i in range(intentos):
        try:
            return get_json(url)
        except Exception as e:  # noqa: BLE001
            if "429" in str(e) and i < intentos - 1:
                time.sleep(9 * (i + 1))
                continue
            raise
    return {}


def tsdb_events(league_id):
    """Resultados (season) y próximos partidos de una liga. Respeta el rate limit."""
    last, nxt, proximos_season = [], [], []
    season = "2026-2027"
    try:
        d = _tsdb(f"{TSDB}/eventsseason.php?id={league_id}&s={season}")
        todos = d.get("events") or []
        jugados = [e for e in todos if e.get("intHomeScore") not in (None, "")]
        jugados.sort(key=lambda e: e.get("dateEvent") or "")
        last = jugados[-8:]
        hoy = datetime.now().strftime("%Y-%m-%d")
        pendientes = [e for e in todos
                      if e.get("intHomeScore") in (None, "") and (e.get("dateEvent") or "") >= hoy]
        pendientes.sort(key=lambda e: e.get("dateEvent") or "")
        proximos_season = pendientes[:8]
    except Exception as e:  # noqa: BLE001
        print(f"[warn] tsdb season {league_id}: {e}")
    nxt = proximos_season
    if not nxt:
        time.sleep(2.5)
        try:
            d = _tsdb(f"{TSDB}/eventsnextleague.php?id={league_id}")
            nxt = (d.get("events") or [])[:8]
        except Exception as e:  # noqa: BLE001
            print(f"[warn] tsdb next {league_id}: {e}")
    time.sleep(2.5)
    return last, nxt


def update_otras_ligas():
    idx = _name_index()
    results = read_json("results.json", [])
    fixtures = read_json("fixtures.json", [])
    tocadas = []
    for lid, liga in TSDB_LEAGUES.items():
        last, nxt = tsdb_events(lid)
        if not last and not nxt:
            continue
        results = [r for r in results if r.get("league") != liga]
        fixtures = [f for f in fixtures if f.get("league") != liga]
        for e in last[-6:]:
            try:
                hs, as_ = int(e.get("intHomeScore")), int(e.get("intAwayScore"))
            except (TypeError, ValueError):
                continue
            results.append({
                "date": corta_fecha(e.get("dateEvent") or ""),
                "home": _canon(e.get("strHomeTeam"), idx),
                "away": _canon(e.get("strAwayTeam"), idx),
                "hs": hs, "as": as_, "league": liga,
            })
        for e in nxt[:6]:
            fixtures.append({
                "date": corta_fecha(e.get("dateEvent") or ""),
                "time": (e.get("strTime") or "")[:5],
                "home": _canon(e.get("strHomeTeam"), idx),
                "away": _canon(e.get("strAwayTeam"), idx),
                "event": e.get("strVenue") or "",
                "league": liga,
            })
        tocadas.append(f"{liga} {len(last[-6:])}/{len(nxt[:6])}")
    write_json("results.json", results)
    write_json("fixtures.json", fixtures)
    return tocadas


# ---------------------------------------------------------------------- Noticias
FEEDS = [
    ("NBA Maniacs", "https://www.nbamaniacs.com/feed/", "NBA"),
    ("Gigantes del Basket", "https://www.gigantes.com/feed/", "BALONCESTO"),
    ("Relevo", "https://relevo.com/rss", "BALONCESTO"),
    ("Mundo Deportivo", "https://www.mundodeportivo.com/rss/baloncesto", "BALONCESTO"),
]
CUOTA_FUENTE = 7


def _clean(txt):
    import html as _html
    import re as _re
    txt = _html.unescape(txt or "")
    txt = _re.sub(r"<[^>]+>", " ", txt)
    txt = _html.unescape(txt)
    txt = _re.sub(r"<[^>]+>", " ", txt)
    return _re.sub(r"\s+", " ", txt).strip()


def _image(item):
    import re as _re
    for pat in (r'media:content[^>]*url="([^"]+)"', r'enclosure[^>]*url="([^"]+)"',
                r'<img[^>]+src="([^"]+)"'):
        m = _re.search(pat, item, _re.I)
        if m:
            return m.group(1)
    return ""


def _cat(title, default):
    t = (title or "").lower()
    if "nba" in t or "lakers" in t or "celtics" in t:
        return "NBA"
    if "euroliga" in t or "euroleague" in t:
        return "EUROLEAGUE"
    if "acb" in t or "liga endesa" in t:
        return "LIGA ACB"
    if "b.league" in t or "b-league" in t:
        return "B.LEAGUE"
    return default


def update_noticias():
    import re as _re
    from email.utils import parsedate_to_datetime

    items, seen = [], set()
    for source, url, default_cat in FEEDS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                xml = r.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            print(f"[warn] feed {source}: {e}")
            continue
        for raw in _re.findall(r"<item>(.*?)</item>", xml, _re.S):
            t = _re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", raw, _re.S)
            l = _re.search(r"<link>(.*?)</link>", raw, _re.S)
            d = _re.search(r"<pubDate>(.*?)</pubDate>", raw, _re.S)
            desc = _re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", raw, _re.S)
            if not (t and l):
                continue
            title = _clean(t.group(1))
            link = _clean(l.group(1))
            if not title or link in seen:
                continue
            try:
                dt = parsedate_to_datetime(d.group(1)) if d else datetime.now(timezone.utc)
            except Exception:
                dt = datetime.now(timezone.utc)
            seen.add(link)
            items.append({
                "source": source,
                "category": _cat(title, default_cat),
                "title": title,
                "url": link,
                "date": dt.strftime("%Y-%m-%d"),
                "ts": dt.timestamp(),
                "image": _image(raw),
                "summary": _clean(desc.group(1))[:260] if desc else "",
            })
    # cuota por fuente: que no la copen los feeds con más volumen
    items.sort(key=lambda i: i["ts"], reverse=True)
    recuento, filtrados = {}, []
    for it in items:
        if recuento.get(it["source"], 0) >= CUOTA_FUENTE:
            continue
        recuento[it["source"]] = recuento.get(it["source"], 0) + 1
        filtrados.append(it)
    items = filtrados

    # imagen de portada para las que no traen ninguna (og:image)
    faltan = [i for i in items if not i["image"]][:12]
    for it in faltan:
        try:
            req = urllib.request.Request(it["url"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                html = r.read().decode("utf-8", "ignore")
            m = _re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html)
            if m:
                it["image"] = m.group(1)
        except Exception:
            pass

    for i in items:
        i.pop("ts", None)
    if items:
        write_json("actualidad.json", items[:30])
    return len(items[:30])


def _dedupe_rows(rows):
    """Quita equipos duplicados y renumera (B.League trae filas repetidas)."""
    best = {}
    for r in rows or []:
        t = (r.get("team") or "").strip()
        if not t:
            continue
        if t not in best or (r.get("w", 0) + r.get("l", 0)) > (best[t].get("w", 0) + best[t].get("l", 0)):
            r = dict(r, team=t)
            best[t] = r
    out = sorted(best.values(), key=lambda r: (-(r.get("w", 0) / max(1, r.get("w", 0) + r.get("l", 0))), -r.get("w", 0)))
    for i, r in enumerate(out, 1):
        r["rank"] = i
    return out



# ------------------------------------------------------- EuroLeague (API oficial)
EL_API = "https://api-live.euroleague.net/v1"


def _xml(url):
    import xml.etree.ElementTree as ET
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return ET.fromstring(r.read())


def euroleague_all():
    """Resultados, calendario y clasificación completos de la Euroliga."""
    resultados, fixtures, rows = [], [], []
    season = "E2026"
    try:
        root = _xml(f"{EL_API}/results?seasonCode={season}")
        games = []
        for g in root.findall("game"):
            def t(tag):
                el = g.find(tag)
                return (el.text or "").strip() if el is not None else ""
            hs, as_ = t("homescore"), t("awayscore")
            played = t("played").lower() == "true" and hs.isdigit() and as_.isdigit()
            games.append({
                "date": t("date"), "home": t("hometeam"), "away": t("awayteam"),
                "hs": int(hs) if hs.isdigit() else None,
                "as": int(as_) if as_.isdigit() else None,
                "round": t("gameday"), "played": played,
            })
        jugados = [g for g in games if g["played"]]
        pendientes = [g for g in games if not g["played"]]
        resultados = jugados[-20:]
        fixtures = pendientes[:20]
    except Exception as e:  # noqa: BLE001
        print(f"[warn] Euroliga resultados: {e}")

    try:
        root = _xml(f"{EL_API}/standings?seasonCode={season}")
        for i, team in enumerate(root.iter("team"), 1):
            def t(tag):
                el = team.find(tag)
                return (el.text or "").strip() if el is not None else ""
            w, l = int(t("wins") or 0), int(t("losses") or 0)
            rows.append({"rank": int(t("ranking") or i), "team": t("name"), "w": w, "l": l,
                         "form": "", "conf": "EL"})
        rows.sort(key=lambda r: r["rank"])
    except Exception as e:  # noqa: BLE001
        print(f"[warn] Euroliga tabla: {e}")
    return resultados, fixtures, rows


# ------------------------------------------------------------- B.League (meses)
MESES_EN = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
            7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}


def _fecha_el(s):
    """'Oct 22, 2026' -> '22 oct'"""
    try:
        dt = datetime.strptime(s.strip(), "%b %d, %Y")
        return f"{dt.day} {MESES[dt.month - 1]}", dt
    except Exception:
        return s, None


def bleague_month(year, month):
    import re
    url = f"https://www.bleague.jp/schedule/?year={year}&month={month}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")
    out = []
    for m in re.finditer(r'<li class="list-item"[^>]*>(.*?)</li>', html, re.S):
        body = m.group(1)
        teams = re.findall(r'class="team-name">([^<]+)<', body)
        if len(teams) < 2:
            continue
        hs = re.search(r'class="number home-score[^"]*">\s*<span>(\d{1,3})</span>', body)
        as_ = re.search(r'class="number away-score[^"]*">\s*<span>(\d{1,3})</span>', body)
        ts = re.search(r'"GameDateTime":\s*"(\d{9,11})"', body)
        fecha, hora = "", ""
        if ts:
            raw = int(ts.group(1))
            if raw > 10**12:  # milisegundos
                raw //= 1000
            try:
                dt = datetime.fromtimestamp(raw)
                if 1 <= dt.day <= 31:
                    fecha = f"{dt.day} {MESES[dt.month - 1]}"
                    hora = dt.strftime("%H:%M")
            except (ValueError, OSError):
                pass
        out.append({
            "date": fecha,
            "home": bl_en(teams[0]),
            "away": bl_en(teams[1]),
            "hs": int(hs.group(1)) if hs else None,
            "as": int(as_.group(1)) if as_ else None,
            "time": hora,
        })
    return out


def bleague_all():
    res, fix = [], []
    hoy = datetime.now()
    for delta in (0, 1, 2):
        y, mth = hoy.year, hoy.month + delta
        while mth > 12:
            mth -= 12
            y += 1
        try:
            for g in bleague_month(y, mth):
                row = {"date": g["date"], "home": g["home"], "away": g["away"], "league": "B.League"}
                if g["hs"] is not None and g["as"] is not None:
                    res.append(dict(row, hs=g["hs"], as_=g["as"]))
                else:
                    fix.append(dict(row, time=g["time"], event=""))
        except Exception as e:  # noqa: BLE001
            print(f"[warn] B.League {y}-{mth}: {e}")
    return res, fix


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
            write_json("results.json", ([dict(r, league="NBA") for r in res] + others)[:60])
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "NBA"]
            write_json("fixtures.json", ([dict(f, league="NBA") for f in fix] + othersf)[:60])
            changed.append(f"NBA {len(res)} res / {len(fix)} próx")
    except Exception as e:
        print(f"[warn] NBA marcador: {e}")

    # ---- EuroLeague resultados + calendario
    try:
        res, fix = scoreboard("euroleague")
        if res or fix:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") != "EU"]
            write_json("results.json", ([dict(r, league="EU") for r in res] + others)[:60])
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "EU"]
            write_json("fixtures.json", ([dict(f, league="EU") for f in fix] + othersf)[:60])
            changed.append(f"EU {len(res)} res / {len(fix)} próx")
    except Exception as e:
        print(f"[warn] EuroLeague: {e}")

    # ---- B.League (web oficial)
    try:
        bl = _dedupe_rows(bleague_standings())
        if bl:
            standings = read_json("standings.json", {})
            standings["B.League"] = bl
            write_json("standings.json", standings)
            changed.append(f"B.League tabla {len(bl)}")
    except Exception as e:
        print(f"[warn] B.League tabla: {e}")

    try:
        res, fix = bleague_today()
        if res:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") != "B.League"]
            write_json("results.json", ([dict(r, league="B.League") for r in res] + others)[:60])
            changed.append(f"B.League {len(res)} resultados")
        if fix:
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "B.League"]
            write_json("fixtures.json", ([dict(f, league="B.League") for f in fix] + othersf)[:60])
            changed.append(f"B.League {len(fix)} próximos")
    except Exception as e:
        print(f"[warn] B.League partidos: {e}")

    # ---- Euroliga (API oficial): resultados, calendario y tabla completa
    try:
        el_res, el_fix, el_rows = euroleague_all()
        if el_rows:
            standings = read_json("standings.json", {})
            standings["EuroLeague"] = el_rows
            standings["EU"] = el_rows
            write_json("standings.json", standings)
            changed.append(f"Euroliga tabla {len(el_rows)}")
        if el_res or el_fix:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") not in ("EU", "EuroLeague")]
            nuevos = [{"date": _fecha_el(g["date"])[0], "home": g["home"], "away": g["away"],
                       "hs": g["hs"], "as": g["as"], "league": "EuroLeague"} for g in el_res]
            write_json("results.json", nuevos + others)
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") not in ("EU", "EuroLeague")]
            newf = [{"date": _fecha_el(g["date"])[0], "time": "", "home": g["home"], "away": g["away"],
                     "event": f"Jornada {g['round']}", "league": "EuroLeague"} for g in el_fix]
            write_json("fixtures.json", newf + othersf)
            changed.append(f"Euroliga {len(el_res)} res / {len(el_fix)} próx")
    except Exception as e:
        print(f"[warn] Euroliga: {e}")

    # ---- B.League resultados + calendario (web oficial, varios meses)
    try:
        bl_res, bl_fix = bleague_all()
        if bl_res or bl_fix:
            old = read_json("results.json", [])
            others = [r for r in old if r.get("league") != "B.League"]
            nuevos = [{"date": g["date"], "home": g["home"], "away": g["away"],
                       "hs": g["hs"], "as": g["as_"], "league": "B.League"} for g in bl_res]
            write_json("results.json", nuevos + others)
            oldf = read_json("fixtures.json", [])
            othersf = [f for f in oldf if f.get("league") != "B.League"]
            nuevos_f = [dict(f, league="B.League") for f in bl_fix]
            write_json("fixtures.json", nuevos_f + othersf)
            changed.append(f"B.League {len(nuevos)} res / {len(bl_fix)} próx")
    except Exception as e:
        print(f"[warn] B.League meses: {e}")

    # ---- Otras ligas (TheSportsDB): resultados y próximos
    try:
        otras = update_otras_ligas()
        if otras:
            changed.append("ligas: " + ", ".join(otras))
    except Exception as e:
        print(f"[warn] otras ligas: {e}")

    # ---- Noticias (RSS)
    try:
        n = update_noticias()
        if n:
            changed.append(f"noticias {n}")
    except Exception as e:
        print(f"[warn] noticias: {e}")

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"[{stamp}] " + ("Actualizado: " + " · ".join(changed) if changed else "Sin cambios; se conserva lo anterior."))


if __name__ == "__main__":
    main()
