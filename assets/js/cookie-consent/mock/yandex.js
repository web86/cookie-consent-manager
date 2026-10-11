/* FAKE Yandex.Metrika. No network calls except loading this local script. */
window.ym = function (id, method, arg) {
  console.info('[MOCK Yandex.Metrika]', id, method);
  if (method === 'getClientID' && typeof arg === 'function') {
    queueMicrotask(() => arg('MOCK-CLIENT-23643118'));
  }
};
console.info('[MOCK] Yandex.Metrika JS загружен');
window.dispatchEvent(new CustomEvent('web86:mock-script-loaded', { detail: { service: 'Yandex.Metrika' } }));
