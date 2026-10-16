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
  function script(url) {
    const href = new URL(String(url), location.href).href;
    if (!scripts.has(href)) scripts.set(href, new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = href; el.async = true;
      el.onload = resolve; el.onerror = () => reject(Error(t('error_provider')));
      document.head.appendChild(el);
    }));
    return scripts.get(href);
  }
  function allowed(s, value) {
    return !state.stopping && s.enabled === true && visibility[s.category] &&
      (state.runtimePermission ? state.runtimePermission(s.category) : value?.categories?.[s.category] === true);
  }
  function mock(s) {
    return script(new URL(`mock/${s.loader === 'mock_marketing' ? 'marketing' : s.loader}.js`, base));
  }
  return Object.assign(state, { t, services, visibility, started, script, allowed, mock });
};
