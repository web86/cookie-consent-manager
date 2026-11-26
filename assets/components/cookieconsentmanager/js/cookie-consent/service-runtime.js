/** Shared SDK URL loading, deduplication and the consent owner's live permission. */
const web86CreateServiceRuntime = () => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const t = (...args) => window.web86Runtime?.message(...args) || args[0];
  const services = window.web86Providers.services;
  const categories = window.web86Providers.categories;
  const visibility = Object.fromEntries(Object.keys(categories).map(c => [c, document.getElementById('cookie-block')?.getAttribute('data-cc-category-' + c.replaceAll('_','-')) === '1']));
  const scripts = new Map(), started = new Set();
  const state = { currentValue: undefined, runtimePermission: null, legacyNoChoice: false, stopping: false };
  function script(url, rawAttributes) {
    // Validate the complete attribute set before creating or appending any element.
    const attributes = rawAttributes === undefined ? {} : window.web86CustomJs.attributes(rawAttributes);
    const identity = JSON.stringify(attributes);
    const href = new URL(String(url), location.href).href;
    const existing = scripts.get(href);
    if (existing && existing.identity !== identity) return Promise.reject(Error('Script attribute conflict'));
    if (!existing) {
      const promise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = href; el.async = true;
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      el.onload = resolve; el.onerror = () => reject(Error(t('error_provider')));
      document.head.appendChild(el);
      });
      scripts.set(href, { identity, promise });
    }
    return scripts.get(href).promise;
  }
  function allowed(s, value) {
    return !state.stopping && s.enabled === true && visibility[s.category] &&
      (state.runtimePermission ? state.runtimePermission(s.category) : value?.categories?.[s.category] === true);
  }
  function mock(s) {
    return script(new URL(`mock/${s.loader}.js`, base));
  }
  return Object.assign(state, { t, services, visibility, started, script, allowed, mock });
};
