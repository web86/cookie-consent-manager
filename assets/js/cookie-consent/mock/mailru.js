/* FAKE Top.Mail.Ru. No requests to mail.ru. */
window._tmr = window._tmr || [];
window._tmr.push({ id: '3265404', type: 'pageView', start: Date.now(), mock: true });
console.info('[MOCK] Top.Mail.Ru JS загружен');
window.dispatchEvent(new CustomEvent('web86:mock-script-loaded', { detail: { service: 'Top.Mail.Ru' } }));
