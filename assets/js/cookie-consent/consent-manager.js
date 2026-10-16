/** Cookie Consent Manager: persisted choice and optional legacy runtime permission. */
(() => {
  'use strict';

  const STORAGE_KEY = 'web86_cookie_consent';
  const root = document.getElementById('cookie-block');
  // Script can be safely loaded on pages without the banner.
  if (!root) return;

  const t = (...args) => window.web86Runtime?.message(...args) || args[0];
  const version = root.dataset.ccPolicyVersion || '1';
  const configuredTtl = Number(root.dataset.ccTtlDays);
  const ttlDays = Number.isFinite(configuredTtl) ? Math.min(3650, Math.max(1, configuredTtl || 90)) : 90;
  const mode = root.dataset.ccMode === 'mock' ? 'mock' : 'live';
  const legacyMode = root.dataset.ccShowAccept === '1';
  let auditUrl = '';
  try {
    const raw = root.dataset.ccAuditUrl || '';
    const url = new URL(raw, location.href);
    if (raw && url.origin === location.origin && !url.username && !url.password && !url.hash) auditUrl = url.href;
  } catch (_) { /* Invalid endpoint fails closed. */ }
  const auditEnabled = Boolean(auditUrl);
  const registry = window.web86Providers;
  const services = registry?.services || [];
  const categoryVisibility = Object.fromEntries(['analytics','marketing','external_content'].map(c => [c, root.getAttribute('data-cc-category-' + c.replaceAll('_','-')) === '1']));
  const categoryVersions = Object.fromEntries(Object.keys(categoryVisibility).map(c => [c, Number(root.getAttribute('data-cc-category-version-' + c.replaceAll('_','-')))]));
  const main = root.querySelector('[data-cc-panel="main"]');
  const settings = root.querySelector('[data-cc-panel="settings"]');
  const analyticsInput = root.querySelector('[data-cc-category="analytics"]');
  const marketingInput = root.querySelector('[data-cc-category="marketing"]');
  const settingsHeading = root.querySelector('#cookie-settings-title');
  const externalInput = root.querySelector('[data-cc-category="external_content"]');
  if (!analyticsInput || !marketingInput || !externalInput || !settings) return;
  const inputs = { analytics: analyticsInput, marketing: marketingInput, external_content: externalInput };
  let returnFocus = null;
  // Remove legacy provider controls. Public preferences expose categories only.
  for (const input of settings.querySelectorAll('[data-cc-provider]')) (input.closest('label') || input).remove();
  let consent = null;
  let needsChoice = false;
  let hideTimer = null;
  let consentId = null;
  let auditQueue = Promise.resolve();
  let callbacksReady = false;
  let reloading = false;
  let legacyAutoLoad = false;
  const allowedCallbacks = new Set();
  const embeds = web86Embeds.create({
    root, registry, services, mode, categoryVisibility, runtimeAllowed,
    openSettings(load, category) {
      returnFocus = load; openSettings(); inputs[category].focus();
    }
  });

  // One gate for SDKs, maps and callbacks; never serialize runtime permission as consent.
  function runtimeAllowed(category) {
    return !reloading && categoryVisibility[category] === true &&
      (legacyAutoLoad || consent?.categories?.[category] === true);
  }

  function onAllowed(category, callback, options = {}) {
    if (!Object.hasOwn(inputs, category) || typeof callback !== 'function' || !options ||
        typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(k => k !== 'service') ||
        (Object.hasOwn(options, 'service') && (typeof options.service !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(options.service)))) {
      throw new TypeError('Invalid onAllowed category, callback or options');
    }
    const service = Object.hasOwn(options, 'service') ? services.find(s => s.key === options.service && s.enabled && s.category === category) : null;
    const needsService = Object.hasOwn(options, 'service');
    let cancelled = false, called = false;
    // Read the CMP's effective permission, including revocation before reload.
    const stillAllowed = () => !cancelled && callbacksReady && runtimeAllowed(category) &&
      (!needsService || Boolean(service && registry?.allowed(service, consent)));
    const run = () => {
      if (called || !stillAllowed()) return;
      called = true;
      allowedCallbacks.delete(run);
      try { Promise.resolve(callback(stillAllowed)).catch(() => console.warn('CookieConsent onAllowed callback failed')); }
      catch (_) { console.warn('CookieConsent onAllowed callback failed'); }
    };
    allowedCallbacks.add(run);
    run();
    return () => { cancelled = true; allowedCallbacks.delete(run); };
  }

  function runAllowedCallbacks() {
    callbacksReady = true;
    for (const run of [...allowedCallbacks]) run();
  }

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
      const storage = getStorage(), raw = storage?.getItem(STORAGE_KEY), data = JSON.parse(raw || 'null');
      // Only positively known first visits qualify. Expired, malformed, historical or
      // policy-invalid records must request a new choice, never become auto-load grants.
      legacyAutoLoad = Boolean(legacyMode && storage && raw === null && storage.getItem(STORAGE_KEY + '_legacy_v2') === null);
      if (!data || data.version !== version || data.necessary !== true ||
          typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) ||
          data.savedAt > Date.now() || Date.now() - data.savedAt > ttlDays * 86400000) return null;
      const current = data.model === 'categories_v2';
      if (current && (!data.categories || Object.keys(inputs).some(c => typeof data.categories[c] !== 'boolean'))) return null;
      if (!current && (typeof data.analytics !== 'boolean' || typeof data.marketing !== 'boolean')) return null;
      const categories = {}, versions = { ...(data.category_versions || {}) };
      for (const category of Object.keys(inputs)) {
        const sameVersion = (data.category_versions?.[category] ?? 0) === categoryVersions[category];
        let granted = current ? data.categories[category] === true : data[category] === true;
        // One-time conservative conversion of legacy individual permissions into a whole category.
        // Never use provider permissions for execution after this migration.
        const completeLegacy = current || services.filter(s => s.category === category).every(s => data.providers?.[s.key] === s.fingerprint);
        if (!current && granted && !completeLegacy) { granted = false; versions[category] = -1; }
        categories[category] = categoryVisibility[category] && sameVersion && granted;
        if (categoryVisibility[category] && (!sameVersion || versions[category] === -1)) needsChoice = true;
      }
      const value = { model: 'categories_v2', version, necessary: true, categories, category_versions: versions, savedAt: data.savedAt, consentId: data.consentId };
      if (!current && storage) {
        // Preserve the exact original locally for reversible migration, never consult it for launches.
        if (!storage.getItem(STORAGE_KEY + '_legacy_v2')) storage.setItem(STORAGE_KEY + '_legacy_v2', raw);
        saveConsent(value);
      }
      return value;
    } catch (error) { legacyAutoLoad = false; console.warn(t('error_preference'), error); return null; }
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
      schema: 3,
      event_id: newUuid(),
      consent_id: consentId,
      event,
      stage: extra.stage || 'draft',
      analytics: typeof extra.analytics === 'boolean' ? extra.analytics : analyticsInput.checked,
      marketing: typeof extra.marketing === 'boolean' ? extra.marketing : marketingInput.checked,
      external_content: typeof extra.external_content === 'boolean' ? extra.external_content : externalInput.checked,
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
    registry?.apply(value, mode, runtimeAllowed, legacyAutoLoad);
    embeds.apply(value);
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
    for (const [category, input] of Object.entries(inputs)) input.checked = consent?.categories?.[category] === true;
    main.hidden = true;
    settings.hidden = false;
    root.classList.remove('closed', 'done');
    settingsHeading.focus({ preventScroll: true });
  }

  function commit(action, analytics, marketing, external = false) {
    callbacksReady = false;
    const previousPermissions = Object.fromEntries(Object.keys(inputs).map(c => [c, runtimeAllowed(c)]));
    const legacyRejection = legacyAutoLoad && action === 'reject';
    legacyAutoLoad = false;
    const categories = { analytics: categoryVisibility.analytics && Boolean(analytics), marketing: categoryVisibility.marketing && Boolean(marketing), external_content: categoryVisibility.external_content && Boolean(external) };
    const value = { model: 'categories_v2', version, necessary: true, categories, category_versions: { ...categoryVersions }, savedAt: Date.now(), consentId };
    const persisted = saveConsent(value); consent = value;
    const auditDelivery = emitAudit(action, { stage: 'committed', ...categories });
    hideBanner();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    const revoked = legacyRejection || Object.keys(inputs).some(k => previousPermissions[k] && !categories[k]);
    if (revoked) {
      reloading = true; registry?.revoke(mode, value);
      embeds.revoke(categories);
      if (!persisted) console.warn(t('error_storage'));
      Promise.race([auditDelivery, new Promise(resolve => setTimeout(resolve, 900))]).finally(() => location.reload());
      return;
    }
    applyConsent(value); needsChoice = false; runAllowedCallbacks();
    embeds.afterCommit(categories);
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
      case 'accept':
        // Identical category grant, differing only in the historical audit action name.
        commit(action.dataset.ccAction.replace('-', '_'), ...Object.keys(inputs).map(category => categoryVisibility[category]));
        return;
      case 'save':
        commit('save_settings', analyticsInput.checked, marketingInput.checked, externalInput.checked);
        return;
      default:
        return;
    }
  }

  function initialize() {
    // PHP owns all static banner text/HTML/ARIA. Never translate or overwrite it here.
    // Keep hidden inputs for schema compatibility; visibility never changes saved grants.
    for (const [category, input] of Object.entries(inputs)) {
      const row = input.closest('label');
      row.dataset.ccCategoryRow = category;
      row.hidden = !categoryVisibility[category];
    }
    setupButtonVisibility();
    root.addEventListener('click', onClick);
    for (const [category, input] of Object.entries(inputs)) input.addEventListener('change', () => {
      input.indeterminate=false;
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
    embeds.setup();
    applyConsent(consent);
    if (!consent || needsChoice) showBanner();
    runAllowedCallbacks();
  }

  window.web86CookieConsent = Object.freeze({
    getConsent: () => consent ? { ...consent, categories: { ...consent.categories }, category_versions: { ...consent.category_versions } } : null,
    openSettings,
    onAllowed,
    // Expose reset only for the mock testing stand, not for production.
    ...(mode === 'mock' ? { resetForTesting: () => {
      const storage = getStorage();
      if (storage) storage.removeItem(STORAGE_KEY);
      location.reload();
    } } : {})
  });

  const ready = initialize;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
