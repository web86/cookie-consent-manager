/** Reviewed adapters and validated local custom script paths. Never inline executable settings. */
(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const t = (...args) => window.web86Runtime?.message(...args) || args[0];
  const categories = { analytics: 'analytics_name', marketing: 'marketing_name', external_content: 'external_content_name' };
  const booleanOptions = { yandex: { webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true }, google_ga4: { send_page_view: true, allow_google_signals: false, allow_ad_personalization_signals: false }, google_ads: { allow_ad_personalization_signals: true, restricted_data_processing: false }, google_maps: { show_title: true }, yandex_maps: { show_title: true } };
  const catalog = Object.freeze({
    yandex: 'analytics', mailru: 'analytics', google_ga4: 'analytics',
    google_gtm: 'marketing', google_ads: 'marketing', vk_ads: 'marketing', meta_pixel: 'marketing', mock_marketing: 'marketing',
    google_maps: 'external_content', yandex_maps: 'external_content', custom_js: 'marketing'
  });
  const hostPatterns = Object.freeze({
    yandex: ['mc.yandex.ru', 'mc.yandex.com'], mailru: ['top-fwz1.mail.ru', 'top.mail.ru'],
    google_ga4: ['www.googletagmanager.com', '*.google-analytics.com'],
    google_ads: ['www.googletagmanager.com', 'www.googleadservices.com', '*.doubleclick.net', 'www.google.com'],
    vk_ads: ['top-fwz1.mail.ru', 'top.mail.ru'], meta_pixel: ['connect.facebook.net', 'www.facebook.com'],
    google_gtm: ['www.googletagmanager.com'], mock_marketing: [], custom_js: [],
    google_maps: ['www.google.com', 'maps.googleapis.com', 'maps.gstatic.com'],
    yandex_maps: ['yandex.ru', 'api-maps.yandex.ru', '*.maps.yandex.net']
  });
  const visibility = Object.fromEntries(Object.keys(categories).map(c => [c, document.getElementById('cookie-block')?.getAttribute('data-cc-category-' + c.replaceAll('_','-')) === '1']));
  const scripts = new Map();
  const started = new Set(), metaIds = new Set(), vkIds = new Set();
  let currentValue, stopping = false, metaGranted = false, tmrLoaded = false, googleDefaults = false;
  const validScriptPath = path => typeof path === 'string' && path.length <= 1024 && /^\/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$/.test(path) && !/[\r\n]/.test(path);
  function validate(data) {
    if (!data || data.schema !== 1 || Object.keys(data).sort().join() !== 'schema,services' || !Array.isArray(data.services) || data.services.length > 32) throw Error('Invalid registry');
    const keys = new Set();
    const result = data.services.map(s => {
      // Accept cached pre-projection HTML as well as the minimal public contract.
      const fields = s && Object.keys(s).filter(k => k !== 'purpose_id').sort().join();
      const custom = s?.loader === 'custom_js' && fields === 'category,config,enabled,key,loader,purpose';
      const legacy = fields === 'category,config,enabled,key,loader,name,purpose';
      if (!s || (!legacy && !custom && fields !== 'category,config,enabled,key,loader') ||
          typeof s.key !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(s.key) || keys.has(s.key) ||
          !Object.hasOwn(catalog, s.loader) || !Object.hasOwn(categories, s.category) || typeof s.enabled !== 'boolean') throw Error('Invalid service');
      keys.add(s.key);
      if (Object.hasOwn(s, 'purpose_id') && (typeof s.purpose_id !== 'string' || !/^[a-z][a-z0-9_.-]{0,63}$/.test(s.purpose_id))) throw Error('Stable purpose');
      if (legacy) for (const [k, max] of [['name', 100], ['purpose', 500]]) {
        if (typeof s[k] !== 'string' || !s[k] || new TextEncoder().encode(s[k]).length > max || /[\x00-\x1f\x7f<>]/.test(s[k])) throw Error('Invalid text');
      }
      if (s.loader === 'custom_js' && (typeof s.purpose !== 'string' || !s.purpose || new TextEncoder().encode(s.purpose).length > 500 || /[\x00-\x1f\x7f<>]/.test(s.purpose))) throw Error('Invalid purpose');
      const allowed = [...(s.loader === 'custom_js' ? ['path'] : []), ...(['yandex', 'mailru', 'google_ga4', 'google_gtm', 'google_ads', 'vk_ads', 'meta_pixel'].includes(s.loader) ? ['id'] : []), ...Object.keys(booleanOptions[s.loader] || {})];
      if (!s.config || typeof s.config !== 'object' || Array.isArray(s.config) || Object.keys(s.config).some(k => !allowed.includes(k))) throw Error('Invalid config');
      const pattern = { google_ga4: /^G-[A-Z0-9]{4,20}$/, google_gtm: /^GTM-[A-Z0-9]{4,20}$/, google_ads: /^AW-[0-9]{4,20}$/ }[s.loader] || /^[0-9]{1,20}$/;
      if ((s.enabled && allowed.includes('id') && !Object.hasOwn(s.config, 'id')) ||
          (Object.hasOwn(s.config, 'id') && (typeof s.config.id !== 'string' || !pattern.test(s.config.id))) ||
          Object.keys(booleanOptions[s.loader] || {}).some(k => Object.hasOwn(s.config, k) && typeof s.config[k] !== 'boolean')) throw Error('Invalid provider options');
      if (s.loader === 'custom_js' && !validScriptPath(s.config.path)) throw Error('Invalid script path');
      const config = Object.fromEntries(Object.entries({ ...(booleanOptions[s.loader] || {}), ...s.config }).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
      // Permission binds to the exact disclosure and reviewed adapter configuration.
      const privacy = Object.fromEntries(Object.entries(config).filter(([k]) => k !== 'show_title'));
      if (s.loader === 'custom_js') privacy.purpose = s.purpose;
      const fingerprint = JSON.stringify([2, s.loader, s.category, s.purpose_id || s.key, privacy]);
      return Object.freeze({ key: s.key, category: s.category, enabled: s.enabled, loader: s.loader, ...(Object.hasOwn(s, 'purpose_id') ? { purpose_id: s.purpose_id } : {}), config: Object.freeze(config), hosts: Object.freeze([...hostPatterns[s.loader]]), fingerprint });
    });
    const paths = new Set(), ids = new Set();
    for (const s of result) {
      if (s.loader === 'custom_js') { if (paths.has(s.config.path)) throw Error('Duplicate script path'); paths.add(s.config.path); }
      if (s.enabled && s.config.id) { const id = s.loader + ':' + s.config.id.replace(/^0+(?=\d)/, ''); if (ids.has(id)) throw Error('Duplicate provider ID'); ids.add(id); }
    }
    const enabled = result.filter(s => s.enabled);
    const analyticsIds = new Set(enabled.filter(s => s.loader === 'mailru').map(s => s.config.id.replace(/^0+(?=\d)/, '')));
    if (enabled.some(s => s.loader === 'vk_ads' && analyticsIds.has(s.config.id.replace(/^0+(?=\d)/, '')))) throw Error('pixel_id_conflict');
    return enabled;
  }
  let services = [];
  try {
    const node = document.getElementById('cc-service-registry');
    services = validate(node ? JSON.parse(node.textContent) : { schema: 1, services: [] });
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
    if (mode !== 'live') return;
    if (googleDefaults) googleConsent(value);
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
    const permitted = loader => services.some(s => s.loader === loader && allowed(s, value));
    const container = permitted('google_gtm') || services.some(s => s.loader === 'google_gtm' && started.has(`google_gtm:${s.config.id}`));
    const analytics = visibility.analytics && value.categories?.analytics === true && (container || permitted('google_ga4'));
    const marketing = visibility.marketing && value.categories?.marketing === true && (container || permitted('google_ads'));
    if (!googleDefaults) {
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      googleDefaults = true;
    }
    window.gtag('consent', 'update', { analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: marketing ? 'granted' : 'denied', ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied' });
  }
  function allowed(s, value) {
    return !stopping && s.enabled === true && visibility[s.category] && value?.categories?.[s.category] === true;
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
        window.gtag('js', new Date());
        window.gtag('config', s.config.id, { ...Object.fromEntries(Object.entries(s.config).filter(([key]) => key !== 'id')), ...(s.loader === 'google_ga4' ? { allow_google_signals: s.config.allow_google_signals && visibility.marketing && value.categories?.marketing === true } : {}), allow_ad_personalization_signals: s.config.allow_ad_personalization_signals && visibility.marketing && value.categories?.marketing === true });
        // One shared library; separate consent/config for each selected service.
        if (!started.has('gtag-library')) { started.add('gtag-library'); await script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.config.id)}`); }
        break;
      case 'google_gtm':
        // Launch follows this instance's category; tag-level consent checks remain mandatory.
        googleConsent(value);
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js', cookie_consent: { analytics: value.categories?.analytics === true, marketing: value.categories?.marketing === true, external_content: value.categories?.external_content === true } });
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
    validate, validScriptPath, allowed, safeMapUrl, revoke, apply(value, mode) {
      currentValue = value;
      if (mode === 'live' && googleDefaults) googleConsent(value);
      for (const s of services) if (allowed(s, value)) start(s, mode, value).catch(e => console.warn(t('error_provider'), e.message));
    }
  });
})();
