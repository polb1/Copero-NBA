// Languages: Spanish is the source text; English and Catalan are dictionaries keyed by the Spanish string.
// The translator works on what is on screen (text nodes and a few attributes), so every component, the
// engine's messages and the event texts are covered without threading a t() call through the code.
import type { Dict } from './types';

export type Lang = 'es' | 'en' | 'ca';
export const LANGS: { id: Lang; label: string; path: string }[] = [
  { id: 'es', label: 'ES', path: '/' },
  { id: 'en', label: 'EN', path: '/en/' },
  { id: 'ca', label: 'CA', path: '/ca/' },
];

/** The page's language comes from its URL (/en/, /ca/ or the Spanish root). */
export function pageLang(): Lang {
  const seg = location.pathname.split('/')[1];
  return seg === 'en' || seg === 'ca' ? seg : 'es';
}

let current: Lang = typeof location !== 'undefined' ? pageLang() : 'es';
export const lang = () => current;

/** Remembers the choice in a cookie (the root page redirects to it) and opens that language's page. */
export function setLang(l: Lang) {
  document.cookie = `lang=${l}; max-age=31536000; path=/; samesite=lax`;
  if (l === current) return;
  const target = LANGS.find((x) => x.id === l)!.path;
  location.href = target + location.hash;
}

// ---------- Dictionary lookup ----------
interface Pattern { re: RegExp; out: string; vars: string[] }
let exact = new Map<string, string>();
let patterns: Pattern[] = [];
const cache = new Map<string, string>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Keys with {name} placeholders become patterns ("{n} puntos" matches "541 puntos"). */
function compile(dict: Dict) {
  exact = new Map();
  patterns = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{[a-zA-Z0-9_]+\}/.test(k)) {
      exact.set(k, v);
      continue;
    }
    const vars: string[] = [];
    const src = k.split(/(\{[a-zA-Z0-9_]+\})/).map((part) => {
      const m = part.match(/^\{([a-zA-Z0-9_]+)\}$/);
      if (!m) return escapeRe(part);
      vars.push(m[1]);
      // {n}, {n1}, {n2}… are numeric; {name}, {a}, {b}… accept any text.
      return /^n\d*$/.test(m[1]) ? '([\\d.,\\-–/+%$KMk ]+?)' : '(.+?)';
    }).join('');
    patterns.push({ re: new RegExp(`^${src}$`), out: v, vars });
  }
  // Longer keys first: the most specific pattern wins.
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
}

/** Translates one visible string (keeps the surrounding spaces). */
export function tr(text: string): string {
  if (current === 'es') return text;
  const core = text.trim();
  if (!core || !/[a-záéíóúñ¿¡]/i.test(core)) return text;
  const hit = cache.get(core);
  if (hit !== undefined) return text.replace(core, hit);
  const out = translateCore(core);
  cache.set(core, out);
  return text.replace(core, out);
}

function translateCore(core: string): string {
  const direct = exact.get(core);
  if (direct !== undefined) return direct;
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    let out = p.out;
    p.vars.forEach((name, i) => { out = out.split(`{${name}}`).join(translateCore(m[i + 1])); });
    return out;
  }
  // Composed strings ("Boston Celtics 26-56 · Sin playoffs"): translate each part.
  if (core.includes(' · ')) return core.split(' · ').map(translateCore).join(' · ');
  // Decorations around the words (emoji, "·", ":", "…", trailing dot): translate what is inside.
  const m = core.match(/^([^\p{L}\p{N}¿¡$]*)(.*?)([\s.:!?…·,;)]*)$/u);
  if (m && (m[1] || m[3]) && m[2] && m[2] !== core) {
    const inner = translateCore(m[2]);
    if (inner !== m[2]) return m[1] + inner + m[3];
  }
  return core;
}

/** Translates strings built in code (alerts, confirms, document title). */
export const t = (text: string) => tr(text);

// ---------- Live translation of the page ----------
const ATTRS = ['placeholder', 'title', 'aria-label'];
/** What we last wrote into each text node: our own writes must not be translated again. */
const written = new WeakMap<Node, string>();

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = node.nodeValue ?? '';
    if (written.get(node) === v) return;
    const out = tr(v);
    if (out !== v) {
      written.set(node, out);
      node.nodeValue = out;
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.closest('[data-notranslate]')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && el.getAttribute(`data-tr-${a}`) !== v) {
      const out = tr(v);
      if (out !== v) {
        el.setAttribute(`data-tr-${a}`, out);
        el.setAttribute(a, out);
      }
    }
  }
  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'button') {
    const b = el as HTMLInputElement;
    b.value = tr(b.value);
  }
  for (const child of Array.from(el.childNodes)) translateNode(child);
}

/** Loads the dictionary for the page's language and keeps #root translated as React updates it. */
export async function startTranslation(root: HTMLElement) {
  document.cookie = `lang=${current}; max-age=31536000; path=/; samesite=lax`;
  if (current === 'es') return;
  const dict = current === 'en' ? (await import('./en')).EN : (await import('./ca')).CA;
  compile({ ...(await import('./countries')).countryNames(current), ...dict });
  translateNode(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') translateNode(r.target);
      else if (r.type === 'attributes') translateNode(r.target);
      else r.addedNodes.forEach(translateNode);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
