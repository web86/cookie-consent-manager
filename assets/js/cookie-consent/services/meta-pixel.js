/** Meta queue, explicit PageView and pending work revocation. */
const web86CreateMetaPixelAdapter = runtime => {
  const { script, allowed } = runtime;
  const metaIds = new Set();
  let metaGranted = false;
  function metaQueue() {
    if (!window.fbq) {
      const queue = function (...args) { if (queue.callMethod) queue.callMethod.apply(queue, args); else queue.queue.push(args); };
      queue.push = queue; queue.loaded = true; queue.version = '2.0'; queue.queue = [];
      window.fbq = queue; if (!window._fbq) window._fbq = queue;
    }
    if (typeof window.fbq !== 'function') throw Error('Invalid fbq');
    // Only our explicit PageView; no automatic form/history events or matching data.
    window.fbq.disablePushState = true;
    return window.fbq;
  }
  return {
    async start(s) {
      const fbq = metaQueue(); metaIds.add(s.config.id);
      if (!metaGranted) { fbq('consent', 'grant'); metaGranted = true; }
      fbq('set', 'autoConfig', false, s.config.id);
      fbq('init', s.config.id);
      await script('https://connect.facebook.net/en_US/fbevents.js');
      if (!runtime.stopping && allowed(s, runtime.currentValue)) fbq('trackSingle', s.config.id, 'PageView');
    },
    revoke() {
      if (metaIds.size && typeof window.fbq === 'function') {
        if (!window.fbq.callMethod && Array.isArray(window.fbq.queue)) window.fbq.queue = window.fbq.queue.filter(call => !(metaIds.has(call[0] === 'set' ? call[3] : call[1]) || (call[0] === 'consent' && call[1] === 'grant')));
        window.fbq('consent', 'revoke'); metaGranted = false;
      }
    }
  };
};
