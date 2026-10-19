/** Shared Google queue, Consent Mode, CMP command ownership and gtag library. */
const web86CreateGoogleCommon = runtime => {
  const { services, visibility, started, script, allowed } = runtime;
  const googleCommands = new Set();
  let googleDefaults = false;
  function googleConsent(value) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // First-visit legacy installation behaves like a direct tag: leave any site's
    // own Consent Mode untouched, without inventing denied or granted signals.
    if (runtime.legacyNoChoice) return;
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
  function googleCommand(...args) {
    const length = window.dataLayer.length;
    window.gtag(...args);
    for (const entry of window.dataLayer.slice(length)) {
      if (entry[0] === args[0] && entry[1] === args[1]) googleCommands.add(entry);
    }
  }
  const active = () => googleDefaults || started.has('gtag-library') || services.some(s => s.loader === 'google_gtm' && started.has(`google_gtm:${s.config.id}`));
  return {
    consent: googleConsent, command: googleCommand, active,
    event(event) { window.dataLayer.push(event); googleCommands.add(event); },
    async configure(s, value, signals = {}) {
      googleConsent(value);
      googleCommand('js', new Date());
      googleCommand('config', s.config.id, { ...Object.fromEntries(Object.entries(s.config).filter(([key]) => key !== 'id')), ...(!runtime.legacyNoChoice ? { ...signals, allow_ad_personalization_signals: s.config.allow_ad_personalization_signals && visibility.marketing && value?.categories?.marketing === true } : {}) });
      // One shared library; separate consent/config for each selected service.
      if (!started.has('gtag-library')) { started.add('gtag-library'); await script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.config.id)}`); }
    },
    revoke(value, legacyStartup) {
      // Preserve commands owned by the site, including independent defaults.
      if (legacyStartup && Array.isArray(window.dataLayer)) for (let i = window.dataLayer.length - 1; i >= 0; i--) {
        if (googleCommands.has(window.dataLayer[i])) window.dataLayer.splice(i, 1);
      }
      googleCommands.clear();
      if (active()) googleConsent(value);
    }
  };
};
