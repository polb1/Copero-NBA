import { LANGS, lang, setLang } from '../i18n/i18n';

/** ES · EN · CA. The choice is stored in a cookie and the game reopens in that language. */
export function LangSwitch() {
  const cur = lang();
  return (
    <div className="lang-switch" role="group" aria-label="Idioma" data-notranslate>
      {LANGS.map((l) => (
        <button key={l.id} type="button" aria-pressed={cur === l.id} onClick={() => setLang(l.id)} lang={l.id}>{l.label}</button>
      ))}
    </div>
  );
}
