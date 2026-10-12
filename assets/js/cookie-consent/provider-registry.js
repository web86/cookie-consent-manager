/** Reviewed loaders only. Settings contain data, never script URLs or executable code. */
(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const t = (...args) => window.web86I18n?.t(...args) || args[0];
  const categories = { analytics: 'analytics_name', marketing: 'marketing_name', external_content: 'external_content_name' };
  const booleanOptions = { yandex: { webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, clientId: true }, google_ga4: { send_page_view: true, allow_google_signals: false, allow_ad_personalization_signals: false }, google_ads: { allow_ad_personalization_signals: true, restricted_data_processing: false }, google_maps: { show_title: true }, yandex_maps: { show_title: true } };
  const catalog = Object.freeze({
    yandex: 'analytics', mailru: 'analytics', google_ga4: 'analytics',
    google_gtm: 'marketing', google_ads: 'marketing', mock_marketing: 'marketing',
    google_maps: 'external_content', yandex_maps: 'external_content'
  });
  const hostPatterns = Object.freeze({
    yandex: ['mc.yandex.ru', 'mc.yandex.com'], mailru: ['top-fwz1.mail.ru', 'top.mail.ru'],
    google_ga4: ['www.googletagmanager.com', '*.google-analytics.com'],
    google_ads: ['www.googletagmanager.com', 'www.googleadservices.com', '*.doubleclick.net', 'www.google.com'],
    google_gtm: ['www.googletagmanager.com'], mock_marketing: [],
    google_maps: ['www.google.com', 'maps.googleapis.com', 'maps.gstatic.com'],
    yandex_maps: ['yandex.ru', 'api-maps.yandex.ru', '*.maps.yandex.net']
  });
  const scripts = new Map();
  const started = new Set();
  const defaults = { schema: 1, services: [
    ['yandex', 'Yandex Metrica', 'Visitor statistics', { id: '23643118', clientId: true }],
    ['mailru', 'Top.Mail.Ru', 'Visitor statistics', { id: '3265404' }],
    ['mock_marketing', 'Mock marketing', 'Local advertising simulation', {}],
    ['google_maps', 'Google Maps', 'External interactive maps', {}],
    ['yandex_maps', 'Yandex Maps', 'External interactive maps', {}]
  ].map(([loader, name, purpose, config]) => ({ key: loader, loader, name, purpose, config, category: catalog[loader], enabled: true })) };
  function validate(data) {
    if (!data || data.schema !== 1 || Object.keys(data).sort().join() !== 'schema,services' || !Array.isArray(data.services) || data.services.length > 32) throw Error('Invalid registry');
    const keys = new Set();
    return data.services.map(s => {
      if (!s || Object.keys(s).filter(k => k !== 'purpose_id').sort().join() !== 'category,config,enabled,key,loader,name,purpose' ||
          typeof s.key !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(s.key) || keys.has(s.key) ||
          !Object.hasOwn(catalog, s.loader) || s.category !== catalog[s.loader] || typeof s.enabled !== 'boolean') throw Error('Invalid service');
      keys.add(s.key);
      if (Object.hasOwn(s, 'purpose_id') && (typeof s.purpose_id !== 'string' || !/^[a-z][a-z0-9_.-]{0,63}$/.test(s.purpose_id))) throw Error('Stable purpose');
      for (const [k, max] of [['name', 100], ['purpose', 500]]) {
        if (typeof s[k] !== 'string' || !s[k] || new TextEncoder().encode(s[k]).length > max || /[\x00-\x1f\x7f<>]/.test(s[k])) throw Error('Invalid text');
      }
      const allowed = [...(['yandex', 'mailru', 'google_ga4', 'google_gtm', 'google_ads'].includes(s.loader) ? ['id'] : []), ...Object.keys(booleanOptions[s.loader] || {})];
      if (!s.config || typeof s.config !== 'object' || Array.isArray(s.config) || Object.keys(s.config).some(k => !allowed.includes(k))) throw Error('Invalid config');
      const pattern = { google_ga4: /^G-[A-Z0-9]{4,20}$/, google_gtm: /^GTM-[A-Z0-9]{4,20}$/, google_ads: /^AW-[0-9]{4,20}$/ }[s.loader] || /^[0-9]{1,20}$/;
      if ((s.enabled && allowed.includes('id') && !Object.hasOwn(s.config, 'id')) ||
          (Object.hasOwn(s.config, 'id') && (typeof s.config.id !== 'string' || !pattern.test(s.config.id))) ||
          Object.keys(booleanOptions[s.loader] || {}).some(k => Object.hasOwn(s.config, k) && typeof s.config[k] !== 'boolean')) throw Error('Invalid ID/ClientID');
      const config = Object.fromEntries(Object.entries({ ...(booleanOptions[s.loader] || {}), ...s.config }).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
      // Permission binds to the exact disclosure and reviewed adapter configuration.
      const privacy = Object.fromEntries(Object.entries(config).filter(([k]) => k !== 'show_title'));
      const fingerprint = JSON.stringify([2, s.loader, s.category, s.purpose_id || s.key, privacy]);
      return Object.freeze({ ...s, config: Object.freeze(config), hosts: Object.freeze([...hostPatterns[s.loader]]), fingerprint });
    }).filter(s => s.enabled);
  }
  let services = [];
  try {
    const node = document.getElementById('cc-service-registry');
    // Only standalone MOCK demo may use defaults. Live missing config fails closed.
    const mock = document.getElementById('cookie-block')?.dataset.ccMode === 'mock';
    services = validate(node ? JSON.parse(node.textContent) : mock ? defaults : { schema: 1, services: [] });
  } catch (e) { console.warn(t('error_registry'), e.message); }
  function script(url) {
    const href = String(url);
    if (!scripts.has(href)) scripts.set(href, new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = href; el.async = true;
      el.onload = resolve; el.onerror = () => reject(Error(t('error_provider')));
      document.head.appendChild(el);
    }));
    return scripts.get(href);
  }
  function googleConsent(value) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const allowed = loader => services.some(s => s.loader === loader && value.providers?.[s.key] === s.fingerprint);
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('consent', 'update', { analytics_storage: allowed('google_ga4') ? 'granted' : 'denied',
      ad_storage: allowed('google_ads') ? 'granted' : 'denied', ad_user_data: allowed('google_ads') ? 'granted' : 'denied',
      ad_personalization: allowed('google_ads') ? 'granted' : 'denied' });
  }
  async function start(s, mode, value) {
    if (s.category === 'external_content') return;
    // Arbitrary GTM containers cannot be sandboxed by Consent Mode. Refuse partial
    // consent even in mock; live deployment additionally requires container review.
    if (s.loader === 'google_gtm' && (!Object.keys(categories).every(c => value[c] === true) ||
        services.some(p => value.providers?.[p.key] !== p.fingerprint))) return;
    const token = `${s.loader}:${s.config.id || ''}`;
    if (started.has(token)) return;
    started.add(token);
    if (mode === 'mock') {
      await script(new URL(`mock/${s.loader === 'mock_marketing' ? 'marketing' : s.loader}.js`, base));
      if (s.loader === 'yandex' && s.config.clientId) await script(new URL('mock/bitrix24-clientid.js', base));
      return;
    }
    switch (s.loader) {
      case 'yandex':
        window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym.l = Date.now();
        window.ym(Number(s.config.id), 'init', { webvisor: s.config.webvisor, clickmap: s.config.clickmap, trackLinks: s.config.trackLinks, accurateTrackBounce: s.config.accurateTrackBounce });
        if (s.config.clientId) window.ym(Number(s.config.id), 'getClientID', id => {
          const el = document.getElementById('clientid'); if (el && id) el.setAttribute('data-clientid', String(id));
        });
        await script('https://mc.yandex.ru/metrika/tag.js'); break;
      case 'mailru':
        window._tmr = window._tmr || []; window._tmr.push({ id: s.config.id, type: 'pageView', start: Date.now() });
        await script('https://top-fwz1.mail.ru/js/code.js'); break;
      case 'google_ga4': case 'google_ads':
        googleConsent(value);
        window.gtag('js', new Date());
        window.gtag('config', s.config.id, { ...Object.fromEntries(Object.entries(s.config).filter(([key]) => key !== 'id')), ...(s.loader === 'google_ga4' ? { allow_google_signals: s.config.allow_google_signals && value.marketing === true, allow_ad_personalization_signals: s.config.allow_ad_personalization_signals && value.marketing === true } : {}) });
        // One shared library; separate consent/config for each selected service.
        if (!started.has('gtag-library')) { started.add('gtag-library'); await script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.config.id)}`); }
        break;
      case 'google_gtm':
        // All disclosed services must be authorized before this unrestricted container.
        googleConsent(value);
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js', cookie_consent: { analytics: true, marketing: true, external_content: true } });
        await script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(s.config.id)}`); break;
    }
  }
  function mapUrl(s, raw) {
    const url = new URL(raw, location.href);
    if (url.username || url.password || url.hash || url.port || /[\x00-\x20\\]/.test(raw)) throw Error('Unsafe map URL');
    if (url.protocol !== 'https:') throw Error('HTTPS map required');
    const google = s.loader === 'google_maps' && url.hostname === 'www.google.com' && /^\/maps\/embed(?:\/v1\/(?:place|view|directions|search|streetview))?$/.test(url.pathname);
    const yandex = s.loader === 'yandex_maps' && url.hostname === 'yandex.ru' && ['/map-widget/v1/', '/map-widget/v1'].includes(url.pathname);
    if (!google && !yandex) throw Error('Map host/path rejected');
    const allowed = google ? ['pb', 'key', 'q', 'center', 'zoom', 'maptype', 'language', 'region', 'origin', 'destination', 'waypoints', 'mode', 'avoid', 'units', 'location', 'heading', 'pitch', 'fov'] : ['um', 'source', 'll', 'z', 'l', 'pt', 'mode', 'oid', 'ol'];
    if (raw.length > 4096 || [...url.searchParams.keys()].some(k => !allowed.includes(k))) throw Error('Map parameters rejected');
    return url.href;
  }
  function safeMapUrl(s, raw, mode) {
    if (mode !== 'mock') return mapUrl(s, raw);
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin || u.username || u.password || u.search || u.hash || u.pathname !== `/assets/js/cookie-consent/mock/${s.loader}.html`) throw Error('Mock map must be first-party fixture');
    return u.href;
  }
  window.web86Providers = Object.freeze({ services: Object.freeze(services), categories: Object.freeze(categories),
    validate, safeMapUrl, apply(value, mode) {
      for (const s of services) if (value[s.category] === true && value.providers?.[s.key] === s.fingerprint) start(s, mode, value).catch(e => console.warn(t('error_provider'), e.message));
    }
  });
})();
