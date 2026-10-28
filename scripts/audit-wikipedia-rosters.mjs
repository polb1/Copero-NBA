#!/usr/bin/env node
/**
 * scripts/audit-wikipedia-rosters.mjs
 *
 * Extrae plantillas reales de Wikipedia para una lista de clubes de baloncesto
 * y las imprime en JSON. Sin dependencias externas (Node 20+, ESM).
 *
 * Uso:  node scripts/audit-wikipedia-rosters.mjs
 */

'use strict';

// ── Config ──────────────────────────────────────────────────────────────────

const CLUBS = [
    'Joventut Badalona',
    'Unicaja Málaga',
    'Gran Canaria',
    "Galatasaray S.K. (men's basketball)",
    'AS Monaco Basket',
    'ALBA Berlin',
    'Benfica',
    'Flamengo',
    'Boca Juniors',
    'Real Madrid Baloncesto',
];

const USER_AGENT = 'nba-legacy-roster-audit/1.0 (local)';
const THROTTLE_MS = 1500;
const throttle = () => new Promise((r) => setTimeout(r, THROTTLE_MS));
const MAX_REDIRECT_HOPS = 2;

// ── HTTP ────────────────────────────────────────────────────────────────────

/**
 * Fetch raw wikitext of a Wikipedia page.
 * @param {string} title  Page title (will be encodeURIComponent-d).
 * @returns {Promise<string>} Raw wikitext.
 */
async function fetchWiki(title) {
    const url =
        'https://en.wikipedia.org/w/index.php?title=' +
        encodeURIComponent(title) +
        '&action=raw';
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' for "' + title + '"');
    }
    return await res.text();
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Clean a wikitext name: trim, and convert [[Page|Display]] or [[Page]]
 * into the display text (or page name).
 */
function cleanName(name) {
    if (!name) return '';
    name = name.trim();
    // [[Page|Display]] → Display
    let m = name.match(/\[\[([^\]|]*)\|([^\]]*)\]\]/);
    if (m) return m[2].trim();
    // [[Page]] → Page
    m = name.match(/\[\[([^\]]*)\]\]/);
    if (m) return m[1].trim();
    return name;
}

/**
 * Extract the page name from a {{...section:Page|roster}} or
 * {{transcluded section|Page}} directive.
 * @returns {string|null}
 */
function findTranscludedPage(wikitext) {
    // {{#section:Pagina|roster}}
    let m = wikitext.match(/\{\{\s*#\s*section:\s*([^|{}]+)\s*\|\s*roster\s*\}\}/i);
    if (m) return m[1].trim();
    // {{transcluded section|Pagina}}
    m = wikitext.match(/\{\{\s*transcluded\s+section\s*\|\s*([^}]+)\s*\}\}/i);
    if (m) return m[1].trim();
    return null;
}

// ── Player parsing ─────────────────────────────────────────────────────────

/**
 * Find all {{player3 ...}} or {{Player3 ...}} blocks using brace counting
 * so that nested templates inside parameters are handled correctly.
 * @returns {string[]}
 */
function extractPlayerBlocks(wikitext) {
    const blocks = [];
    const regex = /\{\{(?:player3|Player3)\b/g;
    let match;
    while ((match = regex.exec(wikitext)) !== null) {
        const start = match.index;
        let depth = 0;
        let end = -1;
        for (let i = start; i < wikitext.length; i++) {
            if (wikitext[i] === '{') depth++;
            else if (wikitext[i] === '}') depth--;
            if (depth === 0) {
                end = i + 1;
                break;
            }
        }
        if (end > start) {
            blocks.push(wikitext.slice(start, end));
            regex.lastIndex = end;
        } else {
            // No closing brace found – skip this match.
            regex.lastIndex = start + 1;
        }
    }
    return blocks;
}

/**
 * Parse a single {{player3 ...}} block into a player object.
 * Returns null if `first` or `last` is missing.
 */
function parsePlayerBlock(block) {
    const params = {};
    const paramRegex =
        /\|?\s*(pos|num|nat|first|last|m|year|month|date)\s*=\s*([^|}]+)/g;
    let m;
    while ((m = paramRegex.exec(block)) !== null) {
        params[m[1]] = m[2].trim();
    }

    if (!params.first || !params.last) return null;

    const name = cleanName(params.first) + ' ' + cleanName(params.last);
    const heightM = params.m
        ? parseFloat(params.m.replace(',', '.').trim())
        : undefined;
    const birthYear = params.year ? params.year.trim() : undefined;

    return {
        name: name.replace(/\s+/g, ' ').trim(),
        pos: params.pos || undefined,
        num: params.num || undefined,
        nat: params.nat || undefined,
        heightM: Number.isNaN(heightM) ? undefined : heightM,
        birthYear,
    };
}

/** Parse all {{player3}} blocks in a wikitext. */
function parsePlayers(wikitext) {
    return extractPlayerBlocks(wikitext).map(parsePlayerBlock).filter(Boolean);
}

// ── Coach parsing ──────────────────────────────────────────────────────────

/**
 * Extract the coach name from a wikitext.
 *
 * Strategy (per spec):
 *  1. Find `head_coach`, take text until `asst_coach` or 400 chars.
 *  2. Within that text, look for the first name after
 *     `{{bkaicon|XXX}}` or `{{player||XXX|...}}` and clean it.
 *  3. If no `head_coach`, find a line containing `Head coach` and
 *     extract the first name after it.
 */
function parseCoach(wikitext) {
    // ── Step 1: locate head_coach … asst_coach (or 400 chars)
    let coachText = '';
    const headCoachIdx = wikitext.indexOf('head_coach');
    if (headCoachIdx !== -1) {
        const asstCoachIdx = wikitext.indexOf('asst_coach', headCoachIdx);
        if (asstCoachIdx !== -1 && asstCoachIdx - headCoachIdx <= 400) {
            coachText = wikitext.slice(headCoachIdx, asstCoachIdx);
        } else {
            coachText = wikitext.slice(headCoachIdx, headCoachIdx + 400);
        }
    }

    let name = null;

    // ── Step 2: extract name after {{bkaicon|XXX}} or {{flagicon|XXX}}
    //          (both are nationality flag icons, same purpose)
    //          or from {{player||XXX|[[Name]]}} (name inside template).
    if (coachText) {
        // {{bkaicon|XXX}} [[Name]]  or  {{flagicon|XXX}} [[Name]]
        let m = coachText.match(
            /\{\{(?:bkaicon|flagicon)\|[^}]*\}\}\s*\[?\[?([^\]|}]+)/i
        );
        if (m) name = m[1].trim();

        // {{player||XXX|[[Name]]}}  — name is the third parameter inside the template
        if (!name) {
            m = coachText.match(/\{\{player\|\|[^}|]+\|([^}]+)/i);
            if (m) name = cleanName(m[1].trim());
        }

        // {{player||XXX}} followed by [[Name]]  (name after the template)
        if (!name) {
            m = coachText.match(
                /\{\{player\|\|[^}]*\}\}\s*\[?\[?([^\]|}]+)/i
            );
            if (m) name = m[1].trim();
        }
    }

    // ── Step 3: no head_coach — find a line containing "Head coach"
    if (!name) {
        const lines = wikitext.split('\n');
        for (const line of lines) {
            if (!line.toLowerCase().includes('head coach')) continue;

            // {{bkaicon|XXX}} or {{flagicon|XXX}} followed by [[Name]]
            let m = line.match(
                /\{\{(?:bkaicon|flagicon)\|[^}]*\}\}\s*\[?\[?([^\]|}]+)/i
            );
            if (m) {
                name = m[1].trim();
                break;
            }
            // {{player||XXX|[[Name]]}} — name inside template
            m = line.match(/\{\{player\|\|[^}|]+\|([^}]+)/i);
            if (m) {
                name = cleanName(m[1].trim());
                break;
            }
            // [[Name]] pattern after "head coach"
            m = line.match(/head coach.*?\[\[([^\]|]+)(\|[^\]]+)?\]\]/i);
            if (m) {
                name = m[2] || m[1];
                break;
            }
        }
    }

    // ── Clean the extracted name and reject template artifacts
    if (name) {
        name = name
            .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2') // [[Page|Disp]] → Disp
            .replace(/\[\[([^\]]*)\]\]/g, '$1') // [[Page]] → Page
            .replace(/[|{}\[\]]/g, '') // remove stray template chars
            .replace(/\s+/g, ' ') // normalise whitespace
            .trim();

        // Reject values that look like template artifacts (e.g. "flagicon", "player")
        if (
            name &&
            !/^(flagicon|bkaicon|player|transcluded)/i.test(name) &&
            name.length > 1
        ) {
            return name;
        }
    }

    return null;
}

// ── Per-club audit ─────────────────────────────────────────────────────────

/**
 * Audit a single club: fetch its Wikipedia page (follow ≤ 2 redirects),
 * handle transcluded sections, then parse players and coach.
 */
async function auditClub(club) {
    try {
        // Fetch the initial page
        let currentTitle = club;
        let wikitext = await fetchWiki(currentTitle);
        await throttle();

        // Follow #REDIRECT (max 2 hops)
        for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
            const redirectMatch = wikitext.match(
                /^\s*#redirect\s*\[\[([^\]]+)\]\]/i
            );
            if (redirectMatch) {
                currentTitle = redirectMatch[1].trim();
                wikitext = await fetchWiki(currentTitle);
                await throttle();
            } else {
                break;
            }
        }

        // Handle transcluded sections ({{#section:…|roster}} or {{transcluded section|…}})
        let rosterWikitext = wikitext;
        const transcludedPage = findTranscludedPage(wikitext);
        if (transcludedPage) {
            rosterWikitext = await fetchWiki(transcludedPage);
            await throttle();
        }

        // Parse
        const players = parsePlayers(rosterWikitext);
        const coach = parseCoach(rosterWikitext);

        return {
            club,
            page: currentTitle,
            coach,
            players,
        };
    } catch (error) {
        return {
            club,
            error: error.message,
        };
    }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const results = [];
    for (const club of CLUBS) {
        const result = await auditClub(club);
        results.push(result);
    }
    console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
