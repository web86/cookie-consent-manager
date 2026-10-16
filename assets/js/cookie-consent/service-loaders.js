/** Dispatch validated built-ins in registry order; coordinate dedup, errors and revoke. */
const web86ServiceLoaders = (() => {
  'use strict';
  const runtime = web86CreateServiceRuntime();
  const { t, services, started, allowed } = runtime;
  const google = web86CreateGoogleCommon(runtime);
  const tmr = web86CreateMailruCommon(runtime);
  // Closed built-in allowlist. Public registry JSON cannot register factories.
  const adapters = Object.freeze(Object.assign(Object.create(null), {
    yandex: web86CreateYandexAdapter(runtime),
    mailru: web86CreateMailruAdapter(runtime, tmr),
    google_ga4: web86CreateGoogleGa4Adapter(runtime, google),
    google_ads: web86CreateGoogleAdsAdapter(runtime, google),
    google_gtm: web86CreateGoogleGtmAdapter(runtime, google),
    vk_ads: web86CreateVkAdsAdapter(runtime, tmr),
    meta_pixel: web86CreateMetaPixelAdapter(runtime),
    custom_js: web86CreateCustomJsAdapter(runtime),
    mock_marketing: web86CreateMockMarketingAdapter(runtime)
  }));
  function revoke(mode, value) {
    runtime.stopping = true;
    const legacyStartup = runtime.legacyNoChoice;
    runtime.legacyNoChoice = false;
    if (mode !== 'live') return;
    google.revoke(value, legacyStartup);
    adapters.meta_pixel.revoke();
    tmr.revoke();
  }
  async function start(s, mode, value) {
    const adapter = adapters[s.loader];
    // Maps keep their existing independent embed lifecycle.
    if (runtime.stopping || !adapter) return;
    const token = s.loader === 'custom_js' ? s.key : `${s.loader}:${s.config.id || ''}`;
    if (started.has(token)) return;
    started.add(token);
    if (mode === 'mock' && adapter.mock !== false) return runtime.mock(s);
    return adapter.start(s, mode, value);
  }
  return Object.freeze({
    allowed, revoke, apply(value, mode, permission = null, legacy = false) {
      runtime.currentValue = value;
      runtime.runtimePermission = typeof permission === 'function' ? permission : null;
      runtime.legacyNoChoice = legacy === true && value === null && runtime.runtimePermission !== null;
      if (mode === 'live' && google.active()) google.consent(value);
      for (const s of services) if (allowed(s, value)) start(s, mode, value).catch(e => console.warn(t('error_provider'), e.message));
    }
  });
})();
