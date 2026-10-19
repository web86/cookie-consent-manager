/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateGoogleAdsAdapter = (runtime, google) => {
  return {
    async start(s, mode, value) {
      await google.configure(s, value);
    }
  };
};
