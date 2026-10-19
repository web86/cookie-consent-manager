/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateVkAdsAdapter = (runtime, tmr) => {
  return {
    async start(s) {
      await tmr.pageView(s.config.id, true);
    }
  };
};
