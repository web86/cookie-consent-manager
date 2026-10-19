/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateMockMarketingAdapter = (runtime) => {
  return {
    async start() {
      // Historical fixture-only integration; intentionally no live SDK.
      return;
    }
  };
};
