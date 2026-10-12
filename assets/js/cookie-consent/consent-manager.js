/** Cookie Consent Manager / provider integration. No third-party service loads before a choice. */
(() => {
  'use strict';

  const STORAGE_KEY = 'web86_cookie_consent';
  const root = document.getElementById('cookie-block');
  // Script can be safely loaded on pages without the banner.
  if (!root) return;

  const i18n = window.web86I18n;
  const t = (...args) => i18n?.t(...args) || args[0];
  const publicConfig = i18n?.config || {};
  if (publicConfig.settings) { root.dataset.ccPolicyVersion = publicConfig.settings.policy_version; root.dataset.ccTtlDays = String(publicConfig.settings.ttl_days); }
  if (publicConfig.buttons) for (const [key, value] of Object.entries(publicConfig.buttons)) root.setAttribute('data-cc-show-' + key.replace('_', '-'), value ? '1' : '0');
  const version = root.dataset.ccPolicyVersion || '1';
  const configuredTtl = Number(root.dataset.ccTtlDays);
  const ttlDays = Number.isFinite(configuredTtl) ? Math.min(3650, Math.max(1, configuredTtl || 90)) : 90;
  const mode = root.dataset.ccMode === 'mock' ? 'mock' : 'live';
  let auditUrl = '';
  try {
    const raw = root.dataset.ccAuditUrl || '';
    const url = new URL(raw, location.href);
    if (raw && url.origin === location.origin && !url.username && !url.password && !url.hash) auditUrl = url.href;
  } catch (_) { /* Invalid endpoint fails closed. */ }
  const auditEnabled = Boolean(auditUrl);
  const registry = window.web86Providers;
  const services = registry?.services || [];
  const maps = [];
  const main = root.querySelector('[data-cc-panel="main"]');
  const settings = root.querySelector('[data-cc-panel="settings"]');
  const analyticsInput = root.querySelector('[data-cc-category="analytics"]');
  const marketingInput = root.querySelector('[data-cc-category="marketing"]');
  const settingsHeading = root.querySelector('#cookie-settings-title');
  let externalInput = root.querySelector('[data-cc-category="external_content"]');
  if (!externalInput) {
    const label = document.createElement('label'); label.className = 'cookie-option';
    label.textContent = '';
    const text = document.createElement('span'); text.className = 'cookie-option__text'; text.innerHTML = '<strong></strong><small></small>'; label.append(text);
    externalInput = document.createElement('input'); externalInput.type = 'checkbox';
    externalInput.dataset.ccCategory = 'external_content'; label.append(externalInput);
    settings.insertBefore(label, settings.querySelector('.cookie-warning-settings__buttons'));
  }
  const inputs = { analytics: analyticsInput, marketing: marketingInput, external_content: externalInput };
  let draftPermissions = Object.create(null);
  let returnFocus = null;
  // Remove legacy provider controls. Public preferences expose categories only.
  for (const input of settings.querySelectorAll('[data-cc-provider]')) (input.closest('label') || input).remove();
  let consent = null;
  let needsChoice = false;
  let hideTimer = null;
  let consentId = null;
  let auditQueue = Promise.resolve();

  function newUuid() {
    if (!window.crypto || !window.crypto.getRandomValues) return null;
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }

  const isUuid = value => typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);

  function deliverAudit(details) {
    if (!auditEnabled || typeof fetch !== 'function') return Promise.resolve(false);
    return fetch(auditUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-store',
      keepalive: true
    }).then(async response => {
      if (response.status !== 200) throw new Error('HTTP ' + response.status);
      const body = await response.json();
      if (body.ok !== true || body.event_id !== details.event_id || typeof body.server_time !== 'string') throw new Error(t('error_ack'));
      window.dispatchEvent(new CustomEvent('web86:consent-audit-delivery', {
        detail: { event_id: details.event_id, ok: true }
      }));
      return true;
    }).catch(error => {
      console.warn(t('error_audit'), error.message);
      window.dispatchEvent(new CustomEvent('web86:consent-audit-delivery', {
        detail: { event_id: details.event_id, ok: false }
      }));
      return false;
    });
  }


  function getStorage() {
    try { return window.localStorage; }
    catch (error) { console.warn(t('error_storage'), error); return null; }
  }

  function readConsent() {
    try {
      const storage = getStorage();
      const data = storage && JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      if (!data || data.version !== version || data.necessary !== true ||
          typeof data.analytics !== 'boolean' || typeof data.marketing !== 'boolean' ||
          typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) ||
          data.savedAt > Date.now() || Date.now() - data.savedAt > ttlDays * 86400000) {
        return null;
      }
      // M2 preference retains its ID, but cannot authorize newly disclosed providers.
      needsChoice = data.model !== 'categories_v1' || services.some(service => data.disclosed?.[service.key] !== service.fingerprint);
      const providers = Object.create(null);
      for (const service of services) if (data.providers?.[service.key] === service.fingerprint && data[service.category] === true) providers[service.key] = service.fingerprint;
      return { ...data, external_content: data.external_content === true, providers };
    } catch (error) {
      console.warn(t('error_preference'), error);
      return null;
    }
  }

  function saveConsent(data) {
    try {
      const storage = getStorage();
      if (!storage) return false;
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(t('error_storage'), error);
      return false;
    }
  }

  function emitAudit(event, extra = {}) {
    const details = {
      schema: 2,
      event_id: newUuid(),
      consent_id: consentId,
      event,
      stage: extra.stage || 'draft',
      analytics: typeof extra.analytics === 'boolean' ? extra.analytics : analyticsInput.checked,
      marketing: typeof extra.marketing === 'boolean' ? extra.marketing : marketingInput.checked,
      external_content: typeof extra.external_content === 'boolean' ? extra.external_content : externalInput.checked,
      providers: extra.providers || Object.fromEntries(services.map(s => [s.key, draftPermissions[s.key] === true])),
      provider: extra.provider || null,
      policy_version: version,
      timestamp: new Date().toISOString(),
      page: location.pathname // Never include query params with possible personal data.
    };
    window.dispatchEvent(new CustomEvent('web86:consent-audit', { detail: details }));
    if (mode === 'mock') console.info('[MOCK consent audit]', details);
    if (!details.event_id || !details.consent_id) {
      console.warn(t('error_random'));
      return Promise.resolve(false);
    }
    // Preserve order of draft checkbox clicks and the final Save/Accept action.
    // A failed delivery never blocks subsequent events.
    auditQueue = auditQueue.then(() => deliverAudit(details), () => deliverAudit(details));
    return auditQueue;
  }

  function applyConsent(value) {
    registry?.apply(value, mode);
    for (const map of maps) {
      const allowed = value.external_content && value.providers?.[map.service.key] === map.service.fingerprint;
      if (allowed && !map.frame) {
        const frame = document.createElement('iframe'); frame.title = map.title;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
        frame.setAttribute('allowfullscreen', ''); frame.src = map.url;
        map.node.insertBefore(frame, map.revoke); map.frame = frame;
      } else if (!allowed && map.frame) { map.frame.remove(); map.frame = null; }
      map.placeholder.hidden = Boolean(allowed); map.revoke.hidden = !allowed;
    }
  }

  function showBanner() {
    clearTimeout(hideTimer);
    main.hidden = false;
    settings.hidden = true;
    root.classList.remove('closed');
    requestAnimationFrame(() => root.classList.remove('done'));
  }

  function hideBanner() {
    root.classList.add('done');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => root.classList.add('closed'), 450);
  }

  function openSettings() {
    clearTimeout(hideTimer);
    returnFocus = document.activeElement;
    for (const [category, input] of Object.entries(inputs)) input.checked = consent?.[category] === true;
    draftPermissions = Object.fromEntries(services.map(s => [s.key, consent?.providers?.[s.key] === s.fingerprint]));
    for (const [category,input] of Object.entries(inputs)) {
      const members=services.filter(s=>s.category===category);
      input.indeterminate=members.some(s=>draftPermissions[s.key])&&!members.every(s=>draftPermissions[s.key]);
    }
    main.hidden = true;
    settings.hidden = false;
    root.classList.remove('closed', 'done');
    settingsHeading.focus({ preventScroll: true });
  }

  function commit(action, analytics, marketing, external = false, permissions = {}, provider = null) {
    const previous = consent;
    const value = { model:'categories_v1', disclosed: provider ? {...(previous?.disclosed || {}), [provider]:services.find(s=>s.key===provider).fingerprint} : Object.fromEntries(services.map(s=>[s.key,s.fingerprint])), version, necessary: true, analytics: Boolean(analytics), marketing: Boolean(marketing),
      external_content: Boolean(external), providers: Object.create(null), savedAt: Date.now(), consentId };
    for (const s of services) if (value[s.category] && permissions[s.key]) value.providers[s.key] = s.fingerprint;
    const persisted = saveConsent(value);
    consent = value;
    const providers = Object.fromEntries(services.map(s => [s.key, value.providers[s.key] === s.fingerprint]));
    const auditDelivery = emitAudit(action, { stage: 'committed', analytics: value.analytics, marketing: value.marketing,
      external_content: value.external_content, providers, provider });
    hideBanner();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    const revoked = previous && (Object.keys(inputs).some(k => previous[k] && !value[k]) ||
      services.some(s => previous.providers?.[s.key] === s.fingerprint && !value.providers[s.key]));
    // Remove frames synchronously on revocation before waiting for an audit response.
    if (revoked) {
      for (const map of maps) if (!value.providers[map.service.key] && map.frame) { map.frame.remove(); map.frame = null; }
      if (!persisted) console.warn(t('error_storage'));
      Promise.race([auditDelivery, new Promise(resolve => setTimeout(resolve, 900))]).finally(() => location.reload());
      return;
    }
    applyConsent(value);
    needsChoice=services.some(s=>value.disclosed[s.key]!==s.fingerprint);if(needsChoice)showBanner();
  }

  function mapChoice(service, allowed) {
    const permissions = Object.fromEntries(services.map(s => [s.key, consent?.providers?.[s.key] === s.fingerprint]));
    permissions[service.key] = allowed;
    const external = services.some(s => s.category === 'external_content' && permissions[s.key]);
    commit(allowed ? 'map_allow' : 'map_deny', consent?.analytics || false, consent?.marketing || false, external, permissions, service.key);
  }

  function setupMaps() {
    for (const node of document.querySelectorAll('[data-cc-map-provider]')) {
      const service = services.find(s => s.key === node.dataset.ccMapProvider && s.category === 'external_content');
      const title = node.dataset.ccMapTitle || t('map_title');
      // Markup MUST be inert div data-cc-map-src, never an iframe src or remote image.
      node.replaceChildren();
      if (!service) { node.textContent = t('map_disabled', { title }); continue; }
      let url;
      try { url = registry.safeMapUrl(service, node.dataset.ccMapSrc || '', mode); }
      catch (_) { node.textContent = t('map_rejected', { title }); continue; }
      const placeholder = document.createElement('section'); placeholder.className = 'cc-map-placeholder';
      const heading = document.createElement('h3'); heading.textContent = title; heading.hidden = service.config.show_title === false;
      const description = document.createElement('p');
      const provider = t('service.' + service.key + '.name', {}, service.name);
      description.textContent = t('service.' + service.key + '.map_notice', { provider }, t('map_notice', { provider }));
      const load = document.createElement('button'); load.type = 'button'; load.textContent = t('map_load', { provider });
      load.dataset.ccMapLoad = service.key; load.addEventListener('click', () => { returnFocus = load; mapChoice(service, true); });
      placeholder.append(heading, description, load);
      const revoke = document.createElement('button'); revoke.type = 'button'; revoke.hidden = true;
      revoke.textContent = t('map_revoke', { provider }); revoke.dataset.ccMapRevoke = service.key;
      revoke.addEventListener('click', () => mapChoice(service, false));
      node.append(placeholder, revoke); maps.push({ node, placeholder, revoke, service, title, url, frame: null });
    }
  }

  function setupButtonVisibility() {
    const options = {
      configure: root.dataset.ccShowConfigure !== '0',
      reject: root.dataset.ccShowReject !== '0',
      'accept-all': root.dataset.ccShowAcceptAll !== '0',
      accept: root.dataset.ccShowAccept === '1'
    };
    if (options.accept) { options.configure = false; options['accept-all'] = false; }
    if (!Object.values(options).some(Boolean)) {
      console.warn(t('error_buttons'));
      options.configure = true;
    }
    for (const [action, enabled] of Object.entries(options)) {
      const button = root.querySelector('[data-cc-action="' + action + '"]');
      if (button) button.hidden = !enabled;
    }
  }

  function onClick(event) {
    const action = event.target.closest('[data-cc-action]');
    if (!action || !root.contains(action)) return;

    switch (action.dataset.ccAction) {
      case 'configure':
        openSettings();
        return;
      case 'back':
        settings.hidden = true;
        main.hidden = false;
        return;
      case 'reject':
        commit('reject', false, false);
        return;
      case 'accept-all':
        commit('accept_all', true, true, true, Object.fromEntries(services.map(s => [s.key, true])));
        return;
      case 'accept':
        commit('accept', true, true, true, Object.fromEntries(services.map(s => [s.key, true])));
        return;
      case 'save':
        commit('save_settings', analyticsInput.checked, marketingInput.checked, externalInput.checked, draftPermissions);
        return;
      default:
        return;
    }
  }

  function initialize() {
    if (!document.querySelector('[data-cookie-settings-open]')) { const reopen = document.createElement('button'); reopen.type = 'button'; reopen.dataset.cookieSettingsOpen = ''; reopen.className = 'cc-settings-launcher'; document.body.append(reopen); }
    root.setAttribute('aria-label', t('region_label'));
    root.querySelector('.cookie-warning-text').innerHTML = t('notice_html');
    settingsHeading.textContent = t('settings_title');
    settings.querySelector('p').textContent = t('settings_intro');
    const necessary = root.querySelector('input:disabled');
    necessary.setAttribute('aria-label', t('necessary_aria'));
    necessary.closest('label').querySelector('strong').textContent = t('necessary_name');
    necessary.closest('label').querySelector('small').textContent = t('necessary_description');
    for (const [key,input] of Object.entries(inputs)) {
      input.closest('label').querySelector('strong').textContent = t(key + '_name');
      input.closest('label').querySelector('small').textContent = t(key + '_description');
    }
    for (const button of root.querySelectorAll('[data-cc-action]')) button.textContent = t(button.dataset.ccAction === 'save' ? 'save' : button.dataset.ccAction.replace('-', '_'));
    for (const button of document.querySelectorAll('[data-cookie-settings-open]')) button.textContent = t('reopen');
    for (const element of root.querySelectorAll('[data-cc-text]')) element.textContent = t(element.dataset.ccText, {}, element.textContent);
    setupButtonVisibility();
    root.addEventListener('click', onClick);
    for (const [category, input] of Object.entries(inputs)) input.addEventListener('change', () => {
      input.indeterminate=false;for (const s of services) if (s.category === category) draftPermissions[s.key] = input.checked;
      emitAudit(category + (input.checked ? '_allow' : '_deny'));
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !settings.hidden) {
        settings.hidden = true; main.hidden = false; returnFocus?.focus({ preventScroll: true });
      }
    });

    // The settings link may be in any footer across the site.
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-cookie-settings-open]')) return;
      event.preventDefault();
      openSettings();
    });

    consent = readConsent();
    let identity;
    try { identity = getStorage()?.getItem(STORAGE_KEY + '_id'); } catch (_) { /* unavailable */ }
    consentId = consent && isUuid(consent.consentId) ? consent.consentId : isUuid(identity) ? identity : newUuid();
    try { if (consentId) getStorage()?.setItem(STORAGE_KEY + '_id', consentId); } catch (_) { /* unavailable */ }
    setupMaps();
    if (consent) applyConsent(consent);
    if (!consent || needsChoice) showBanner();
  }

  window.web86CookieConsent = Object.freeze({
    getConsent: () => consent ? { ...consent, providers: { ...consent.providers } } : null,
    openSettings,
    // Expose reset only for the mock testing stand, not for production.
    ...(mode === 'mock' ? { resetForTesting: () => {
      const storage = getStorage();
      if (storage) storage.removeItem(STORAGE_KEY);
      location.reload();
    } } : {})
  });

  const ready = () => (i18n?.ready || Promise.resolve()).then(initialize);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
