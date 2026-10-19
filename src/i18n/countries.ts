// Country names in the page's language, from the browser's own data (Intl.DisplayNames): no list to keep.
import { COUNTRIES, ISO2 } from '../content/names';
import type { Dict } from './types';

export function countryNames(lang: 'en' | 'ca'): Dict {
  const out: Dict = {};
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    return out;
  }
  for (const c of COUNTRIES) {
    const iso = ISO2[c.code];
    if (!iso) continue;
    try {
      const name = names.of(iso.toUpperCase());
      if (name && name !== c.name) out[c.name] = name;
    } catch {
      /* unknown region code */
    }
  }
  return out;
}
