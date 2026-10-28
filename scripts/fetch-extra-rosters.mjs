#!/usr/bin/env node
// Fuentes adicionales de plantillas reales para clubes sin roster en la Wikipedia inglesa:
//  - Wikipedia en espanol ({{player2}}): Vaqueros de Bayamon, Titanes, Cimarrones.
//  - Wikipedia en coreano ({{선수3}}): Seoul SK Knights, Ulsan Mobis Phoebus, Wonju DB Promy.
//  - LNB Dominicana (lnb.do, JSON __NEXT_DATA__): Metros de Santiago.
// No inventa datos: si una fuente no responde o no trae plantilla, el club queda fuera.
import { writeFile } from 'node:fs/promises';

const UA = 'nba-legacy-roster-fetch/1.0 (local; data import)';
const OUT = 'src/data/extraRosters2026.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { await sleep(8000 * (i + 1)); continue; }
    if (!res.ok) return null;
    return res.text();
  }
  return null;
}

function blocks(text, template) {
  const out = [];
  const re = new RegExp(`\\{\\{\\s*(?:${template})\\b`, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    let depth = 0;
    let end = -1;
    for (let i = m.index; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    if (end > m.index) { out.push(text.slice(m.index, end)); re.lastIndex = end; }
    else re.lastIndex = m.index + 1;
  }
  return out;
}

// Parametros con claves arbitrarias (incluye caracteres coreanos). Los valores con pipe
// (enlaces [[x|y]]) se cortan en el primer pipe: suficiente para nombre, altura y fecha.
function params(block) {
  const out = {};
  for (const m of block.matchAll(/\|\s*([^=|{}\n]+?)\s*=\s*([^|}\n]*)/g)) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const titleCase = (name) => {
  if (!name || name !== name.toLowerCase()) return name;
  return name.replace(/(^|[\s'\-])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());
};

const cleanLink = (v) => String(v ?? '')
  .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
  .replace(/\[\[([^\]]*)\]\]/g, '$1')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/'''?/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const NAT_ES = {
  'argentina': 'ARG', 'puerto rico': 'PUR', 'colombia': 'COL', 'república dominicana': 'DOM',
  'republica dominicana': 'DOM', 'venezuela': 'VEN', 'méxico': 'MEX', 'mexico': 'MEX',
  'estados unidos': 'USA', 'usa': 'USA', 'españa': 'ESP', 'espana': 'ESP', 'brasil': 'BRA',
  'uruguay': 'URU', 'panamá': 'PAN', 'panama': 'PAN', 'canadá': 'CAN', 'canada': 'CAN',
  'francia': 'FRA', 'italia': 'ITA', 'japón': 'JPN', 'japon': 'JPN', 'nigeria': 'NGA',
  'senegal': 'SEN', 'camerún': 'CMR', 'camerun': 'CMR', 'australia': 'AUS', 'alemania': 'GER',
  'grecia': 'GRE', 'turquía': 'TUR', 'turquia': 'TUR', 'serbia': 'SRB', 'croacia': 'CRO',
  'eslovenia': 'SLO', 'bosnia y herzegovina': 'BIH', 'israel': 'ISR', 'polonia': 'POL',
  'república checa': 'CZE', 'finlandia': 'FIN', 'suecia': 'SWE', 'noruega': 'NOR',
  'reino unido': 'GBR', 'gran bretaña': 'GBR', 'irlanda': 'IRL', 'jamaica': 'JAM',
  'bahamas': 'BAH', 'cuba': 'CUB', 'chile': 'CHI', 'perú': 'PER', 'peru': 'PER',
  'ecuador': 'ECU', 'paraguay': 'PAR', 'bolivia': 'BOL', 'costa rica': 'CRI',
  'el salvador': 'ESA', 'guatemala': 'GUA', 'honduras': 'HON', 'nicaragua': 'NCA',
  'guinea': 'GUI', 'mali': 'MLI', 'costa de marfil': 'CIV', 'egipto': 'EGY',
  'sudán del sur': 'SSD', 'sudan del sur': 'SSD', 'angola': 'ANG', 'túnez': 'TUN',
  'tunez': 'TUN', 'marruecos': 'MAR', 'líbano': 'LIB', 'libano': 'LIB', 'filipinas': 'PHI',
  'corea del sur': 'KOR', 'china': 'CHN', 'taiwán': 'TWN', 'taiwan': 'TWN',
  'nueva zelanda': 'NZL', 'letonia': 'LVA', 'lituania': 'LTU', 'estonia': 'EST',
  'ucrania': 'UKR', 'rusia': 'RUS', 'georgia': 'GEO', 'bélgica': 'BEL', 'belgica': 'BEL',
  'países bajos': 'NED', 'paises bajos': 'NED', 'austria': 'AUT', 'suiza': 'SUI',
  'portugal': 'POR', 'rumanía': 'ROU', 'rumania': 'ROU', 'hungría': 'HUN', 'hungria': 'HUN',
  'bulgaria': 'BUL', 'macedonia del norte': 'MKD', 'montenegro': 'MNE', 'albania': 'ALB',
  'italy': 'ITA', 'dominican republic': 'DOM', 'united states': 'USA', 'puerto rico (usa)': 'PUR',
  'south korea': 'KOR', 'czech republic': 'CZE', 'north macedonia': 'MKD', 'bosnia and herzegovina': 'BIH',
  'ivory coast': 'CIV', 'south sudan': 'SSD', 'trinidad and tobago': 'TTO', 'new zealand': 'NZL',
  'great britain': 'GBR', 'united kingdom': 'GBR', 'the bahamas': 'BAH', 'cape verde': 'CPV',
};
const NAT_KO = {
  '대한민국': 'KOR', '미국': 'USA', '필리핀': 'PHI', '캐나다': 'CAN', '호주': 'AUS',
  '나이지리아': 'NGA', '세르비아': 'SRB', '크로아티아': 'CRO', '슬로베니아': 'SLO',
  '라트비아': 'LVA', '리투아니아': 'LTU', '프랑스': 'FRA', '스페인': 'ESP', '독일': 'GER',
  '그리스': 'GRE', '터키': 'TUR', '러시아': 'RUS', '우크라이나': 'UKR', '일본': 'JPN',
  '중국': 'CHN', '대만': 'TWN', '몽골': 'MGL', '카타르': 'QAT', '이집트': 'EGY',
  '남수단': 'SSD', '도미니카 공화국': 'DOM', '푸에르토리코': 'PUR', '아르헨티나': 'ARG',
  '브라질': 'BRA', '멕시코': 'MEX', '콜롬비아': 'COL', '베네수엘라': 'VEN', '우루과이': 'URU',
  '파나마': 'PAN', '바하마': 'BAH', '자메이카': 'JAM', '영국': 'GBR', '이탈리아': 'ITA',
  '이스라엘': 'ISR', '폴란드': 'POL', '체코': 'CZE', '헝가리': 'HUN', '뉴질랜드': 'NZL',
  '남아프리카 공화국': 'RSA', '핀란드': 'FIN', '스웨덴': 'SWE', '벨기에': 'BEL',
  '네덜란드': 'NED', '오스트리아': 'AUT', '스위스': 'SUI', '포르투갈': 'POR',
};

const normNat = (raw, table) => {
  const v = String(raw ?? '').trim();
  if (/^[A-Za-z]{3}$/.test(v)) return v.toUpperCase();
  return table[v.toLowerCase()] ?? table[v] ?? null;
};

const mapPos = (raw, heightCm) => {
  const p = String(raw ?? '').toUpperCase().replace(/\s+/g, '');
  if (['PG', 'SG', 'SF', 'PF', 'C'].includes(p)) return p;
  if (p === 'G' || p === 'GUARD') return heightCm && heightCm < 193 ? 'PG' : 'SG';
  if (p === 'F' || p === 'FORWARD') return heightCm && heightCm >= 203 ? 'PF' : 'SF';
  if (p === 'C' || p === 'CENTER') return 'C';
  if (p === 'GF' || p === 'G/F') return 'SF';
  if (p === 'FC' || p === 'F/C') return 'PF';
  if (p === 'ALA-PÍVOT' || p === 'ALA-PIVOT') return 'PF';
  if (p === 'ESCOLTA') return 'SG';
  if (p === 'BASE') return 'PG';
  if (p === 'ALERO') return 'SF';
  if (p === 'PÍVOT' || p === 'PIVOT') return 'C';
  if (heightCm) return heightCm >= 208 ? 'C' : heightCm >= 203 ? 'PF' : heightCm >= 198 ? 'SF' : heightCm >= 190 ? 'SG' : 'PG';
  return null;
};

const ageFrom = (y, m, d, now = new Date('2026-10-26T00:00:00Z')) => {
  const year = Number.parseInt(y, 10);
  if (Number.isNaN(year) || year < 1940) return null;
  const month = Number.parseInt(m, 10);
  const day = Number.parseInt(d, 10);
  let age = now.getUTCFullYear() - year;
  if (!Number.isNaN(month)) {
    const birth = new Date(Date.UTC(year, month - 1, Number.isNaN(day) ? 1 : day));
    if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  }
  return age > 14 && age < 50 ? age : null;
};

const heightFromFt = (ft, inch) => {
  const f = Number.parseInt(ft, 10);
  if (Number.isNaN(f) || f < 5 || f > 8) return null;
  const i = Number.parseInt(inch, 10);
  return Math.round((f * 12 + (Number.isNaN(i) ? 0 : i)) * 2.54);
};

const heightFromM = (raw) => {
  const v = Number.parseFloat(String(raw ?? '').replace(',', '.'));
  return !Number.isNaN(v) && v > 1.4 && v < 2.4 ? Math.round(v * 100) : null;
};

// ---------- Wikipedia ES ({{player2}}) ----------
async function fromEsWiki(title) {
  const url = `https://es.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  const text = await httpText(url);
  if (!text) return null;
  const coachField = /\|\s*entrenador\s*=\s*([^\n]*)/i.exec(text);
  const coach = coachField ? cleanLink(coachField[1]) : null;
  const players = [];
  const seen = new Set();
  for (const block of blocks(text, 'player2')) {
    const p = params(block);
    const name = titleCase(`${cleanLink(p.first)} ${cleanLink(p.last)}`.replace(/\s+/g, ' ').trim());
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const heightCm = heightFromFt(p.ft, p.in);
    players.push({
      name,
      pos: mapPos(p.pos, heightCm),
      nat: normNat(p.nat, NAT_ES),
      age: ageFrom(p.year, p.month, p.date),
      heightCm,
      number: Number.isFinite(Number.parseInt(p.num, 10)) ? Number.parseInt(p.num, 10) : null,
    });
  }
  return { source: 'wikipedia-es', sourceUrl: url, coach, players };
}

// ---------- Wikipedia KO ({{선수3}}) ----------
async function fromKoWiki(title) {
  const pageUrl = `https://ko.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  const text = await httpText(pageUrl);
  if (!text) return null;
  let rosterText = text;
  const tpl = /\{\{\s*([^{}|]*?로스터)\s*\}\}/.exec(text);
  let sourceUrl = pageUrl;
  if (tpl) {
    await sleep(1200);
    const tplUrl = `https://ko.wikipedia.org/w/index.php?title=${encodeURIComponent(`틀:${tpl[1]}`)}&action=raw`;
    const sub = await httpText(tplUrl);
    if (sub) { rosterText = sub; sourceUrl = tplUrl; }
  }
  const players = [];
  const seen = new Set();
  for (const block of blocks(rosterText, '선수3')) {
    const p = params(block);
    const name = cleanLink(p['이름']);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const heightCm = heightFromM(p.m);
    players.push({
      name,
      pos: mapPos(p['포지션'], heightCm),
      nat: normNat(p['국적'], NAT_KO),
      age: ageFrom(p['출생년'], p['출생월'], p['출생일']),
      heightCm,
      number: Number.isFinite(Number.parseInt(p['등번호'], 10)) ? Number.parseInt(p['등번호'], 10) : null,
    });
  }
  const footer = /\|\s*감독\s*=\s*([^\n]*)/.exec(rosterText);
  const coach = footer ? cleanLink(footer[1].replace(/\{\{\s*선수\s*\|[^}]*\}\}/, '')) : null;
  return { source: 'wikipedia-ko', sourceUrl, coach, players };
}

// ---------- LNB Dominicana (lnb.do) ----------
async function fromLnbDo(slug, id) {
  const url = `https://www.lnb.do/equipo/${slug}/${id}`;
  const html = await httpText(url);
  if (!html) return null;
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  let data;
  try { data = JSON.parse(m[1]); } catch { return null; }
  const roster = data?.props?.pageProps?.roster;
  if (!Array.isArray(roster)) return null;
  const players = [];
  const seen = new Set();
  for (const r of roster) {
    const name = `${r.name ?? ''} ${r.last_name ?? ''}`.replace(/\s*\((?:R|S|I|C)\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const heightCm = Number.isFinite(r.height) && r.height > 140 ? Math.round(r.height) : null;
    players.push({
      name,
      pos: mapPos(r.position?.alias ?? r.position?.name, heightCm),
      nat: r.nationality ? normNat(r.nationality, NAT_ES) : null,
      age: r.birth_date && !String(r.birth_date).startsWith('1899') ? ageFrom(...String(r.birth_date).split('-')) : null,
      heightCm,
      number: Number.isFinite(r.shirt_number) ? r.shirt_number : null,
    });
  }
  return { source: 'lnb-do', sourceUrl: url, coach: null, players };
}


const htmlToLines = (html) => {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n');
  return t.split('\n').map((x) => x.trim()).filter(Boolean);
};

// ---------- BC Vienna (web oficial, 2026/27) ----------
async function fromBcVienna() {
  const url = 'https://bcvienna.com/spieler/';
  const html = await httpText(url);
  if (!html) return null;
  const lines = htmlToLines(html);
  const POS = new Set(['GUARD', 'CENTER', 'FORWARD']);
  const players = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!POS.has(lines[i])) continue;
    const posRaw = lines[i];
    let j = i + 1;
    const nameParts = [];
    while (j < lines.length && !/^\d+$/.test(lines[j]) && nameParts.length < 4) {
      nameParts.push(lines[j]);
      j++;
    }
    if (!/^\d+$/.test(lines[j] ?? '')) continue;
    const number = Number.parseInt(lines[j], 10);
    j++;
    if (lines[j] !== 'NATIONALITÄT') continue;
    const nat = lines[j + 1];
    if (lines[j + 2] !== 'GRÖSSE') continue;
    const heightCm = heightFromM((lines[j + 3] ?? '').replace(/\s*M$/i, '').replace(',', '.'));
    if (lines[j + 4] !== 'GEBURTSDATUM') continue;
    const dateRaw = lines[j + 5] ?? '';
    const dm = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(dateRaw);
    const name = nameParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    players.push({
      name,
      pos: mapPos(posRaw, heightCm),
      nat: /^[A-Z]{3}$/.test(nat) ? nat : null,
      age: dm ? ageFrom(dm[3], dm[1], dm[2]) : null,
      heightCm,
      number,
    });
    i = j + 5;
    if (players.length >= 12) break;
  }
  await sleep(1200);
  let coach = null;
  const staffHtml = await httpText('https://bcvienna.com/trainerstab/');
  if (staffHtml) {
    const staff = htmlToLines(staffHtml);
    const idx = staff.indexOf('HEADCOACH');
    if (idx !== -1) {
      const parts = [];
      let k = idx + 1;
      while (k < staff.length && parts.length < 2 && /^[A-ZÀ-Ž' .-]+$/.test(staff[k]) && staff[k].length > 1) {
        parts.push(staff[k]);
        k++;
      }
      if (parts.length === 2) coach = parts.join(' ');
    }
  }
  return { source: 'bcvienna-oficial', sourceUrl: url, coach, players };
}

// ---------- LNB Dominicana: Leones ----------
async function fromLnbLeones() {
  return fromLnbDo('Leones', 3);
}


// ---------- Latinbasket (Halcones, Sao Paulo) ----------
async function fromLatinbasket(url) {
  const html = await httpText(url);
  if (!html) return null;
  const lines = htmlToLines(html);
  const start = lines.findIndex((l) => l === 'Former Team');
  if (start === -1) return null;
  const players = [];
  const seen = new Set();
  let i = start + 1;
  const isPos = (v) => /^(PG|SG|G|F|C|PF|SF|FC|GF|G\/F|F\/C)$/i.test(v);
  while (i < lines.length && players.length < 20) {
    const maybeNum = /^\d{1,2}$/.test(lines[i]) ? Number.parseInt(lines[i], 10) : null;
    let j = maybeNum !== null ? i + 1 : i;
    const name = lines[j];
    if (!name || !/[A-Za-zÀ-ÿ]/.test(name) || name.length < 3 || name.length > 45) { i++; continue; }
    const heightCm = Number.parseInt(lines[j + 1] ?? '', 10);
    const pos = lines[j + 3] ?? '';
    const age = Number.parseInt(lines[j + 4] ?? '', 10);
    if (!Number.isFinite(heightCm) || heightCm < 150 || heightCm > 230 || !isPos(pos)) { i++; continue; }
    if (seen.has(name)) { i++; continue; }
    seen.add(name);
    players.push({
      name,
      pos: mapPos(pos, heightCm),
      nat: null,
      age: Number.isFinite(age) && age > 14 && age < 50 ? age : null,
      heightCm,
      number: maybeNum,
    });
    i = j + 6;
  }
  return { source: 'latinbasket', sourceUrl: url, coach: null, players };
}

// ---------- Basketnews (Prometey) ----------
async function fromBasketnews(url) {
  const html = await httpText(url);
  if (!html) return null;
  const lines = htmlToLines(html);
  const start = lines.findIndex((l, k) => l === 'Player' && lines[k + 1] === 'Position' && lines[k + 2] === 'Height');
  if (start === -1) return null;
  const players = [];
  const seen = new Set();
  let i = start + 5;
  while (i < lines.length && players.length < 20) {
    const num = /^\d{1,2}$/.test(lines[i]) ? Number.parseInt(lines[i], 10) : null;
    let j = num !== null ? i + 1 : i;
    const name = lines[j];
    if (!name || !/[A-Za-zÀ-ÿ]/.test(name) || name.length < 3) { i++; continue; }
    const pos = (lines[j + 1] ?? '').replace(/,$/, '');
    const heightCm = Number.parseInt((lines[j + 2] ?? '').replace(/[^\d]/g, ''), 10);
    const age = Number.parseInt(lines[j + 4] ?? '', 10);
    if (!Number.isFinite(heightCm) || heightCm < 150 || heightCm > 230) { i++; continue; }
    if (seen.has(name)) { i++; continue; }
    seen.add(name);
    players.push({
      name,
      pos: mapPos(pos, heightCm),
      nat: null,
      age: Number.isFinite(age) && age > 14 && age < 50 ? age : null,
      heightCm,
      number: num,
    });
    i = j + 5;
  }
  return { source: 'basketnews', sourceUrl: url, coach: null, players };
}

const TARGETS = [
  { club: 'Vaqueros de Bayamón', fn: () => fromEsWiki('Vaqueros de Bayamón'), coach: 'Christian Dalmau', coachNat: 'PUR' },
  { club: 'Titanes de Barranquilla', fn: () => fromEsWiki('Titanes de Barranquilla'), coach: 'Tomás Díaz', coachNat: 'COL' },
  { club: 'Cimarrones del Chocó', fn: () => fromEsWiki('Cimarrones del Chocó'), coach: 'Edgar Moreno', coachNat: 'COL' },
  { club: 'Seoul SK Knights', fn: () => fromKoWiki('서울 SK 나이츠'), coach: 'Chun Hee-chul', coachNat: 'KOR' },
  { club: 'Ulsan Hyundai Mobis Phoebus', fn: () => fromKoWiki('울산 현대모비스 피버스'), coach: 'Yang Dong-geun', coachNat: 'KOR' },
  { club: 'Wonju DB Promy', fn: () => fromKoWiki('원주 DB 프로미'), coach: 'Lee Sang-beom', coachNat: 'KOR' },
  { club: 'Metros de Santiago', fn: () => fromLnbDo('Metros', 2), coach: 'David Diaz', coachNat: 'DOM' },
  { club: 'BC Vienna', fn: () => fromBcVienna(), coach: 'Dragan Bajić', coachNat: 'BIH' },
  { club: 'Leones de Santo Domingo', fn: () => fromLnbLeones(), coach: 'Eulis Báez', coachNat: 'DOM' },
  { club: 'Halcones de Xalapa', fn: () => fromLatinbasket('https://basketball.latinbasket.com/team/Halcones-UV-Xalapa/5224/Roster'), coach: 'Paco Olmos', coachNat: 'ESP' },
  { club: 'São Paulo', fn: () => fromLatinbasket('https://basketball.latinbasket.com/team/Sao-Paulo-FC/50954/Roster'), coach: 'Guerrinha', coachNat: 'BRA' },
  { club: 'Prometey', fn: () => fromBasketnews('https://basketnews.com/teams/3231-prometey-slobozhanske/roster.html'), coach: 'Ronen Ginzburg', coachNat: 'CZE' },
];

const out = { version: 1, asOf: '2026-10-26', note: 'Plantillas reales de fuentes adicionales (Wikipedia ES/KO y LNB Dominicana).', clubs: {} };
for (const t of TARGETS) {
  const r = await t.fn();
  if (!r || r.players.length === 0) {
    console.log(`${t.club}: SIN DATOS`);
    continue;
  }
  out.clubs[t.club] = {
    source: r.source,
    sourceUrl: r.sourceUrl,
    coach: r.coach || t.coach,
    coachNat: t.coachNat,
    players: r.players,
  };
  console.log(`${t.club}: ${r.players.length} jugadores | coach ${r.coach || t.coach} | ${r.source}`);
  await sleep(1200);
}
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`guardado ${OUT} con ${Object.keys(out.clubs).length} clubes`);
