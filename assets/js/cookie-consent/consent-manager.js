/** Cookie Consent Manager / provider integration. No third-party service loads before a choice. */
(() => {
  'use strict';

  const STORAGE_KEY = 'web86_cookie_consent';
  const root = document.getElementById('cookie-block');
  // Script can be safely loaded on pages without the banner.
  if (!root) return;

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
    label.textContent = 'Внешний контент и карты';
    externalInput = document.createElement('input'); externalInput.type = 'checkbox';
    externalInput.dataset.ccCategory = 'external_content'; label.append(externalInput);
    settings.insertBefore(label, settings.querySelector('.cookie-warning-settings__buttons'));
  }
  const inputs = { analytics: analyticsInput, marketing: marketingInput, external_content: externalInput };
  const providerInputs = new Map();
  let returnFocus = null;
  for (const service of services) {
    const label = document.createElement('label'); label.className = 'cookie-option cc-provider';
    const text = document.createElement('span'); text.className = 'cookie-option__text';
    const title = document.createElement('strong'); title.textContent = service.name;
    const purpose = document.createElement('small'); purpose.textContent = service.purpose;
    text.append(title, purpose);
    const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.ccProvider = service.key;
    label.append(text, input); providerInputs.set(service.key, input);
    inputs[service.category].closest('label').after(label);
  }
  let consent = null;
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
      if (body.ok !== true || body.event_id !== details.event_id || typeof body.server_time !== 'string') throw new Error('Invalid audit acknowledgement');
      window.dispatchEvent(new CustomEvent('web86:consent-audit-delivery', {
        detail: { event_id: details.event_id, ok: true }
      }));
      return true;
    }).catch(error => {
      console.warn('[Cookie Consent] audit delivery failed:', error.message);
      window.dispatchEvent(new CustomEvent('web86:consent-audit-delivery', {
        detail: { event_id: details.event_id, ok: false }
      }));
      return false;
    });
  }


  function getStorage() {
    try { return window.localStorage; }
    catch (error) { console.warn('[Cookie Consent] localStorage unavailable', error); return null; }
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
      const providers = Object.create(null);
      for (const service of services) if (data.providers?.[service.key] === service.fingerprint && data[service.category] === true) providers[service.key] = service.fingerprint;
      return { ...data, external_content: data.external_content === true, providers };
    } catch (error) {
      console.warn('[Cookie Consent] invalid saved preference', error);
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
      console.warn('[Cookie Consent] cannot store preference', error);
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
      providers: extra.providers || Object.fromEntries(services.map(s => [s.key, providerInputs.get(s.key).checked])),
      provider: extra.provider || null,
      policy_version: version,
      timestamp: new Date().toISOString(),
      page: location.pathname // Never include query params with possible personal data.
    };
    window.dispatchEvent(new CustomEvent('web86:consent-audit', { detail: details }));
    if (mode === 'mock') console.info('[MOCK consent audit]', details);
    if (!details.event_id || !details.consent_id) {
      console.warn('[Cookie Consent] secure random ID unavailable; audit not sent');
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
    for (const s of services) providerInputs.get(s.key).checked = consent?.providers?.[s.key] === s.fingerprint;
    main.hidden = true;
    settings.hidden = false;
    root.classList.remove('closed', 'done');
    settingsHeading.focus({ preventScroll: true });
  }

  function commit(action, analytics, marketing, external = false, permissions = {}, provider = null) {
    const previous = consent;
    const value = { version, necessary: true, analytics: Boolean(analytics), marketing: Boolean(marketing),
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
      if (!persisted) console.warn('[Cookie Consent] preference not persisted');
      Promise.race([auditDelivery, new Promise(resolve => setTimeout(resolve, 900))]).finally(() => location.reload());
      return;
    }
    applyConsent(value);
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
      const title = node.dataset.ccMapTitle || 'Карта';
      // Markup MUST be inert div data-cc-map-src, never an iframe src or remote image.
      node.replaceChildren();
      if (!service) { node.textContent = title + ': сервис отключён'; continue; }
      let url;
      try { url = registry.safeMapUrl(service, node.dataset.ccMapSrc || '', mode); }
      catch (_) { node.textContent = title + ': адрес карты отклонён'; continue; }
      const placeholder = document.createElement('section'); placeholder.className = 'cc-map-placeholder';
      const heading = document.createElement('h3'); heading.textContent = title;
      const description = document.createElement('p');
      description.textContent = service.name + ': загрузка передаст провайдеру IP и данные браузера. Разрешение относится к этому сервису карт. Его можно отозвать здесь или в настройках cookie.';
      const load = document.createElement('button'); load.type = 'button'; load.textContent = 'Загрузить карту — ' + service.name;
      load.dataset.ccMapLoad = service.key; load.addEventListener('click', () => { returnFocus = load; mapChoice(service, true); });
      placeholder.append(heading, description, load);
      const revoke = document.createElement('button'); revoke.type = 'button'; revoke.hidden = true;
      revoke.textContent = 'Отозвать разрешение — ' + service.name; revoke.dataset.ccMapRevoke = service.key;
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
    if (!Object.values(options).some(Boolean)) {
      console.warn('[Cookie Consent] all actions disabled. Showing Configure as fail-safe.');
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
        commit('save_settings', analyticsInput.checked, marketingInput.checked, externalInput.checked, Object.fromEntries([...providerInputs].map(([key, input]) => [key, input.checked])));
        return;
      default:
        return;
    }
  }

  function initialize() {
    setupButtonVisibility();
    root.addEventListener('click', onClick);
    for (const [category, input] of Object.entries(inputs)) input.addEventListener('change', () => {
      for (const s of services) if (s.category === category) providerInputs.get(s.key).checked = input.checked;
      emitAudit(category + (input.checked ? '_allow' : '_deny'));
    });
    for (const s of services) providerInputs.get(s.key).addEventListener('change', () => {
      inputs[s.category].checked = services.some(p => p.category === s.category && providerInputs.get(p.key).checked);
      emitAudit(providerInputs.get(s.key).checked ? 'provider_allow' : 'provider_deny', { provider: s.key });
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
    else showBanner();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
