# -*- coding: utf-8 -*-
"""B.League B1: junta las dos conferencias (Este/Oeste) de la tabla oficial."""
import json
import re
import urllib.request

from fix_bleague_teams import to_en  # reutiliza el diccionario JP→EN

html = urllib.request.urlopen(
    urllib.request.Request("https://www.bleague.jp/standings/", headers={"User-Agent": "CoperoNBA/1.0"}),
    timeout=25,
).read().decode("utf-8", "replace")

teams = []
for table in re.findall(r"<table[^>]*>(.*?)</table>", html, re.S):
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table, re.S)[1:]:
        cells = [re.sub(r"<[^>]+>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
        if len(cells) > 2 and cells[0].isdigit():
            name = to_en(cells[1])
            if name not in teams:
                teams.append(name)

path = "/Users/dariomititelu/codigo/copero-NBA/public/data/leagues.json"
with open(path, encoding="utf-8") as f:
    data = json.load(f)
data["B.League"] = teams
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1, ensure_ascii=False)
print(f"B.League: {len(teams)} equipos")
print(f"Total: {len(data)} ligas, {sum(len(v) for v in data.values())} clubes")
