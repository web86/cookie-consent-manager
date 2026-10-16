/** Internal built-in adapter; receives the shared runtime, never reads consent storage. */
const web86CreateGoogleGa4Adapter = (runtime, google) => {
  const { visibility } = runtime;
  return {
    async start(s, mode, value) {
      await google.configure(s, value, { allow_google_signals: s.config.allow_google_signals && visibility.marketing && value?.categories?.marketing === true });
    }
  };
};
