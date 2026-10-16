/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateCustomJsAdapter = (runtime) => {
  const { script } = runtime;
  return {
    mock: false, // Custom paths run identically in live and mock modes.
    async start(s) {
      if (runtime.allowed(s, runtime.currentValue)) await script(s.config.path);
    }
  };
};
