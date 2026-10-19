/** Validated service registry and backwards-compatible public facade. */
(() => {
  'use strict';
  const t = (...args) => window.web86Runtime?.message(...args) || args[0];
  const categories = { analytics: 'analytics_name', marketing: 'marketing_name', external_content: 'external_content_name' };
  const booleanOptions = { yandex: { webvisor: true, clickmap: true, trackLinks: true, accurateTrackBounce: true }, google_ga4: { send_page_view: true, allow_google_signals: false, allow_ad_personalization_signals: false }, google_ads: { allow_ad_personalization_signals: true, restricted_data_processing: false }, google_maps: { show_title: true }, yandex_maps: { show_title: true } };
  const catalog = Object.freeze({
    yandex: 'analytics', mailru: 'analytics', google_ga4: 'analytics',
    google_gtm: 'marketing', google_ads: 'marketing', vk_ads: 'marketing', meta_pixel: 'marketing',
    google_maps: 'external_content', yandex_maps: 'external_content', custom_js: 'marketing', youtube: 'external_content', rutube: 'external_content', vk_video: 'external_content'
  });
  const hostPatterns = Object.freeze({
    youtube: ['www.youtube-nocookie.com', 'www.youtube.com'], rutube: ['rutube.ru'], vk_video: ['vk.com', 'vkvideo.ru'],
    yandex: ['mc.yandex.ru', 'mc.yandex.com'], mailru: ['top-fwz1.mail.ru', 'top.mail.ru'],
    google_ga4: ['www.googletagmanager.com', '*.google-analytics.com'],
    google_ads: ['www.googletagmanager.com', 'www.googleadservices.com', '*.doubleclick.net', 'www.google.com'],
    vk_ads: ['top-fwz1.mail.ru', 'top.mail.ru'], meta_pixel: ['connect.facebook.net', 'www.facebook.com'],
    google_gtm: ['www.googletagmanager.com'], custom_js: [],
    google_maps: ['www.google.com', 'maps.googleapis.com', 'maps.gstatic.com'],
    yandex_maps: ['yandex.ru', 'api-maps.yandex.ru', '*.maps.yandex.net']
  });
  const validScriptPath = window.web86ScriptUrl.valid;
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
      // Legacy v2 identity is used only for one-time storage migration, never to launch a service.
      const privacy = Object.fromEntries(Object.entries(config).filter(([k]) => k !== 'show_title'));
      if (s.loader === 'custom_js') privacy.purpose = s.purpose;
      const fingerprint = JSON.stringify([2, s.loader, s.category, s.purpose_id || s.key, privacy]);
      return Object.freeze({ key: s.key, category: s.category, enabled: s.enabled, loader: s.loader, ...(Object.hasOwn(s, 'purpose_id') ? { purpose_id: s.purpose_id } : {}), config: Object.freeze(config), hosts: Object.freeze([...hostPatterns[s.loader]]), fingerprint });
    });
    const paths = new Set();
    for (const s of result) {
      if (s.loader === 'custom_js') { const identity = window.web86ScriptUrl.identity(s.config.path); if (paths.has(identity)) throw Error('Duplicate script path'); paths.add(identity); }
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
  window.web86Providers = Object.freeze({ services: Object.freeze(services), categories: Object.freeze(categories),
    validate, validScriptPath,
    // Delegation is lazy: all module definitions exist before centralized startup.
    allowed: (service, value) => web86ServiceLoaders.allowed(service, value),
    safeMapUrl: (service, raw, mode) => web86Embeds.safeMapUrl(service, raw, mode),
    revoke: (mode, value) => web86ServiceLoaders.revoke(mode, value),
    apply: (value, mode, permission = null, legacy = false) => web86ServiceLoaders.apply(value, mode, permission, legacy)
  });
})();
