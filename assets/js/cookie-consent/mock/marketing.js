/* FAKE future marketing pixel. No third-party requests. */
console.info('[MOCK] Marketing pixel JS загружен');
window.dispatchEvent(new CustomEvent('web86:mock-script-loaded', { detail: { service: 'Marketing Pixel' } }));
