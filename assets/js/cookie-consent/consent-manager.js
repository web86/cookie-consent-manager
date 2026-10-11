/** Cookie Consent Manager / browser MVP. No third-party service loads before a choice. */
(() => {
  'use strict';

  const STORAGE_KEY = 'web86_cookie_consent';
  const root = document.getElementById('cookie-block');
  // Script can be safely loaded on pages without the banner.
  if (!root) return;

  const version = root.dataset.ccPolicyVersion || '1';
  const ttlDays = Math.max(1, Number(root.dataset.ccTtlDays) || 90);
  const mode = root.dataset.ccMode === 'mock' ? 'mock' : 'live';
  const auditUrl = root.dataset.ccAuditUrl || '';
  // Avoid sending event data to a third-party endpoint, even if HTML is misconfigured.
  const auditEnabled = /^\/(?!\/)/.test(auditUrl);
  const main = root.querySelector('[data-cc-panel="main"]');
  const settings = root.querySelector('[data-cc-panel="settings"]');
  const analyticsInput = root.querySelector('[data-cc-category="analytics"]');
  const marketingInput = root.querySelector('[data-cc-category="marketing"]');
  const settingsHeading = root.querySelector('#cookie-settings-title');
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
    }).then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
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
      return data;
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
      event_id: newUuid(),
      consent_id: consentId,
      event,
      stage: extra.stage || 'draft',
      analytics: typeof extra.analytics === 'boolean' ? extra.analytics : analyticsInput.checked,
      marketing: typeof extra.marketing === 'boolean' ? extra.marketing : marketingInput.checked,
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
    if (value.analytics && window.web86Analytics) window.web86Analytics.start({ mode });
    if (value.marketing && window.web86Marketing) window.web86Marketing.start({ mode });
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
    analyticsInput.checked = consent ? consent.analytics : false;
    marketingInput.checked = consent ? consent.marketing : false;
    main.hidden = true;
    settings.hidden = false;
    root.classList.remove('closed', 'done');
    settingsHeading.focus({ preventScroll: true });
  }

  function commit(action, analytics, marketing) {
    const previous = consent;
    const value = {
      version,
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      savedAt: Date.now(),
      consentId
    };
    const persisted = saveConsent(value);
    consent = value;
    const auditDelivery = emitAudit(action, { stage: 'committed', analytics: value.analytics, marketing: value.marketing });
    hideBanner();

    const revoked = previous &&
      ((previous.analytics && !value.analytics) || (previous.marketing && !value.marketing));

    // When previously loaded scripts lose consent, terminate current document.
    // Re-loading prevents their re-initialization, but it cannot undo past requests.
    if (revoked) {
      if (!persisted) {
        console.warn('[Cookie Consent] preference not persisted; reload may re-show the banner');
      }
      // Allow server acknowledgement before page reload; never block revocation indefinitely.
      Promise.race([auditDelivery, new Promise(resolve => setTimeout(resolve, 900))])
        .finally(() => location.reload());
      return;
    }
    applyConsent(value);
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
        commit('accept_all', true, true);
        return;
      case 'accept':
        commit('accept', true, true);
        return;
      case 'save':
        commit('save_settings', analyticsInput.checked, marketingInput.checked);
        return;
      default:
        return;
    }
  }

  function initialize() {
    setupButtonVisibility();
    root.addEventListener('click', onClick);
    analyticsInput.addEventListener('change', () => emitAudit(
      analyticsInput.checked ? 'analytics_allow' : 'analytics_deny'));
    marketingInput.addEventListener('change', () => emitAudit(
      marketingInput.checked ? 'marketing_allow' : 'marketing_deny'));

    // The settings link may be in any footer across the site.
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-cookie-settings-open]')) return;
      event.preventDefault();
      openSettings();
    });

    consent = readConsent();
    consentId = consent && isUuid(consent.consentId) ? consent.consentId : newUuid();
    if (consent) applyConsent(consent);
    else showBanner();
  }

  window.web86CookieConsent = Object.freeze({
    getConsent: () => consent ? { ...consent } : null,
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
