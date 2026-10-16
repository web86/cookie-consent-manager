/** SDK adapters, queues and deduplication; permissions are supplied by the consent owner. */
const web86ServiceLoaders = (() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const t = (...args) => window.web86Runtime?.message(...args) || args[0];
  const services = window.web86Providers.services;
  const categories = window.web86Providers.categories;
  const visibility = Object.fromEntries(Object.keys(categories).map(c => [c, document.getElementById('cookie-block')?.getAttribute('data-cc-category-' + c.replaceAll('_','-')) === '1']));
  const scripts = new Map();
  const googleCommands = new Set();
  const started = new Set(), metaIds = new Set(), vkIds = new Set();
  let currentValue, runtimePermission = null, legacyNoChoice = false, stopping = false, metaGranted = false, tmrLoaded = false, googleDefaults = false;
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
  function metaQueue() {
    if (!window.fbq) {
      const queue = function (...args) { if (queue.callMethod) queue.callMethod.apply(queue, args); else queue.queue.push(args); };
      queue.push = queue; queue.loaded = true; queue.version = '2.0'; queue.queue = [];
      window.fbq = queue; if (!window._fbq) window._fbq = queue;
    }
    if (typeof window.fbq !== 'function') throw Error('Invalid fbq');
    // Only our explicit PageView; no automatic form/history events or matching data.
    window.fbq.disablePushState = true;
    return window.fbq;
  }
  function revoke(mode, value) {
    stopping = true;
    const legacyStartup = legacyNoChoice;
    legacyNoChoice = false;
    if (mode !== 'live') return;
    // Discard only this CMP's pending bootstrap/config work. Preserve the site's
    // own commands, especially independently configured Consent Mode defaults.
    if (legacyStartup && Array.isArray(window.dataLayer)) for (let i = window.dataLayer.length - 1; i >= 0; i--) {
      if (googleCommands.has(window.dataLayer[i])) window.dataLayer.splice(i, 1);
    }
    googleCommands.clear();
    if (googleDefaults || started.has('gtag-library') || services.some(s => s.loader === 'google_gtm' && started.has(`google_gtm:${s.config.id}`))) googleConsent(value);
    if (metaIds.size && typeof window.fbq === 'function') {
      if (!window.fbq.callMethod && Array.isArray(window.fbq.queue)) window.fbq.queue = window.fbq.queue.filter(call => !(metaIds.has(call[0] === 'set' ? call[3] : call[1]) || (call[0] === 'consent' && call[1] === 'grant')));
      window.fbq('consent', 'revoke'); metaGranted = false;
    }
    // SDK not yet available: remove pending VK events before its queue can drain.
    if (!tmrLoaded && Array.isArray(window._tmr)) for (let i = window._tmr.length - 1; i >= 0; i--) if (window._tmr[i]?.type === 'pageView' && vkIds.has(window._tmr[i].id)) window._tmr.splice(i, 1);
  }
  function googleConsent(value) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // First-visit legacy installation behaves like a direct tag: leave any site's
    // own Consent Mode untouched, without inventing denied or granted signals.
    if (legacyNoChoice) return;
    const permitted = loader => services.some(s => s.loader === loader && allowed(s, value));
    const container = permitted('google_gtm') || services.some(s => s.loader === 'google_gtm' && started.has(`google_gtm:${s.config.id}`));
    // Script eligibility may be legacy; Google signals always use the visitor's choice.
    const analytics = visibility.analytics && value?.categories?.analytics === true && (container || permitted('google_ga4'));
    const marketing = visibility.marketing && value?.categories?.marketing === true && (container || permitted('google_ads'));
    if (!googleDefaults) {
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      googleDefaults = true;
    }
    window.gtag('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: marketing ? 'granted' : 'denied', ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied' });
  }
  function allowed(s, value) {
    return !stopping && s.enabled === true && visibility[s.category] &&
      (runtimePermission ? runtimePermission(s.category) : value?.categories?.[s.category] === true);
  }
  function googleCommand(...args) {
    const length = window.dataLayer.length;
    window.gtag(...args);
    for (const entry of window.dataLayer.slice(length)) {
      if (entry[0] === args[0] && entry[1] === args[1]) googleCommands.add(entry);
    }
  }
  async function start(s, mode, value) {
    if (stopping || ['google_maps', 'yandex_maps'].includes(s.loader)) return;
    const token = s.loader === 'custom_js' ? s.key : `${s.loader}:${s.config.id || ''}`;
    if (started.has(token)) return;
    started.add(token);
    if (s.loader === 'custom_js') {
      if (allowed(s, currentValue)) await script(s.config.path);
      return;
    }
    if (mode === 'mock') {
      await script(new URL(`mock/${s.loader === 'mock_marketing' ? 'marketing' : s.loader}.js`, base));
      return;
    }
    switch (s.loader) {
      case 'yandex':
        window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        window.ym(Number(s.config.id), 'init', { webvisor: s.config.webvisor, clickmap: s.config.clickmap, trackLinks: s.config.trackLinks, accurateTrackBounce: s.config.accurateTrackBounce });
        await script('https://mc.yandex.ru/metrika/tag.js'); break;
      case 'mailru': case 'vk_ads':
        if (s.loader === 'vk_ads') vkIds.add(s.config.id);
        window._tmr = window._tmr || []; window._tmr.push({ id: s.config.id, type: 'pageView', start: Date.now() });
        await script('https://top-fwz1.mail.ru/js/code.js'); tmrLoaded = true; break;
      case 'meta_pixel': {
        const fbq = metaQueue(); metaIds.add(s.config.id);
        if (!metaGranted) { fbq('consent', 'grant'); metaGranted = true; }
        fbq('set', 'autoConfig', false, s.config.id);
        fbq('init', s.config.id);
        await script('https://connect.facebook.net/en_US/fbevents.js');
        if (!stopping && allowed(s, currentValue)) fbq('trackSingle', s.config.id, 'PageView');
        break;
      }
      case 'google_ga4': case 'google_ads':
        googleConsent(value);
        googleCommand('js', new Date());
        googleCommand('config', s.config.id, { ...Object.fromEntries(Object.entries(s.config).filter(([key]) => key !== 'id')), ...(!legacyNoChoice ? { ...(s.loader === 'google_ga4' ? { allow_google_signals: s.config.allow_google_signals && visibility.marketing && value?.categories?.marketing === true } : {}), allow_ad_personalization_signals: s.config.allow_ad_personalization_signals && visibility.marketing && value?.categories?.marketing === true } : {}) });
        // One shared library; separate consent/config for each selected service.
        if (!started.has('gtag-library')) { started.add('gtag-library'); await script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.config.id)}`); }
        break;
      case 'google_gtm':
        // Launch follows this instance's category; tag-level consent checks remain mandatory.
        googleConsent(value);
        const event = { 'gtm.start': Date.now(), event: 'gtm.js', ...(!legacyNoChoice ? { cookie_consent: { analytics: value?.categories?.analytics === true, marketing: value?.categories?.marketing === true, external_content: value?.categories?.external_content === true } } : {}) };
        window.dataLayer.push(event); googleCommands.add(event);
        await script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(s.config.id)}`); break;
    }
  }
  return Object.freeze({
    allowed, revoke, apply(value, mode, permission = null, legacy = false) {
      currentValue = value;
      runtimePermission = typeof permission === 'function' ? permission : null;
      legacyNoChoice = legacy === true && value === null && runtimePermission !== null;
      if (mode === 'live' && (googleDefaults || started.has('gtag-library') || services.some(s => s.loader === 'google_gtm' && started.has(`google_gtm:${s.config.id}`)))) googleConsent(value);
      for (const s of services) if (allowed(s, value)) start(s, mode, value).catch(e => console.warn(t('error_provider'), e.message));
    }
  });
})();
