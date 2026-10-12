/** Data-only lexicons. MODX supplies context cultureKey; banner has no language setting. */
(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  let config = {};
  try { config = JSON.parse(document.getElementById('cc-public-config')?.textContent || '{}'); } catch (_) { /* fail closed at registry */ }
  let dictionary = config.strings || {};
  const locale = config.locale || document.documentElement.lang || 'en';
  const ready = config.strings ? Promise.resolve() : fetch(new URL('lexicons.json', base), { mode: 'same-origin' })
    .then(r => { if (!r.ok) throw Error('Lexicon unavailable'); return r.json(); })
    .then(data => { dictionary = { ...data.en, ...(data[locale] || {}) }; }).catch(() => {});
  const t = (key, values = {}, fallback = key) => {
    let text = dictionary[key] ?? fallback;
    for (const [name, value] of Object.entries(values)) text = text.split('{' + name + '}').join(String(value));
    return text;
  };
  window.web86I18n = Object.freeze({ ready, t, config, locale });
})();
