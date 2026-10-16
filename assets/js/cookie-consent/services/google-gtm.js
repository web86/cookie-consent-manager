/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateGoogleGtmAdapter = (runtime, google) => {
  const { script } = runtime;
  return {
    async start(s, mode, value) {
      // Launch follows this instance's category; tag-level consent checks remain mandatory.
      google.consent(value);
      const event = { 'gtm.start': Date.now(), event: 'gtm.js', ...(!runtime.legacyNoChoice ? { cookie_consent: { analytics: value?.categories?.analytics === true, marketing: value?.categories?.marketing === true, external_content: value?.categories?.external_content === true } } : {}) };
      google.event(event);
      await script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(s.config.id)}`);
    }
  };
};
