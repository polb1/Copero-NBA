# -*- coding: utf-8 -*-
"""Completa la lista de equipos de la B.League desde su tabla oficial (24 clubes B1)."""
import json
import re
import urllib.request

UA = "CoperoNBA/1.0"
EN = {
    "アルバルク東京": "Alvark Tokyo",
    "千葉ジェッツ": "Chiba Jets",
    "宇都宮ブレックス": "Utsunomiya Brex",
    "琉球ゴールデンキングス": "Ryukyu Golden Kings",
    "仙台89ERS": "Sendai 89ers",
    "レバンガ北海道": "Levanga Hokkaido",
    "サンロッカーズ": "Sunrockers Shibuya",
    "群馬クレインサンダーズ": "Gunma Crane Thunders",
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
    "秋田ノーザンハピネッツ": "Akita Northern Happinets",
}


def to_en(name: str) -> str:
    for jp, en in EN.items():
        if jp in name:
            return en
    return name


def main() -> None:
    req = urllib.request.Request("https://www.bleague.jp/standings/", headers={"User-Agent": UA})
    html = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "replace")
    table = re.search(r"<table[^>]*>(.*?)</table>", html, re.S).group(1)
    names = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table, re.S)[1:]:
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        if len(cells) > 2 and cells[0].isdigit():
            names.append(cells[1])
    teams = [to_en(n) for n in names]
    path = "/Users/dariomititelu/codigo/copero-NBA/public/data/leagues.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    data["B.League"] = teams
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    print(f"B.League: {len(teams)} equipos")
    print(f"Total: {len(data)} ligas, {sum(len(v) for v in data.values())} clubes")


if __name__ == "__main__":
    main()
