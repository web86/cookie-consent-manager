/** Marketing adapter. Production currently has no pixels. */
(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  let started = false;

  window.web86Marketing = Object.freeze({
    start({ mode = 'live' } = {}) {
      if (started) return;
      started = true;
      if (mode !== 'mock') return; // TODO: add approved pixels here in future.
      const script = document.createElement('script');
      script.src = new URL('mock/marketing.js', base).href;
      script.id = 'web86-mock-marketing';
      script.async = true;
      document.head.appendChild(script);
    }
  });
})();
